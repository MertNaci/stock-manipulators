"""
Card (Aksiyon Kartı) Modeli
=============================
Oyuncuların kullanabileceği manipülasyon kartlarını tanımlar.
Her kart bir hisse senedine uygulanır ve belirli bir efekt yaratır.
"""

import random
from dataclasses import dataclass
from typing import Optional


@dataclass
class Card:
    """Bir aksiyon kartını temsil eder."""

    card_id: str          # Benzersiz kart ID'si (ör: "yalan_haber")
    name: str             # Gösterim adı
    emoji: str            # Görsel ikon
    description: str      # Kart açıklaması
    card_type: str        # "manipulate" | "block" | "special"

    # Efekt parametreleri
    price_multiplier: float = 1.0      # Fiyat çarpanı (1.15 = %15 artış)
    effect_duration: int = 3           # Efekt süresi (tick cinsinden)
    lock_duration: int = 0             # Kilit süresi (0 = kilitlemez)
    cooldown: int = 0                  # Kullanım sonrası bekleme süresi

    # Anonim mesaj şablonu (odaya gönderilecek)
    anonymous_message: str = "Biri bir kart oynadı!"

    def to_dict(self) -> dict:
        return {
            "card_id": self.card_id,
            "name": self.name,
            "emoji": self.emoji,
            "description": self.description,
            "card_type": self.card_type,
            "price_multiplier": self.price_multiplier,
            "effect_duration": self.effect_duration,
            "lock_duration": self.lock_duration,
        }


# ============================================================
#  Kart Tanımları
# ============================================================

CARD_DEFINITIONS = {
    "yalan_haber": Card(
        card_id="yalan_haber",
        name="Yalan Haber",
        emoji="📰",
        description="Seçilen hisseyi %10 düşürür.",
        card_type="manipulate",
        price_multiplier=0.90,
        effect_duration=3,
        anonymous_message="📰 Biri Yalan Haber yaydı! Bir hisse değer kaybediyor...",
    ),
    "hype": Card(
        card_id="hype",
        name="Hype Treni",
        emoji="🚂",
        description="Seçilen hisseyi %15 artırır.",
        card_type="manipulate",
        price_multiplier=1.15,
        effect_duration=3,
        anonymous_message="🚂 Biri Hype yarattı! Bir hisse fırlıyor...",
    ),
    "siber_saldiri": Card(
        card_id="siber_saldiri",
        name="Siber Saldırı",
        emoji="💀",
        description="Seçilen hisseyi 10 saniye boyunca işlem görmesini engeller.",
        card_type="block",
        lock_duration=10,
        anonymous_message="💀 Siber saldırı! Bir hisse kilitlendi!",
    ),
    "iceriden_bilgi": Card(
        card_id="iceriden_bilgi",
        name="İçeriden Bilgi",
        emoji="🕵️",
        description="Seçilen hisseyi %20 artırır ama efekt kısa sürer.",
        card_type="manipulate",
        price_multiplier=1.20,
        effect_duration=2,
        anonymous_message="🕵️ Biri içeriden bilgi kullandı! Piyasa kıpırdıyor...",
    ),
    "aciga_satis": Card(
        card_id="aciga_satis",
        name="Açığa Satış Dalgası",
        emoji="📉",
        description="Seçilen hisseyi %18 düşürür.",
        card_type="manipulate",
        price_multiplier=0.82,
        effect_duration=3,
        anonymous_message="📉 Açığa satış dalgası! Bir hissenin fiyatı çakılıyor...",
    ),
    "sec_sorusturmasi": Card(
        card_id="sec_sorusturmasi",
        name="SPK Soruşturması",
        emoji="⚖️",
        description="Seçilen hisseyi 5 saniye kilitler ve %8 düşürür.",
        card_type="block",
        price_multiplier=0.92,
        effect_duration=2,
        lock_duration=5,
        anonymous_message="⚖️ SPK harekete geçti! Bir şirket soruşturma altında!",
    ),
    "pump_and_dump": Card(
        card_id="pump_and_dump",
        name="Pump & Dump",
        emoji="🎰",
        description="Seçilen hisse önce %25 artar, sonra %20 düşer.",
        card_type="special",
        price_multiplier=1.25,
        effect_duration=2,
        anonymous_message="🎰 Pump & Dump tespit edildi! Bir hisse çılgınca dalgalanıyor!",
    ),
    "halka_arz": Card(
        card_id="halka_arz",
        name="Halka Arz Haberi",
        emoji="🎉",
        description="Seçilen hisseyi %12 artırır ve talep basıncı ekler.",
        card_type="manipulate",
        price_multiplier=1.12,
        effect_duration=4,
        anonymous_message="🎉 Halka arz söylentileri! Bir hisseye talep patlaması yaşanıyor!",
    ),
}


# ============================================================
#  El (Hand) Oluşturma
# ============================================================

def generate_hand(count: int = 3) -> list[Card]:
    """
    Oyuncuya verilecek rastgele kart eli oluşturur.
    count: Kaç kart dağıtılacak
    """
    all_cards = list(CARD_DEFINITIONS.values())
    # Ağırlıklı dağıtım: özel kartlar daha nadir
    weights = []
    for card in all_cards:
        if card.card_type == "special":
            weights.append(1)
        elif card.card_type == "block":
            weights.append(2)
        else:
            weights.append(3)

    hand = random.choices(all_cards, weights=weights, k=count)
    return hand
