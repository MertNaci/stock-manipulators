import { useState } from 'react';
import type { CardInfo, StockInfo } from '../types/game';

interface CardHandProps {
  cards: CardInfo[];
  stocks: Record<string, StockInfo>;
  onPlayCard: (cardId: string, targetStockId: string) => void;
  disabled?: boolean;
}

/**
 * CardHand — Oyuncunun elindeki aksiyon kartları
 */
export default function CardHand({
  cards,
  stocks,
  onPlayCard,
  disabled,
}: CardHandProps) {
  const [selectedCard, setSelectedCard] = useState<CardInfo | null>(null);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const handleCardClick = (card: CardInfo) => {
    if (disabled) return;
    setSelectedCard(card);
    setShowTargetPicker(true);
  };

  const handleTargetSelect = (stockId: string) => {
    if (!selectedCard) return;
    onPlayCard(selectedCard.card_id, stockId);
    setSelectedCard(null);
    setShowTargetPicker(false);
  };

  const handleCancel = () => {
    setSelectedCard(null);
    setShowTargetPicker(false);
  };

  // Kart tipi renklerini belirle
  const getCardColor = (type: string) => {
    switch (type) {
      case 'manipulate':
        return {
          border: 'border-accent-purple/40',
          bg: 'bg-accent-purple/5',
          text: 'text-accent-purple',
          glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        };
      case 'block':
        return {
          border: 'border-accent-red/40',
          bg: 'bg-accent-red/5',
          text: 'text-accent-red',
          glow: 'hover:shadow-[0_0_20px_rgba(255,56,96,0.3)]',
        };
      case 'special':
        return {
          border: 'border-accent-yellow/40',
          bg: 'bg-accent-yellow/5',
          text: 'text-accent-yellow',
          glow: 'hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]',
        };
      default:
        return {
          border: 'border-border-dim',
          bg: 'bg-bg-card',
          text: 'text-text-secondary',
          glow: '',
        };
    }
  };

  return (
    <div className="relative">
      {/* Hedef Seçici Modal Overlay */}
      {showTargetPicker && selectedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full border-accent-purple/30">
            <h3 className="font-display text-sm text-accent-purple tracking-wider mb-1">
              HEDEF SEÇ
            </h3>
            <p className="text-text-secondary text-xs mb-4">
              <span className="text-xl mr-1">{selectedCard.emoji}</span>
              <strong>{selectedCard.name}</strong> — {selectedCard.description}
            </p>

            <div className="space-y-2">
              {Object.values(stocks).map((stock) => (
                <button
                  key={stock.stock_id}
                  onClick={() => handleTargetSelect(stock.stock_id)}
                  disabled={stock.is_locked}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all
                    ${stock.is_locked
                      ? 'border-border-dim opacity-30 cursor-not-allowed'
                      : 'border-border-dim hover:border-accent-purple/40 hover:bg-accent-purple/5 cursor-pointer'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{stock.emoji}</span>
                    <div className="text-left">
                      <div className="font-display text-xs text-accent-cyan tracking-wider">
                        {stock.stock_id}
                      </div>
                      <div className="text-xs text-text-muted">{stock.name}</div>
                    </div>
                  </div>
                  <div className="font-mono text-sm text-text-primary">
                    ₺{stock.current_price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleCancel}
              className="w-full mt-4 py-2 rounded-lg text-xs font-display tracking-wider
                         bg-bg-card text-text-muted border border-border-dim
                         hover:border-accent-red/30 hover:text-accent-red transition-all"
            >
              İPTAL
            </button>
          </div>
        </div>
      )}

      {/* Kart Eli */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {cards.length === 0 && (
          <div className="text-text-muted text-xs font-mono italic py-4 text-center w-full">
            Elinizde kart yok. Yeni kartlar yakında dağıtılacak...
          </div>
        )}
        {cards.map((card, index) => {
          const colors = getCardColor(card.card_type);
          return (
            <button
              key={`${card.card_id}-${index}`}
              onClick={() => handleCardClick(card)}
              disabled={disabled}
              className={`flex-shrink-0 w-[130px] p-3 rounded-xl border transition-all
                ${colors.border} ${colors.bg} ${colors.glow}
                hover:-translate-y-1 active:scale-95
                disabled:opacity-40 disabled:pointer-events-none
                cursor-pointer group`}
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {card.emoji}
              </div>
              <div className={`font-display text-[10px] tracking-wider ${colors.text} mb-1`}>
                {card.name}
              </div>
              <div className="text-[9px] text-text-muted leading-tight">
                {card.description}
              </div>
              <div className="mt-2">
                <span
                  className={`text-[8px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider
                    ${colors.border} ${colors.text} opacity-60`}
                >
                  {card.card_type}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
