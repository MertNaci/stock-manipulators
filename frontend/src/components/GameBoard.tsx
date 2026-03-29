import { useState, useEffect, useCallback } from 'react';
import type {
  GameState,
  PlayerGameState,
  GameResults,
  WSMessage,
} from '../types/game';
import { GameWebSocket } from '../services/websocket';
import StockCard from './StockCard';
import CardHand from './CardHand';
import EventLog from './EventLog';
import PlayerList from './PlayerList';
import GameOver from './GameOver';
import Particles from './Particles';

interface GameBoardProps {
  roomCode: string;
  playerId: string;
  ws: GameWebSocket;
  onBackToLobby: () => void;
}

/**
 * GameBoard — Ana oyun ekranı
 * Hisse senetleri, kart eli, olay akışı, oyuncu sıralaması
 */
export default function GameBoard({
  roomCode,
  playerId,
  ws,
  onBackToLobby,
}: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerGameState | null>(null);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [myResults, setMyResults] = useState<{
    player: PlayerGameState;
    agenda: PlayerGameState['agenda'];
    agenda_completed: boolean;
    final_score: number;
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [cardNotification, setCardNotification] = useState<string | null>(null);

  // Bildirim göster
  const showNotification = useCallback((msg: string, duration = 3000) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), duration);
  }, []);

  // WS mesajlarını dinle
  useEffect(() => {
    const unsubscribe = ws.onMessage((msg: WSMessage) => {
      switch (msg.type) {
        case 'game_state':
          setGameState(msg.state);
          break;

        case 'player_state':
          setPlayerState(msg.player);
          break;

        case 'card_played':
          setCardNotification(msg.anonymous_message);
          setTimeout(() => setCardNotification(null), 4000);
          break;

        case 'trade_result':
          if (!msg.success && msg.error) {
            showNotification(`❌ ${msg.error}`);
          } else if (msg.success) {
            const action = msg.action === 'buy' ? 'Alım' : 'Satım';
            showNotification(`✅ ${action} başarılı!`);
          }
          break;

        case 'card_result':
          if (!msg.success && msg.error) {
            showNotification(`❌ ${msg.error}`);
          } else if (msg.success) {
            showNotification('🃏 Kart oynandı!');
          }
          break;

        case 'game_ended':
          setGameResults(msg.results);
          break;

        case 'your_results':
          setMyResults({
            player: msg.player,
            agenda: msg.agenda,
            agenda_completed: msg.agenda_completed,
            final_score: msg.final_score,
          });
          break;

        case 'error':
          showNotification(`⚠️ ${msg.message}`);
          break;
      }
    });

    return () => unsubscribe();
  }, [ws, showNotification]);

  // Alım/Satım
  const handleBuy = useCallback(
    (stockId: string, amount: number) => ws.sendBuyStock(stockId, amount),
    [ws],
  );

  const handleSell = useCallback(
    (stockId: string, amount: number) => ws.sendSellStock(stockId, amount),
    [ws],
  );

  // Kart oyna
  const handlePlayCard = useCallback(
    (cardId: string, targetStockId: string) => ws.sendPlayCard(cardId, targetStockId),
    [ws],
  );

  // Yükleniyor
  if (!gameState) {
    return (
      <div className="min-h-screen bg-bg-primary bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">📊</div>
          <p className="font-display text-accent-green text-glow-green tracking-wider animate-pulse-glow">
            BORSA YÜKLENİYOR...
          </p>
        </div>
      </div>
    );
  }

  const timeRemaining = gameState.time_remaining;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const progressPercent =
    ((gameState.max_ticks - gameState.current_tick) / gameState.max_ticks) * 100;

  return (
    <div className="min-h-screen bg-bg-primary bg-grid relative flex flex-col scanline">
      <Particles count={15} />

      {/* ===== ÜST BAR ===== */}
      <header className="bg-bg-secondary/80 backdrop-blur-md border-b border-border-dim px-4 py-2 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Sol: Logo + Oda bilgisi */}
          <div className="flex items-center gap-3">
            <span className="text-xl">🎰</span>
            <div>
              <span className="font-display text-xs text-accent-green tracking-wider">
                BORSA MANİPÜLATÖRLERİ
              </span>
              <div className="text-[10px] text-text-muted font-mono">
                Oda: <span className="text-accent-cyan">{roomCode}</span>
              </div>
            </div>
          </div>

          {/* Orta: Timer */}
          <div className="flex flex-col items-center">
            <div
              className={`font-display text-2xl tracking-wider ${
                timeRemaining <= 30
                  ? 'text-accent-red animate-pulse-glow'
                  : timeRemaining <= 60
                  ? 'text-accent-yellow'
                  : 'text-accent-green text-glow-green'
              }`}
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            {/* İlerleme çubuğu */}
            <div className="w-32 h-1 bg-bg-card rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  timeRemaining <= 30
                    ? 'bg-accent-red'
                    : timeRemaining <= 60
                    ? 'bg-accent-yellow'
                    : 'bg-accent-green'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Sağ: Nakit */}
          <div className="text-right">
            <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
              NAKİT
            </div>
            <div className="font-mono text-lg font-bold text-accent-green">
              ₺{(playerState?.cash ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </header>

      {/* ===== GİZLİ AJANDA BANNER ===== */}
      {playerState?.agenda && (
        <div className="bg-accent-purple/5 border-b border-accent-purple/20 px-4 py-1.5 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs">
            <span>🕵️</span>
            <span className="text-accent-purple font-mono">Gizli Ajandan:</span>
            <span className="text-text-secondary">{playerState.agenda.description}</span>
          </div>
        </div>
      )}

      {/* ===== KART OYNANDI BİLDİRİMİ ===== */}
      {cardNotification && (
        <div className="bg-accent-yellow/10 border-b border-accent-yellow/30 px-4 py-2 z-10 animate-pulse-glow">
          <div className="max-w-7xl mx-auto text-center text-sm text-accent-yellow font-semibold">
            {cardNotification}
          </div>
        </div>
      )}

      {/* ===== ANA İÇERİK ===== */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 z-10 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Sol Panel: Hisse Senetleri */}
        <div className="flex-1 min-w-0">
          <div className="text-text-muted text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
            📈 BORSA TAHTASİ — Tur {gameState.current_tick}/{gameState.max_ticks}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Object.values(gameState.stocks).map((stock) => (
              <StockCard
                key={stock.stock_id}
                stock={stock}
                onBuy={handleBuy}
                onSell={handleSell}
                ownedAmount={playerState?.portfolio[stock.stock_id] ?? 0}
                disabled={gameState.is_finished}
              />
            ))}
          </div>
        </div>

        {/* Sağ Panel: Oyuncular + Olay Akışı */}
        <div className="w-full lg:w-72 flex flex-col gap-3 flex-shrink-0">
          {/* Oyuncu Sıralaması */}
          <div className="glass-card p-3">
            <PlayerList
              players={gameState.players}
              stocks={gameState.stocks}
              myPlayerId={playerId}
            />
          </div>

          {/* Olay Akışı */}
          <div className="glass-card p-3 flex-1 min-h-[150px] max-h-[300px] flex flex-col">
            <EventLog events={gameState.event_log} />
          </div>
        </div>
      </main>

      {/* ===== ALT BAR: Kart Eli ===== */}
      <footer className="bg-bg-secondary/80 backdrop-blur-md border-t border-border-dim px-4 py-3 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-text-muted text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
            🃏 ELİNDEKİ KARTLAR ({playerState?.hand.length ?? 0})
          </div>
          <CardHand
            cards={playerState?.hand ?? []}
            stocks={gameState.stocks}
            onPlayCard={handlePlayCard}
            disabled={gameState.is_finished}
          />
        </div>
      </footer>

      {/* ===== BİLDİRİMLER ===== */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 
                        glass-card px-6 py-3 border-accent-cyan/30
                        animate-[fadeIn_0.3s_ease] text-sm text-text-primary">
          {notification}
        </div>
      )}

      {/* ===== OYUN SONU ===== */}
      {gameResults && (
        <GameOver
          results={gameResults}
          myResults={myResults}
          onBackToLobby={onBackToLobby}
        />
      )}
    </div>
  );
}
