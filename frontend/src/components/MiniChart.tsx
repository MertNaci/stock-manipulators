import { useRef, useEffect } from 'react';

interface MiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  basePrice?: number;
}

/**
 * MiniChart — Canvas tabanlı mini çizgi grafik (sparkline)
 * Hisse senedi fiyat geçmişini gösterir.
 */
export default function MiniChart({
  data,
  width = 200,
  height = 60,
  color,
  basePrice,
}: MiniChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Temizle
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...data) * 0.98;
    const max = Math.max(...data) * 1.02;
    const range = max - min || 1;

    const stepX = width / (data.length - 1);

    // Renk belirleme
    const lastPrice = data[data.length - 1];
    const firstPrice = basePrice ?? data[0];
    const isUp = lastPrice >= firstPrice;
    const lineColor = color || (isUp ? '#00f5a0' : '#ff3860');
    const fillColor = isUp
      ? 'rgba(0, 245, 160, 0.08)'
      : 'rgba(255, 56, 96, 0.08)';

    // Base price çizgisi
    if (basePrice !== undefined) {
      const baseY = height - ((basePrice - min) / range) * height;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, baseY);
      ctx.lineTo(width, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dolgu alanı
    ctx.beginPath();
    ctx.moveTo(0, height);
    data.forEach((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * height;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Çizgi
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Son nokta parlayan daire
    const lastX = (data.length - 1) * stepX;
    const lastY = height - ((lastPrice - min) / range) * height;

    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    // Glow efekti
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fillStyle = isUp
      ? 'rgba(0, 245, 160, 0.3)'
      : 'rgba(255, 56, 96, 0.3)';
    ctx.fill();
  }, [data, width, height, color, basePrice]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded"
    />
  );
}
