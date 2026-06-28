import type { GameResults, PlayerGameState } from '../types/game';

interface GameOverProps {
  results: GameResults;
  myResults: {
    player: PlayerGameState;
    agenda: PlayerGameState['agenda'];
    agenda_completed: boolean;
    final_score: number;
  } | null;
  onBackToLobby: () => void;
}

/**
 * GameOver — Oyun sonu sonuç ekranı
 */
export default function GameOver({ results, myResults, onBackToLobby }: GameOverProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-card max-w-lg w-full p-6 border-accent-yellow/30">
        {/* Başlık */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏁</div>
          <h2 className="font-display text-2xl text-accent-yellow tracking-wider mb-1">
            BORSA KAPANDI
          </h2>
          <p className="text-text-secondary text-sm">Sonuçlar açıklanıyor...</p>
        </div>

        {/* Sıralama */}
        <div className="space-y-2 mb-6">
          {results.rankings.map((r) => {
            const medal =
              r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}.`;
            const isWinner = r.rank === 1;

            return (
              <div
                key={r.rank}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isWinner
                    ? 'border-accent-yellow/40 bg-accent-yellow/10 glow-green'
                    : 'border-border-dim bg-bg-card/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{medal}</span>
                  <div>
                    <div className={`font-semibold text-sm ${isWinner ? 'text-accent-yellow' : 'text-text-primary'}`}>
                      {r.player_name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-muted font-mono">
                        Varlık: ₺{r.net_worth.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      {r.agenda_completed && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded-full border border-accent-green/20">
                          ✅ Ajanda +₺5.000
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-accent-cyan">
                    ₺{r.final_score.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono">
                    TOPLAM SKOR
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benim ajandam */}
        {myResults?.agenda && (
          <div className={`p-4 rounded-xl border mb-6 ${
            myResults.agenda_completed
              ? 'border-accent-green/30 bg-accent-green/5'
              : 'border-accent-red/30 bg-accent-red/5'
          }`}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">
              🕵️ Gizli Ajandan
            </div>
            <div className="text-sm text-text-primary mb-1">
              {myResults.agenda.description}
            </div>
            <div className={`text-xs font-semibold ${
              myResults.agenda_completed ? 'text-accent-green' : 'text-accent-red'
            }`}>
              {myResults.agenda_completed
                ? '✅ Ajandanı tamamladın! +₺5.000 bonus'
                : '❌ Ajandanı tamamlayamadın!'}
            </div>
          </div>
        )}

        {/* Geri Dön */}
        <button
          onClick={onBackToLobby}
          className="btn-cyber w-full py-4 text-sm"
        >
          🏠 LOBİYE DÖN
        </button>
      </div>
    </div>
  );
}
