import { useState, useEffect, useCallback, useRef } from 'react';
import type { RoomInfo, WSMessage } from '../types/game';
import { createRoom, joinRoom } from '../services/api';
import { GameWebSocket } from '../services/websocket';
import Particles from './Particles';
import StockTicker from './StockTicker';

interface LobbyProps {
  onGameStart: (
    roomCode: string,
    playerId: string,
    ws: GameWebSocket,
  ) => void;
}

type Tab = 'create' | 'join';

export default function Lobby({ onGameStart }: LobbyProps) {
  const [tab, setTab] = useState<Tab>('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Lobi durumu (oda oluşturduktan/katıldıktan sonra)
  const [inLobby, setInLobby] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [chatMessages, setChatMessages] = useState<{ name: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const wsRef = useRef<GameWebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<RoomInfo | null>(null);
  const playerIdRef = useRef<string>('');

  // Sohbet scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // WS mesaj dinleyici
  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case 'player_joined':
          setRoom(msg.room);
          setChatMessages((prev) => [
            ...prev,
            { name: '📢 Sistem', msg: `${msg.player_name} odaya katıldı!` },
          ]);
          break;
        case 'player_left':
          setRoom(msg.room);
          setChatMessages((prev) => [
            ...prev,
            { name: '📢 Sistem', msg: `${msg.player_name} odadan ayrıldı.` },
          ]);
          break;
        case 'chat':
          setChatMessages((prev) => [
            ...prev,
            { name: msg.player_name, msg: msg.message },
          ]);
          break;
        case 'game_started':
          // Oyun başladı → ana ekrana geçiş
          if (wsRef.current) {
            onGameStart(
              msg.room.room_code || roomRef.current?.room_code || '',
              playerIdRef.current,
              wsRef.current,
            );
          }
          break;
        case 'error':
          setError(msg.message);
          setTimeout(() => setError(''), 4000);
          break;
      }
    },
    [onGameStart],
  );

  // WebSocket bağlantısı kur
  const connectWebSocket = useCallback(
    async (playerId: string) => {
      const ws = new GameWebSocket(playerId);
      wsRef.current = ws;
      ws.onMessage(handleWSMessage);
      await ws.connect();
    },
    [handleWSMessage],
  );

  // Oda oluştur
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Lütfen bir oyuncu adı gir!');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const data = await createRoom(playerName.trim());
      setMyPlayerId(data.player_id);
      playerIdRef.current = data.player_id;
      setRoom(data.room);
      roomRef.current = data.room;
      setInLobby(true);
      await connectWebSocket(data.player_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Odaya katıl
  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Lütfen bir oyuncu adı gir!');
      return;
    }
    if (!roomCode.trim()) {
      setError('Lütfen oda kodunu gir!');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const data = await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      setMyPlayerId(data.player_id);
      playerIdRef.current = data.player_id;
      setRoom(data.room);
      roomRef.current = data.room;
      setInLobby(true);
      await connectWebSocket(data.player_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sohbet gönder
  const handleSendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.sendChat(chatInput.trim());
    setChatInput('');
  };

  // Oyunu başlat
  const handleStartGame = () => {
    if (!wsRef.current) return;
    wsRef.current.sendStartGame();
  };

  const isHost = room?.host_id === myPlayerId;

  // NOT: Lobby unmount olduğunda WS'yi kapatmıyoruz
  // çünkü aynı WS bağlantısı GameBoard'a aktarılıyor.
  // Bağlantı yönetimi App seviyesinde (onBackToLobby) yapılır.

  // ===================== LOBİ EKRANI =====================
  if (inLobby && room) {
    return (
      <div className="min-h-screen bg-bg-primary bg-grid relative flex flex-col scanline">
        <Particles count={20} />
        <StockTicker />

        <div className="flex-1 flex items-center justify-center p-4 z-10">
          <div className="w-full max-w-2xl">
            {/* Oda Bilgisi */}
            <div className="glass-card p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg text-accent-green text-glow-green">
                    ODA LOBİSİ
                  </h2>
                  <p className="text-text-secondary text-sm mt-1">
                    Oyuncular hazır olduğunda host oyunu başlatabilir
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-text-muted text-xs font-mono uppercase tracking-wider">
                    Oda Kodu
                  </div>
                  <div className="font-display text-2xl text-accent-cyan text-glow-cyan tracking-[0.3em]">
                    {room.room_code}
                  </div>
                </div>
              </div>

              {/* Oyuncu Listesi */}
              <div className="border-t border-border-dim pt-4">
                <div className="text-text-muted text-xs font-mono uppercase tracking-wider mb-3">
                  Oyuncular ({room.player_count}/{room.max_players})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {room.players.map((p) => (
                    <div
                      key={p.player_id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        p.player_id === room.host_id
                          ? 'border-accent-yellow/40 bg-accent-yellow/5'
                          : 'border-border-dim bg-bg-card/50'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          p.is_connected ? 'bg-accent-green animate-pulse-glow' : 'bg-text-muted'
                        }`}
                      />
                      <span className="text-sm font-medium truncate">
                        {p.player_name}
                      </span>
                      {p.player_id === room.host_id && (
                        <span className="text-accent-yellow text-xs">👑</span>
                      )}
                    </div>
                  ))}

                  {/* Boş slotlar */}
                  {Array.from({ length: room.max_players - room.player_count }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border-dim opacity-30"
                    >
                      <div className="w-2 h-2 rounded-full bg-text-muted" />
                      <span className="text-sm text-text-muted">Boş slot</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sohbet */}
            <div className="glass-card p-4 mb-4">
              <div className="text-text-muted text-xs font-mono uppercase tracking-wider mb-2">
                💬 Lobi Sohbeti
              </div>
              <div className="h-36 overflow-y-auto space-y-1 mb-3 pr-2">
                {chatMessages.length === 0 && (
                  <p className="text-text-muted text-sm italic">Henüz mesaj yok...</p>
                )}
                {chatMessages.map((cm, i) => (
                  <div key={i} className="text-sm">
                    <span
                      className={`font-semibold ${
                        cm.name === '📢 Sistem'
                          ? 'text-accent-yellow'
                          : 'text-accent-cyan'
                      }`}
                    >
                      {cm.name}:
                    </span>{' '}
                    <span className="text-text-secondary">{cm.msg}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-cyber flex-1 !py-2 !text-sm"
                  placeholder="Mesaj yaz..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  maxLength={200}
                />
                <button
                  className="btn-cyber !py-2 !px-4 !text-xs"
                  onClick={handleSendChat}
                >
                  Gönder
                </button>
              </div>
            </div>

            {/* Hata */}
            {error && (
              <div className="glass-card border-accent-red/30 p-3 mb-4 text-accent-red text-sm text-center">
                ⚠️ {error}
              </div>
            )}

            {/* Oyun Başlat Butonu */}
            {isHost ? (
              <button
                className="btn-cyber w-full py-4 text-base"
                onClick={handleStartGame}
                disabled={room.player_count < 2}
              >
                {room.player_count < 2
                  ? `⏳ En az 2 oyuncu gerekli (${room.player_count}/2)`
                  : '🚀 Oyunu Başlat'}
              </button>
            ) : (
              <div className="text-center text-text-secondary text-sm animate-pulse-glow">
                ⏳ Host'un oyunu başlatması bekleniyor...
              </div>
            )}
          </div>
        </div>

        <StockTicker />
      </div>
    );
  }

  // ===================== GİRİŞ EKRANI =====================
  return (
    <div className="min-h-screen bg-bg-primary bg-grid relative flex flex-col scanline">
      <Particles count={25} />
      <StockTicker />

      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          {/* Logo / Başlık */}
          <div className="text-center mb-10">
            <div className="text-6xl mb-4 drop-shadow-2xl">🎰</div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-accent-green text-glow-green tracking-wider">
              BORSA
            </h1>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-accent-cyan text-glow-cyan tracking-[0.25em] mt-1">
              MANİPÜLATÖRLERİ
            </h1>
            <p className="text-text-secondary text-sm mt-4 font-mono">
              &gt; Piyasayı manipüle et. Ajanı bul. Kazanan sen ol._
            </p>
          </div>

          {/* Tab Seçici */}
          <div className="flex mb-6 border border-border-dim rounded-xl overflow-hidden">
            <button
              className={`flex-1 py-3 font-display text-sm tracking-wider transition-all ${
                tab === 'create'
                  ? 'bg-accent-green/10 text-accent-green border-r border-border-dim'
                  : 'text-text-muted hover:text-text-secondary border-r border-border-dim'
              }`}
              onClick={() => { setTab('create'); setError(''); }}
            >
              ODA OLUŞTUR
            </button>
            <button
              className={`flex-1 py-3 font-display text-sm tracking-wider transition-all ${
                tab === 'join'
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              onClick={() => { setTab('join'); setError(''); }}
            >
              ODAYA KATIL
            </button>
          </div>

          {/* Form */}
          <div className="glass-card p-6 space-y-4">
            {/* Oyuncu Adı */}
            <div>
              <label className="text-text-muted text-xs font-mono uppercase tracking-wider block mb-2">
                Oyuncu Adı
              </label>
              <input
                id="player-name-input"
                type="text"
                className="input-cyber"
                placeholder="Kod adını gir..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    tab === 'create' ? handleCreateRoom() : handleJoinRoom();
                  }
                }}
              />
            </div>

            {/* Oda Kodu (sadece Join'de) */}
            {tab === 'join' && (
              <div>
                <label className="text-text-muted text-xs font-mono uppercase tracking-wider block mb-2">
                  Oda Kodu
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  className="input-cyber !tracking-[0.4em] !text-center !text-lg uppercase"
                  placeholder="A1B2C3"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>
            )}

            {/* Hata Mesajı */}
            {error && (
              <div className="text-accent-red text-sm text-center bg-accent-red/5 border border-accent-red/20 rounded-lg py-2 px-3">
                ⚠️ {error}
              </div>
            )}

            {/* Buton */}
            <button
              id="action-button"
              className={`w-full ${tab === 'create' ? 'btn-cyber' : 'btn-cyber'} py-4 text-base`}
              onClick={tab === 'create' ? handleCreateRoom : handleJoinRoom}
              disabled={loading}
              style={tab === 'join' ? { borderColor: '#00d4ff', color: '#00d4ff' } : {}}
            >
              {loading
                ? '⏳ Bağlanılıyor...'
                : tab === 'create'
                ? '🎰 ODA OLUŞTUR'
                : '🔗 ODAYA KATIL'}
            </button>
          </div>

          {/* Alt Bilgi */}
          <div className="mt-8 text-center space-y-2">
            <div className="flex items-center justify-center gap-4 text-text-muted text-xs font-mono">
              <span>👥 2-6 Oyuncu</span>
              <span className="text-border-dim">|</span>
              <span>⏱️ ~2 Dakika</span>
              <span className="text-border-dim">|</span>
              <span>🃏 8 Kart</span>
            </div>
            <p className="text-text-muted/50 text-xs">
              v0.1.0 — Gerçek zamanlı çok oyunculu borsa oyunu
            </p>
          </div>
        </div>
      </div>

      <StockTicker />
    </div>
  );
}
