"""
Player (Oyuncu) Modeli
========================
Her oyuncunun parasını, portföyünü, elindeki kartları ve gizli ajandasını yönetir.
"""

import random
from dataclasses import dataclass, field
from typing import Optional

from .card import Card, generate_hand


@dataclass
class Player:
    """Bir oyuncuyu temsil eder (oyun içi durum)."""

    player_id: str
    player_name: str

    # Finansal durum
    cash: float = 10000.00     # Başlangıç parası
    # Portföy: {"UZAY": 5, "ROBO": 3} → hangi hisseden kaç adet var
    portfolio: dict = field(default_factory=dict)

    # Kart eli: [Card, Card, ...]
    hand: list = field(default_factory=list)

    # Gizli Ajanda
    agenda: Optional[dict] = None
    # Örnek: {"type": "crash", "target_stock": "UZAY", "description": "Uzay Yakıtı'nı batır!"}

    # Skor (oyun sonu hesaplanır)
    final_score: float = 0.0
    agenda_completed: bool = False

    def deal_initial_hand(self, count: int = 3):
        """Oyun başında kart dağıt."""
        self.hand = generate_hand(count)

    def add_card(self, card: Card):
        """Elde kart ekle."""
        self.hand.append(card)

    def remove_card(self, card_id: str) -> Optional[Card]:
        """Elden kart çıkar. Başarılıysa kartı döner."""
        for i, card in enumerate(self.hand):
            if card.card_id == card_id:
                return self.hand.pop(i)
        return None

    def has_card(self, card_id: str) -> bool:
        """Elde bu kart var mı kontrol et."""
        return any(c.card_id == card_id for c in self.hand)

    def buy_stock(self, stock_id: str, amount: int, price: float) -> bool:
        """
        Hisse al. Yeterli para varsa True döner.
        price: Birim fiyat
        """
        total_cost = price * amount
        if total_cost > self.cash:
            return False

        self.cash -= total_cost
        self.cash = round(self.cash, 2)
        self.portfolio[stock_id] = self.portfolio.get(stock_id, 0) + amount
        return True

    def sell_stock(self, stock_id: str, amount: int, price: float) -> bool:
        """
        Hisse sat. Yeterli hisse varsa True döner.
        """
        current_amount = self.portfolio.get(stock_id, 0)
        if amount > current_amount:
            return False

        total_revenue = price * amount
        self.cash += total_revenue
        self.cash = round(self.cash, 2)
        self.portfolio[stock_id] = current_amount - amount

        # 0 kalan hisseyi portföyden kaldır
        if self.portfolio[stock_id] <= 0:
            del self.portfolio[stock_id]

        return True

    def get_portfolio_value(self, stock_prices: dict[str, float]) -> float:
        """Portföyün toplam değerini hesaplar."""
        total = 0.0
        for stock_id, amount in self.portfolio.items():
            price = stock_prices.get(stock_id, 0)
            total += price * amount
        return round(total, 2)

    def get_net_worth(self, stock_prices: dict[str, float]) -> float:
        """Toplam varlık = Nakit + Portföy değeri."""
        return round(self.cash + self.get_portfolio_value(stock_prices), 2)

    def calculate_final_score(self, stock_prices: dict[str, float]) -> float:
        """
        Oyun sonu skoru hesaplar.
        Skor = Net varlık + (Ajanda tamamlandıysa bonus)
        """
        net_worth = self.get_net_worth(stock_prices)
        agenda_bonus = 5000.0 if self.agenda_completed else 0.0
        self.final_score = net_worth + agenda_bonus
        return self.final_score

    def to_dict(self, hide_agenda: bool = True) -> dict:
        """
        Oyuncu verisini dict'e çevirir.
        hide_agenda=True ise ajanda gizlenir (diğer oyunculardan).
        """
        data = {
            "player_id": self.player_id,
            "player_name": self.player_name,
            "cash": self.cash,
            "portfolio": self.portfolio,
            "hand": [c.to_dict() for c in self.hand],
            "hand_count": len(self.hand),
        }

        if not hide_agenda:
            data["agenda"] = self.agenda
            data["agenda_completed"] = self.agenda_completed
            data["final_score"] = self.final_score

        return data

    def to_public_dict(self) -> dict:
        """Diğer oyunculara gösterilecek bilgiler (kart ve ajanda gizli)."""
        return {
            "player_id": self.player_id,
            "player_name": self.player_name,
            "cash": self.cash,
            "portfolio": self.portfolio,
            "hand_count": len(self.hand),
        }


# ============================================================
#  Ajanda Tanımları
# ============================================================

AGENDA_TEMPLATES = [
    {
        "type": "crash",
        "description": "{stock_name} hissesini batır! (Başlangıç fiyatının %30 altına düşür)",
        "check": lambda stock, base: stock.current_price < base * 0.70,
    },
    {
        "type": "moon",
        "description": "{stock_name} hissesini zirveye taşı! (Başlangıç fiyatının %50 üstüne çıkar)",
        "check": lambda stock, base: stock.current_price > base * 1.50,
    },
    {
        "type": "top1",
        "description": "{stock_name} hissesini en değerli yap! (Tüm hisseler arasında 1. sırada olsun)",
        "check": None,  # GameRoom'da kontrol edilecek
    },
    {
        "type": "bottom1",
        "description": "{stock_name} hissesini en ucuz yap! (Tüm hisseler arasında sonuncu olsun)",
        "check": None,  # GameRoom'da kontrol edilecek
    },
]


def assign_random_agenda(player: Player, available_stocks: list[dict]) -> dict:
    """
    Oyuncuya rastgele bir gizli ajanda atar.
    available_stocks: [{"stock_id": "UZAY", "name": "Uzay Yakıtı A.Ş.", "base_price": 120}, ...]
    """
    template = random.choice(AGENDA_TEMPLATES)
    target = random.choice(available_stocks)

    agenda = {
        "type": template["type"],
        "target_stock": target["stock_id"],
        "target_stock_name": target["name"],
        "description": template["description"].format(stock_name=target["name"]),
    }

    player.agenda = agenda
    return agenda
