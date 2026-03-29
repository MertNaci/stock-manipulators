import type { GameEvent } from '../types/game';
import { useEffect, useRef } from 'react';

interface EventLogProps {
  events: GameEvent[];
}

/**
 * EventLog — Oyun içi olay akışı
 * Anonim kart bildirimleri, alım/satım, sistem mesajları
 */
export default function EventLog({ events }: EventLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <div className="text-text-muted text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
        📡 CANLI OLAY AKIŞI
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
        {events.length === 0 && (
          <div className="text-text-muted text-xs italic">Henüz olay yok...</div>
        )}
        {events.map((event, i) => (
          <div
            key={i}
            className="text-xs flex items-start gap-1.5 py-1 px-2 rounded-lg bg-bg-card/30 
                       border border-border-dim/50 animate-[fadeIn_0.3s_ease]"
          >
            <span className="flex-shrink-0">{event.emoji}</span>
            <span className="text-text-secondary leading-tight">{event.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
