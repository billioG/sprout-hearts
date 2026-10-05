const SUPABASE_URL = 'https://qszgwzvpoammiloneufk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzemd3enZwb2FtbWlsb25ldWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNjM0MDksImV4cCI6MjEwNjczOTQwOX0.LAqLBWxhMTU9bKNpfffsP9g-WKO34pUfx0fzodI792g';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** ID estable por navegador */
export function getStablePlayerId() {
  let id = localStorage.getItem('sh-player-id');
  if (!id) {
    id = 'p' + Math.random().toString(36).substr(2, 10);
    localStorage.setItem('sh-player-id', id);
  }
  return id;
}

export function rememberPin(pin) {
  if (!pin) return;
  localStorage.setItem('sh-last-pin', pin);
  let list = [];
  try { list = JSON.parse(localStorage.getItem('sh-pin-list') || '[]'); } catch (_) {}
  list = [pin, ...list.filter(p => p !== pin)].slice(0, 8);
  localStorage.setItem('sh-pin-list', JSON.stringify(list));
}

export function getLastPin() {
  return localStorage.getItem('sh-last-pin') || '';
}

export function getRecentPins() {
  try { return JSON.parse(localStorage.getItem('sh-pin-list') || '[]'); } catch (_) { return []; }
}

export async function createRoom(playerId, playerName, avatar, preferredPin) {
  const pin = preferredPin || generatePin();
  try {
    const { data: existing } = await supabase.from('rooms').select('*').eq('pin', pin).maybeSingle();
    if (existing) {
      // Reanudar: si ya éramos p1 o p2, mantener rol; si no, entrar como p1 solo si vacío
      let patch = {};
      let role = 'host';
      if (existing.player1_id === playerId || !existing.player2_id) {
        patch = {
          player1_id: playerId,
          player1_name: playerName,
          player1_avatar: avatar || 'male-blue',
          player1_x: 25, player1_y: 12
        };
        role = 'host';
      } else if (existing.player2_id === playerId || existing.player1_id) {
        patch = {
          player2_id: playerId,
          player2_name: playerName,
          player2_avatar: avatar || 'female-pink',
          player2_x: 26, player2_y: 12
        };
        role = 'guest';
      }
      const { data, error } = await supabase.from('rooms').update(patch).eq('id', existing.id).select().single();
      if (error) throw error;
      rememberPin(pin);
      return { ...data, _role: role };
    }
    const payload = {
      pin,
      player1_id: playerId,
      player1_name: playerName,
      player1_avatar: avatar || 'male-blue',
      player1_x: 25, player1_y: 12,
      answers: {},
      current_level: 1
    };
    const { data, error } = await supabase.from('rooms').insert(payload).select().single();
    if (error) throw error;
    rememberPin(pin);
    return { ...data, _role: 'host' };
  } catch (e) {
    console.warn('Supabase offline', e);
    rememberPin(pin);
    return {
      id: 'offline-' + Date.now(), pin,
      player1_id: playerId, player1_name: playerName, player1_avatar: avatar,
      player1_x: 25, player1_y: 12,
      answers: JSON.parse(localStorage.getItem('sh-answers-' + pin) || '{}'),
      offline: true, _role: 'host'
    };
  }
}

export async function joinRoom(pin, playerId, playerName, avatar) {
  try {
    const { data: room, error } = await supabase.from('rooms').select('*').eq('pin', pin).single();
    if (error || !room) throw error || new Error('PIN no encontrado');

    let patch, role;
    if (room.player1_id === playerId) {
      patch = { player1_name: playerName, player1_avatar: avatar, player1_x: 25, player1_y: 12 };
      role = 'host';
    } else if (room.player2_id === playerId || !room.player2_id) {
      patch = {
        player2_id: playerId,
        player2_name: playerName,
        player2_avatar: avatar || 'female-pink',
        player2_x: 26, player2_y: 12
      };
      role = 'guest';
    } else {
      // Slot p2 ocupado por otro: aún así unirse como p2 (reclaim)
      patch = {
        player2_id: playerId,
        player2_name: playerName,
        player2_avatar: avatar || 'female-pink',
        player2_x: 26, player2_y: 12
      };
      role = 'guest';
    }
    const { data, error: ue } = await supabase.from('rooms').update(patch).eq('id', room.id).select().single();
    if (ue) throw ue;
    rememberPin(pin);
    return { ...data, _role: role };
  } catch (e) {
    console.warn('Join failed', e);
    rememberPin(pin);
    return {
      id: 'offline-join-' + Date.now(), pin,
      player2_id: playerId, player2_name: playerName, player2_avatar: avatar,
      answers: JSON.parse(localStorage.getItem('sh-answers-' + pin) || '{}'),
      offline: true, _role: 'guest'
    };
  }
}

export async function saveAnswer(roomId, levelId, playerId, answer, pin) {
  try {
    if (String(roomId).startsWith('offline')) {
      const key = 'sh-answers-' + (pin || 'local');
      const answers = JSON.parse(localStorage.getItem(key) || '{}');
      if (!answers[levelId]) answers[levelId] = {};
      answers[levelId][playerId] = { text: answer, timestamp: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(answers));
      return answers;
    }
    const { data: room } = await supabase.from('rooms').select('answers').eq('id', roomId).single();
    const answers = { ...(room?.answers || {}) };
    if (!answers[levelId]) answers[levelId] = {};
    answers[levelId][playerId] = { text: answer, timestamp: new Date().toISOString() };
    const { error } = await supabase.from('rooms').update({ answers }).eq('id', roomId);
    if (error) throw error;
    return answers;
  } catch (e) {
    console.warn('saveAnswer', e);
    return null;
  }
}

export async function updatePosition(roomId, isHost, x, y) {
  if (!roomId || String(roomId).startsWith('offline')) return;
  const patch = isHost
    ? { player1_x: Math.round(x * 10) / 10, player1_y: Math.round(y * 10) / 10 }
    : { player2_x: Math.round(x * 10) / 10, player2_y: Math.round(y * 10) / 10 };
  try {
    await supabase.from('rooms').update(patch).eq('id', roomId);
  } catch (_) {}
}

export function subscribeToRoom(roomId, callback) {
  if (!roomId || String(roomId).startsWith('offline')) return { unsubscribe: () => {} };
  const channel = supabase
    .channel('room-' + roomId + '-' + Date.now())
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'rooms',
      filter: 'id=eq.' + roomId
    }, (payload) => {
      if (payload.new) callback(payload.new);
    })
    .subscribe((status) => console.log('Realtime status:', status));
  return channel;
}
