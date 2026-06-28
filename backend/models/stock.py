"""
Stock (Hisse Senedi) Modeli
============================
Kurgusal şirketlerin hisse senetlerini temsil eder.
Fiyatlar arz/talep + rastgele dalgalanma + kart efektleriyle değişir.
"""

import random
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Stock:
    """Tek bir kurgusal şirketin hisse senedini temsil eder."""

    stock_id: str              # Benzersiz kısa kod (örn: "UZAY")
    name: str                  # Tam isim (örn: "Uzay Yakıtı A.Ş.")
    emoji: str                 # Görsel ikon
    base_price: float          # Başlangıç fiyatı
    current_price: float = 0.0 # Anlık fiyat
    min_price: float = 1.0     # Fiyat alt sınır (iflas etmez)
    max_price: float = 9999.0  # Fiyat üst sınır

    # Volatilite — her tick'te fiyat ne kadar salınır (%)
    volatility: float = 0.03

    # Arz/talep basıncı: + alım baskısı, - satış baskısı
    demand_pressure: float = 0.0

    # Kart efektlerinden gelen geçici çarpanlar
    # {"effect_name": {"multiplier": 1.15, "ticks_remaining": 5}}
    active_effects: dict = field(default_factory=dict)

    # İşlem kilitli mi? (Siber Saldırı kartı)
    is_locked: bool = False
    lock_ticks_remaining: int = 0

    # Fiyat geçmişi (grafik için)
    price_history: list = field(default_factory=list)

    def __post_init__(self):
        if self.current_price == 0.0:
            self.current_price = self.base_price
        self.price_history.append(self.current_price)

    def tick(self):
        """
        Her oyun tick'inde çağrılır.
        Fiyatı günceller: rastgele dalgalanma + talep basıncı + aktif efektler.
        """
        if self.is_locked:
            self.lock_ticks_remaining -= 1
            if self.lock_ticks_remaining <= 0:
                self.is_locked = False
                self.lock_ticks_remaining = 0
            # Kilitliyken fiyat değişmez
            self.price_history.append(self.current_price)
            return

        # 1) Rastgele piyasa dalgalanması
        noise = random.gauss(0, self.volatility)

        # 2) Arz/talep basıncı etkisi
        demand_effect = self.demand_pressure * 0.01
        # Talep basıncı zamanla azalır (doğal dengelenme)
        self.demand_pressure *= 0.85

        # 3) Aktif kart efektlerini uygula
        card_multiplier = 1.0
        expired_effects = []

        for effect_name, effect in self.active_effects.items():
            card_multiplier *= effect["multiplier"]
            effect["ticks_remaining"] -= 1
            if effect["ticks_remaining"] <= 0:
                expired_effects.append(effect_name)

        # Süresi dolan efektleri kaldır
        for name in expired_effects:
            del self.active_effects[name]

        # 4) Yeni fiyat hesapla
        price_change = self.current_price * (noise + demand_effect)
        new_price = self.current_price * card_multiplier + price_change

        # Sınırlar içinde tut
        self.current_price = max(self.min_price, min(self.max_price, round(new_price, 2)))

        # Tarihçeye ekle (son 60 veri noktası yeterli)
        self.price_history.append(self.current_price)
        if len(self.price_history) > 60:
            self.price_history.pop(0)

    def apply_demand(self, amount: int, is_buy: bool):
        """
        Alım/satım emri geldiğinde talep basıncını günceller.
        amount: kaç adet alındı/satıldı
        """
        if is_buy:
            self.demand_pressure += amount * 0.5
        else:
            self.demand_pressure -= amount * 0.5

    def apply_card_effect(self, effect_name: str, multiplier: float, duration_ticks: int):
        """Kart efekti uygular (ör: Hype → %15 artış)."""
        self.active_effects[effect_name] = {
            "multiplier": multiplier,
            "ticks_remaining": duration_ticks,
        }

    def lock(self, duration_ticks: int):
        """Hisseyi belirli tick süresince kilitler (ör: Siber Saldırı)."""
        self.is_locked = True
        self.lock_ticks_remaining = duration_ticks

    def price_change_percent(self) -> float:
        """Başlangıç fiyatına göre değişim yüzdesi."""
        if self.base_price == 0:
            return 0.0
        return round(((self.current_price - self.base_price) / self.base_price) * 100, 2)

    def to_dict(self) -> dict:
        return {
            "stock_id": self.stock_id,
            "name": self.name,
            "emoji": self.emoji,
            "base_price": self.base_price,
            "current_price": self.current_price,
            "price_change_percent": self.price_change_percent(),
            "is_locked": self.is_locked,
            "lock_ticks_remaining": self.lock_ticks_remaining,
            "active_effects": list(self.active_effects.keys()),
            "price_history": self.price_history[-30:],  # Son 30 veri noktası
        }


# ============================================================
#  Kurgusal Şirket Tanımları
# ============================================================

STOCK_DEFINITIONS = [
    {
        "stock_id": "UZAY",
        "name": "Uzay Yakıtı A.Ş.",
        "emoji": "🚀",
        "base_price": 120.00,
        "volatility": 0.035,
    },
    {
        "stock_id": "URAN",
        "name": "Sentetik Uranyum",
        "emoji": "☢️",
        "base_price": 85.00,
        "volatility": 0.04,
    },
    {
        "stock_id": "ROBO",
        "name": "Robotik Kol Ltd.",
        "emoji": "🦾",
        "base_price": 200.00,
        "volatility": 0.025,
    },
    {
        "stock_id": "NÖRO",
        "name": "NöroLink Biyotek",
        "emoji": "🧠",
        "base_price": 150.00,
        "volatility": 0.03,
    },
    {
        "stock_id": "KUANT",
        "name": "Kuantum Bulut",
        "emoji": "☁️",
        "base_price": 95.00,
        "volatility": 0.045,
    },
]


def create_stocks() -> dict[str, Stock]:
    """Oyun için tüm hisse senetlerini oluşturur."""
    stocks = {}
    for defn in STOCK_DEFINITIONS:
        stock = Stock(**defn)
        stocks[stock.stock_id] = stock
    return stocks
