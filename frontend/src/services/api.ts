/**
 * API Service — Backend ile REST iletişimi
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function createRoom(playerName: string) {
  const res = await fetch(`${API_BASE}/rooms/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_name: playerName }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Oda oluşturulamadı');
  }

  return res.json();
}

export async function joinRoom(roomCode: string, playerName: string) {
  const res = await fetch(`${API_BASE}/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_code: roomCode, player_name: playerName }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Odaya katılınamadı');
  }

  return res.json();
}

export async function getRoomInfo(roomCode: string) {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}`);

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Oda bilgisi alınamadı');
  }

  return res.json();
}
