const SUPABASE_URL = 'https://qszgwzvpoammiloneufk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzemd3enZwb2FtbWlsb25ldWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNjM0MDksImV4cCI6MjEwNjczOTQwOX0.LAqLBWxhMTU9bKNpfffsP9g-WKO34pUfx0fzodI792g';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Crea o recupera sala por PIN (progreso persistente) */
export async function createRoom(playerId, playerName, avatar, preferredPin) {
  const pin = preferredPin || generatePin();
  try {
    // Si el PIN ya existe, reanudar esa sala como player1
    const { data: existing } = await supabase.from('rooms').select('*').eq('pin', pin).maybeSingle();
    if (existing) {
      const { data: updated, error } = await supabase.from('rooms').update({
        player1_id: playerId,
        player1_name: playerName,
        player1_avatar: avatar || 'male-blue',
        player1_x: 25,
        player1_y: 12
      }).eq('id', existing.id).select().single();
      if (error) throw error;
      return updated;
    }
    const payload = {
      pin,
      player1_id: playerId,
      player1_name: playerName,
      player1_avatar: avatar || 'male-blue',
      player1_x: 25,
      player1_y: 12,
      answers: {},
      current_level: 1
    };
    const { data, error } = await supabase.from('rooms').insert(payload).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('Supabase offline, using local room', e);
    return {
      id: 'offline-' + Date.now(),
      pin,
      player1_id: playerId,
      player1_name: playerName,
      player1_avatar: avatar || 'male-blue',
      player1_x: 25, player1_y: 12,
      answers: JSON.parse(localStorage.getItem('sh-answers-' + pin) || '{}'),
      current_level: 1,
      offline: true
    };
  }
}

/** Unirse o reanudar como player2 (o player1 si eres el host que vuelve) */
export async function joinRoom(pin, playerId, playerName, avatar) {
  try {
    const { data: room, error } = await supabase.from('rooms').select('*').eq('pin', pin).single();
    if (error || !room) throw error || new Error('Sala no encontrada');

    // Si ya eras player1, reanudar como host
    if (room.player1_id === playerId) {
      const { data } = await supabase.from('rooms').update({
        player1_name: playerName,
        player1_avatar: avatar || room.player1_avatar,
        player1_x: 25, player1_y: 12
      }).eq('id', room.id).select().single();
      return data || room;
    }
    // Si ya eras player2, reanudar
    if (room.player2_id === playerId) {
      const { data } = await supabase.from('rooms').update({
        player2_name: playerName,
        player2_avatar: avatar || room.player2_avatar,
        player2_x: 26, player2_y: 12
      }).eq('id', room.id).select().single();
      return data || room;
    }

    // Nuevo player2 (o reemplazar si el slot está libre / rejoin)
    const { data: updated, error: ue } = await supabase.from('rooms').update({
      player2_id: playerId,
      player2_name: playerName,
      player2_avatar: avatar || 'female-pink',
      player2_x: 26,
      player2_y: 12
    }).eq('id', room.id).select().single();
    if (ue) throw ue;
    return updated;
  } catch (e) {
    console.warn('Join offline fallback', e);
    const answers = JSON.parse(localStorage.getItem('sh-answers-' + pin) || '{}');
    return {
      id: 'offline-join-' + Date.now(),
      pin,
      player2_id: playerId,
      player2_name: playerName,
      player2_avatar: avatar || 'female-pink',
      answers,
      current_level: 1,
      offline: true
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
    const answers = room?.answers || {};
    if (!answers[levelId]) answers[levelId] = {};
    answers[levelId][playerId] = { text: answer, timestamp: new Date().toISOString() };
    await supabase.from('rooms').update({ answers }).eq('id', roomId);
    return answers;
  } catch (e) {
    console.warn('saveAnswer offline', e);
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
  return supabase
    .channel('room-' + roomId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'id=eq.' + roomId },
      (payload) => callback(payload.new))
    .subscribe();
}
