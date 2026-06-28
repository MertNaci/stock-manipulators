

const TICKER_ITEMS = [
  { symbol: 'UZAY', name: 'Uzay Yakıtı A.Ş.', price: '₺120.00', change: '+2.35%', up: true },
  { symbol: 'URAN', name: 'Sentetik Uranyum', price: '₺85.00', change: '-1.47%', up: false },
  { symbol: 'ROBO', name: 'Robotik Kol Ltd.', price: '₺200.00', change: '+0.89%', up: true },
  { symbol: 'NÖRO', name: 'NöroLink Biyotek', price: '₺150.00', change: '+3.12%', up: true },
  { symbol: 'KUANT', name: 'Kuantum Bulut', price: '₺95.00', change: '-0.53%', up: false },
  { symbol: 'UZAY', name: 'Uzay Yakıtı A.Ş.', price: '₺120.45', change: '+2.73%', up: true },
  { symbol: 'URAN', name: 'Sentetik Uranyum', price: '₺84.20', change: '-2.41%', up: false },
  { symbol: 'ROBO', name: 'Robotik Kol Ltd.', price: '₺201.30', change: '+1.15%', up: true },
  { symbol: 'NÖRO', name: 'NöroLink Biyotek', price: '₺152.80', change: '+4.87%', up: true },
  { symbol: 'KUANT', name: 'Kuantum Bulut', price: '₺93.10', change: '-2.53%', up: false },
];

/**
 * StockTicker — Ekranın üst/altında kayan hisse bandı
 */
export default function StockTicker() {
  return (
    <div className="w-full overflow-hidden border-y border-border-dim bg-bg-secondary/50 backdrop-blur-sm py-2">
      <div className="ticker-line flex gap-8 whitespace-nowrap">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm font-mono">
            <span className="text-accent-cyan font-semibold">{item.symbol}</span>
            <span className="text-text-secondary">{item.price}</span>
            <span className={item.up ? 'text-accent-green' : 'text-accent-red'}>
              {item.up ? '▲' : '▼'} {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
