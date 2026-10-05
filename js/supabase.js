const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createRoom(playerId, playerName, avatar) {
  const pin = generatePin();
  const payload = {
    pin,
    player1_id: playerId,
    player1_name: playerName,
    player1_avatar: avatar || 'lpc',
    player1_x: 15,
    player1_y: 11,
    answers: {},
    current_level: 1
  };
  try {
    const { data, error } = await supabase.from('rooms').insert(payload).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('Supabase offline, using local room', e);
    return { id: 'offline-' + Date.now(), ...payload, offline: true };
  }
}

export async function joinRoom(pin, playerId, playerName, avatar) {
  try {
    const { data: room, error } = await supabase.from('rooms').select('*').eq('pin', pin).single();
    if (error || !room) throw error || new Error('not found');
    const { data: updated, error: ue } = await supabase.from('rooms').update({
      player2_id: playerId,
      player2_name: playerName,
      player2_avatar: avatar || 'partner',
      player2_x: 16,
      player2_y: 11
    }).eq('id', room.id).select().single();
    if (ue) throw ue;
    return updated;
  } catch (e) {
    console.warn('Join offline fallback', e);
    return {
      id: 'offline-join-' + Date.now(),
      pin,
      player2_id: playerId,
      player2_name: playerName,
      player2_avatar: avatar || 'partner',
      answers: {},
      current_level: 1,
      offline: true
    };
  }
}

export async function saveAnswer(roomId, levelId, playerId, answer) {
  try {
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
    ? { player1_x: Math.round(x), player1_y: Math.round(y) }
    : { player2_x: Math.round(x), player2_y: Math.round(y) };
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
