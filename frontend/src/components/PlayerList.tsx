import type { PublicPlayerState, StockInfo } from '../types/game';

interface PlayerListProps {
  players: Record<string, PublicPlayerState>;
  stocks: Record<string, StockInfo>;
  myPlayerId: string;
}

/**
 * PlayerList — Diğer oyuncuların durumunu gösteren skor tablosu
 */
export default function PlayerList({ players, stocks, myPlayerId }: PlayerListProps) {
  // Net varlık hesapla ve sırala
  const sorted = Object.values(players)
    .map((p) => {
      const portfolioValue = Object.entries(p.portfolio).reduce((sum, [sid, amt]) => {
        const price = stocks[sid]?.current_price ?? 0;
        return sum + price * amt;
      }, 0);
      return { ...p, net_worth: p.cash + portfolioValue };
    })
    .sort((a, b) => b.net_worth - a.net_worth);

  return (
    <div>
      <div className="text-text-muted text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
        🏆 OYUNCU SIRALAMALARI
      </div>
      <div className="space-y-1.5">
        {sorted.map((player, i) => {
          const isMe = player.player_id === myPlayerId;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return (
            <div
              key={player.player_id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                isMe
                  ? 'border-accent-green/30 bg-accent-green/5'
                  : 'border-border-dim/50 bg-bg-card/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{medal}</span>
                <div>
                  <div className={`text-xs font-medium ${isMe ? 'text-accent-green' : 'text-text-primary'}`}>
                    {player.player_name}
                    {isMe && <span className="text-[9px] ml-1 text-text-muted">(Sen)</span>}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono">
                    🃏 {player.hand_count} kart
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-semibold text-accent-cyan">
                  ₺{player.net_worth.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-text-muted font-mono">
                  Nakit: ₺{player.cash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
