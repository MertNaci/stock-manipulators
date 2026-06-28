import { useState } from 'react';
import type { StockInfo } from '../types/game';
import MiniChart from './MiniChart';

interface StockCardProps {
  stock: StockInfo;
  onBuy: (stockId: string, amount: number) => void;
  onSell: (stockId: string, amount: number) => void;
  ownedAmount: number;
  disabled?: boolean;
}

/**
 * StockCard — Tek bir hisse senedini gösteren kart
 * Fiyat, grafik, alım/satım butonları
 */
export default function StockCard({
  stock,
  onBuy,
  onSell,
  ownedAmount,
  disabled,
}: StockCardProps) {
  const [tradeAmount, setTradeAmount] = useState(1);
  const isUp = stock.price_change_percent >= 0;
  const totalCost = stock.current_price * tradeAmount;

  return (
    <div
      className={`glass-card p-4 transition-all duration-300 ${
        stock.is_locked
          ? 'opacity-50 border-accent-red/30 pointer-events-none'
          : 'hover:border-accent-green/30'
      }`}
    >
      {/* Üst: İsim + Fiyat */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{stock.emoji}</span>
          <div>
            <div className="font-display text-xs tracking-wider text-accent-cyan">
              {stock.stock_id}
            </div>
            <div className="text-sm text-text-secondary truncate max-w-[120px]">
              {stock.name}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold text-text-primary">
            ₺{stock.current_price.toFixed(2)}
          </div>
          <div
            className={`font-mono text-xs font-semibold ${
              isUp ? 'text-accent-green' : 'text-accent-red'
            }`}
          >
            {isUp ? '▲' : '▼'} {Math.abs(stock.price_change_percent).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Grafik */}
      <div className="mb-3">
        <MiniChart
          data={stock.price_history}
          width={260}
          height={50}
          basePrice={stock.base_price}
        />
      </div>

      {/* Kilit uyarısı */}
      {stock.is_locked && (
        <div className="text-center text-accent-red text-xs font-mono mb-2 flex items-center justify-center gap-1">
          <span>🔒</span>
          KİLİTLİ — {stock.lock_ticks_remaining} tur kaldı
        </div>
      )}

      {/* Aktif efektler */}
      {stock.active_effects.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {stock.active_effects.map((effect) => (
            <span
              key={effect}
              className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20 font-mono"
            >
              ⚡ {effect}
            </span>
          ))}
        </div>
      )}

      {/* Portföy bilgisi */}
      {ownedAmount > 0 && (
        <div className="text-xs font-mono text-accent-yellow mb-2 flex items-center gap-1">
          📦 Portföy: {ownedAmount} adet
          <span className="text-text-muted">
            (₺{(ownedAmount * stock.current_price).toFixed(2)})
          </span>
        </div>
      )}

      {/* Alım/Satım */}
      {!stock.is_locked && !disabled && (
        <div className="space-y-2">
          {/* Miktar seçici */}
          <div className="flex items-center gap-2">
            <label className="text-text-muted text-[10px] font-mono uppercase tracking-wider">
              Adet
            </label>
            <div className="flex items-center gap-1">
              {[1, 5, 10, 25].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTradeAmount(amt)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-all ${
                    tradeAmount === amt
                      ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                      : 'bg-bg-card text-text-muted border border-border-dim hover:border-border-glow/20'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
            <span className="text-text-muted text-[10px] font-mono ml-auto">
              = ₺{totalCost.toFixed(2)}
            </span>
          </div>

          {/* Butonlar */}
          <div className="flex gap-2">
            <button
              className="flex-1 py-2 rounded-lg text-xs font-display tracking-wider
                         bg-accent-green/10 text-accent-green border border-accent-green/30
                         hover:bg-accent-green/20 hover:shadow-[0_0_20px_rgba(0,245,160,0.2)]
                         transition-all active:scale-95"
              onClick={() => onBuy(stock.stock_id, tradeAmount)}
            >
              AL
            </button>
            <button
              className="flex-1 py-2 rounded-lg text-xs font-display tracking-wider
                         bg-accent-red/10 text-accent-red border border-accent-red/30
                         hover:bg-accent-red/20 hover:shadow-[0_0_20px_rgba(255,56,96,0.2)]
                         transition-all active:scale-95 disabled:opacity-30"
              onClick={() => onSell(stock.stock_id, tradeAmount)}
              disabled={ownedAmount <= 0}
            >
              SAT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
