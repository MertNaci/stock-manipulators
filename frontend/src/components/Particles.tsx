import { useMemo } from 'react';

/**
 * Floating Particles — arka plan için yüzen partiküller
 */
export default function Particles({ count = 30 }: { count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 25,
      size: 1 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.4,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(0, 245, 160, ${p.opacity})`,
            animation: `float-up ${p.duration}s ${p.delay}s linear infinite`,
            boxShadow: `0 0 ${p.size * 3}px rgba(0, 245, 160, ${p.opacity * 0.5})`,
          }}
        />
      ))}
    </div>
  );
}
