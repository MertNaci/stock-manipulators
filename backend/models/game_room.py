"""
GameRoom (Oyun Odası) Modeli
==============================
Tek bir oyun odasının tam oyun döngüsünü yönetir:
- Oyun başlatma ve bitirme
- Tur/tick yönetimi
- Hisse fiyat güncelleme döngüsü
- Alım/satım emirleri
- Kart oynama
- Ajanda kontrolü
- Skor hesaplama
"""

import asyncio
import random
from typing import Optional, Callable, Awaitable

from .stock import Stock, create_stocks, STOCK_DEFINITIONS
from .card import Card, CARD_DEFINITIONS, generate_hand
from .player import Player, assign_random_agenda


class GameRoom:
    """Tek bir oyun odasının tüm durumunu ve mantığını yönetir."""

    # Oyun sabitleri
    STARTING_CASH = 10000.0
    INITIAL_HAND_SIZE = 3
    CARDS_PER_ROUND = 1          # Her turda kaç kart dağıtılır
    TICK_INTERVAL = 2.0          # Fiyat güncelleme aralığı (saniye)
    GAME_DURATION_TICKS = 120    # Toplam oyun süresi (tick cinsinden) → 120 × 2s = 240 saniye = 4 dk
    CARD_DEAL_INTERVAL = 10      # Her 10 tick'te bir kart dağıt

    def __init__(self, room_code: str):
        self.room_code = room_code

        # Oyun durumu
        self.is_active = False
        self.is_finished = False
        self.current_tick = 0

        # Şirketler / hisseler
        self.stocks: dict[str, Stock] = create_stocks()

        # Oyuncular (player_id -> Player)
        self.players: dict[str, Player] = {}

        # Olay günlüğü — ekranda gösterilecek son olaylar
        self.event_log: list[dict] = []

        # Callback: tick sonuçlarını broadcast etmek için
        # Dışarıdan set edilir (main.py'den)
        self._broadcast_callback: Optional[Callable[[str, dict], Awaitable[None]]] = None
        self._send_to_player_callback: Optional[Callable[[str, dict], Awaitable[None]]] = None

        # Oyun döngüsü task referansı
        self._game_loop_task: Optional[asyncio.Task] = None

    def set_callbacks(
        self,
        broadcast: Callable[[str, dict], Awaitable[None]],
        send_to_player: Callable[[str, dict], Awaitable[None]],
    ):
        """WebSocket broadcast ve unicast callback'lerini ayarlar."""
        self._broadcast_callback = broadcast
        self._send_to_player_callback = send_to_player

    # ============================================================
    #  Oyun Başlatma / Bitirme
    # ============================================================

    def initialize_players(self, player_ids_names: list[tuple[str, str]]):
        """Oyunculara başlangıç değerlerini atar."""
        stock_info = [
            {"stock_id": s.stock_id, "name": s.name, "base_price": s.base_price}
            for s in self.stocks.values()
        ]

        for player_id, player_name in player_ids_names:
            player = Player(
                player_id=player_id,
                player_name=player_name,
                cash=self.STARTING_CASH,
            )
            # Kart dağıt
            player.deal_initial_hand(self.INITIAL_HAND_SIZE)
            # Gizli ajanda ata
            assign_random_agenda(player, stock_info)

            self.players[player_id] = player

    async def start_game(self):
        """Oyunu başlatır ve fiyat güncelleme döngüsünü çalıştırır."""
        if self.is_active:
            return

        self.is_active = True
        self.is_finished = False
        self.current_tick = 0

        self._add_event("🔔", "Borsa açıldı! Manipülasyonlar başlasın!")

        # Oyun döngüsünü asyncio task olarak başlat
        self._game_loop_task = asyncio.create_task(self._game_loop())

    async def end_game(self):
        """Oyunu bitirir, skorları hesaplar."""
        self.is_active = False
        self.is_finished = True

        # Döngüyü durdur
        if self._game_loop_task and not self._game_loop_task.done():
            self._game_loop_task.cancel()

        # Ajandaları kontrol et
        self._check_all_agendas()

        # Final skorları hesapla
        stock_prices = {sid: s.current_price for sid, s in self.stocks.items()}
        for player in self.players.values():
            player.calculate_final_score(stock_prices)

        # Sonuçları yayınla
        results = self._get_results()
        self._add_event("🏁", "Borsa kapandı! Sonuçlar açıklanıyor...")

        if self._broadcast_callback:
            await self._broadcast_callback(self.room_code, {
                "type": "game_ended",
                "results": results,
                "event_log": self.event_log[-10:],
            })

            # Her oyuncuya kendi ajandasını göster
            for player in self.players.values():
                if self._send_to_player_callback:
                    await self._send_to_player_callback(player.player_id, {
                        "type": "your_results",
                        "player": player.to_dict(hide_agenda=False),
                        "agenda": player.agenda,
                        "agenda_completed": player.agenda_completed,
                        "final_score": player.final_score,
                    })

    # ============================================================
    #  Oyun Döngüsü
    # ============================================================

    async def _game_loop(self):
        """Ana oyun döngüsü — her TICK_INTERVAL'da fiyatları günceller."""
        try:
            while self.is_active and self.current_tick < self.GAME_DURATION_TICKS:
                self.current_tick += 1

                # 1) Tüm hisselerin fiyatlarını güncelle
                for stock in self.stocks.values():
                    stock.tick()

                # 2) Belirli aralıklarla yeni kart dağıt
                if self.current_tick % self.CARD_DEAL_INTERVAL == 0:
                    await self._deal_cards_to_all()

                # 3) Güncel durumu tüm oyunculara yayınla
                await self._broadcast_game_state()

                # 4) Tick aralığı kadar bekle
                await asyncio.sleep(self.TICK_INTERVAL)

            # Süre doldu → oyunu bitir
            if self.is_active:
                await self.end_game()

        except asyncio.CancelledError:
            pass  # Oyun dışarıdan durduruldu

    async def _broadcast_game_state(self):
        """Güncel oyun durumunu tüm oyunculara yayınlar."""
        if not self._broadcast_callback:
            return

        state = self.get_public_state()
        await self._broadcast_callback(self.room_code, {
            "type": "game_state",
            "state": state,
        })

        # Her oyuncuya kendi özel bilgilerini de gönder (el, ajanda)
        if self._send_to_player_callback:
            for player_id, player in self.players.items():
                await self._send_to_player_callback(player_id, {
                    "type": "player_state",
                    "player": player.to_dict(hide_agenda=False),
                })

    async def _deal_cards_to_all(self):
        """Tüm oyunculara yeni kart dağıtır."""
        for player in self.players.values():
            new_cards = generate_hand(self.CARDS_PER_ROUND)
            for card in new_cards:
                player.add_card(card)

        self._add_event("🃏", "Yeni kartlar dağıtıldı!")

    # ============================================================
    #  Oyuncu Aksiyonları
    # ============================================================

    async def handle_buy(self, player_id: str, stock_id: str, amount: int) -> dict:
        """Hisse alım emri işler."""
        player = self.players.get(player_id)
        if not player:
            return {"success": False, "error": "Oyuncu bulunamadı"}

        stock = self.stocks.get(stock_id)
        if not stock:
            return {"success": False, "error": "Hisse bulunamadı"}

        if stock.is_locked:
            return {"success": False, "error": f"{stock.name} şu an kilitli! İşlem yapılamaz."}

        if amount <= 0:
            return {"success": False, "error": "Geçersiz miktar"}

        if amount > 50:
            return {"success": False, "error": "Tek seferde en fazla 50 adet alınabilir"}

        success = player.buy_stock(stock_id, amount, stock.current_price)
        if not success:
            return {"success": False, "error": "Yetersiz bakiye!"}

        # Talep basıncını güncelle
        stock.apply_demand(amount, is_buy=True)

        total_cost = stock.current_price * amount
        self._add_event(
            stock.emoji,
            f"{player.player_name} → {amount}x {stock.name} aldı (₺{total_cost:,.2f})"
        )

        return {
            "success": True,
            "stock_id": stock_id,
            "amount": amount,
            "price": stock.current_price,
            "total_cost": total_cost,
            "remaining_cash": player.cash,
        }

    async def handle_sell(self, player_id: str, stock_id: str, amount: int) -> dict:
        """Hisse satım emri işler."""
        player = self.players.get(player_id)
        if not player:
            return {"success": False, "error": "Oyuncu bulunamadı"}

        stock = self.stocks.get(stock_id)
        if not stock:
            return {"success": False, "error": "Hisse bulunamadı"}

        if stock.is_locked:
            return {"success": False, "error": f"{stock.name} şu an kilitli! İşlem yapılamaz."}

        if amount <= 0:
            return {"success": False, "error": "Geçersiz miktar"}

        success = player.sell_stock(stock_id, amount, stock.current_price)
        if not success:
            return {"success": False, "error": "Yetersiz hisse!"}

        # Talep basıncını güncelle
        stock.apply_demand(amount, is_buy=False)

        total_revenue = stock.current_price * amount
        self._add_event(
            stock.emoji,
            f"{player.player_name} → {amount}x {stock.name} sattı (₺{total_revenue:,.2f})"
        )

        return {
            "success": True,
            "stock_id": stock_id,
            "amount": amount,
            "price": stock.current_price,
            "total_revenue": total_revenue,
            "remaining_cash": player.cash,
        }

    async def handle_play_card(self, player_id: str, card_id: str, target_stock_id: str) -> dict:
        """Kart oynama işlemi."""
        player = self.players.get(player_id)
        if not player:
            return {"success": False, "error": "Oyuncu bulunamadı"}

        stock = self.stocks.get(target_stock_id)
        if not stock:
            return {"success": False, "error": "Hedef hisse bulunamadı"}

        # Kartı elden çıkar
        card = player.remove_card(card_id)
        if not card:
            return {"success": False, "error": "Elinizde bu kart yok!"}

        # Kart efektini uygula
        if card.lock_duration > 0:
            stock.lock(card.lock_duration)

        if card.price_multiplier != 1.0:
            stock.apply_card_effect(
                effect_name=card.card_id,
                multiplier=card.price_multiplier,
                duration_ticks=card.effect_duration,
            )

        # Pump & Dump özel efekti: tersine çevirme
        if card.card_id == "pump_and_dump":
            # 2 tick sonra ters efekt ekle
            stock.apply_card_effect(
                effect_name="pump_dump_reverse",
                multiplier=0.80,
                duration_ticks=card.effect_duration + 2,
            )

        # Halka Arz özel efekti: ekstra talep basıncı
        if card.card_id == "halka_arz":
            stock.apply_demand(20, is_buy=True)

        # Anonim olay mesajı yayınla
        self._add_event(card.emoji, card.anonymous_message)

        # Herkese anonim bildir
        if self._broadcast_callback:
            await self._broadcast_callback(self.room_code, {
                "type": "card_played",
                "card": card.to_dict(),
                "target_stock": stock.stock_id,
                "anonymous_message": card.anonymous_message,
            })

        return {
            "success": True,
            "card_id": card_id,
            "target_stock": target_stock_id,
            "message": f"{card.name} kartı {stock.name} üzerine oynandı!",
        }

    # ============================================================
    #  Ajanda Kontrolü
    # ============================================================

    def _check_all_agendas(self):
        """Tüm oyuncuların ajandalarını kontrol eder."""
        sorted_stocks = sorted(
            self.stocks.values(),
            key=lambda s: s.current_price,
            reverse=True,
        )
        top_stock = sorted_stocks[0].stock_id if sorted_stocks else None
        bottom_stock = sorted_stocks[-1].stock_id if sorted_stocks else None

        for player in self.players.values():
            if not player.agenda:
                continue

            agenda = player.agenda
            target_id = agenda["target_stock"]
            target_stock = self.stocks.get(target_id)
            if not target_stock:
                continue

            agenda_type = agenda["type"]

            if agenda_type == "crash":
                player.agenda_completed = target_stock.current_price < target_stock.base_price * 0.70

            elif agenda_type == "moon":
                player.agenda_completed = target_stock.current_price > target_stock.base_price * 1.50

            elif agenda_type == "top1":
                player.agenda_completed = (target_id == top_stock)

            elif agenda_type == "bottom1":
                player.agenda_completed = (target_id == bottom_stock)

    # ============================================================
    #  Durum Sorgulama
    # ============================================================

    def get_public_state(self) -> dict:
        """Tüm oyunculara gönderilecek genel oyun durumu."""
        stock_prices = {sid: s.current_price for sid, s in self.stocks.items()}
        return {
            "current_tick": self.current_tick,
            "max_ticks": self.GAME_DURATION_TICKS,
            "time_remaining": max(0, (self.GAME_DURATION_TICKS - self.current_tick) * self.TICK_INTERVAL),
            "stocks": {sid: s.to_dict() for sid, s in self.stocks.items()},
            "players": {pid: p.to_public_dict() for pid, p in self.players.items()},
            "event_log": self.event_log[-8:],
            "is_active": self.is_active,
            "is_finished": self.is_finished,
        }

    def _get_results(self) -> dict:
        """Oyun sonu sonuç tablosu."""
        stock_prices = {sid: s.current_price for sid, s in self.stocks.items()}

        rankings = sorted(
            self.players.values(),
            key=lambda p: p.final_score,
            reverse=True,
        )

        return {
            "rankings": [
                {
                    "rank": i + 1,
                    "player_name": p.player_name,
                    "net_worth": p.get_net_worth(stock_prices),
                    "agenda_completed": p.agenda_completed,
                    "agenda_bonus": 5000.0 if p.agenda_completed else 0.0,
                    "final_score": p.final_score,
                }
                for i, p in enumerate(rankings)
            ],
            "stocks_final": {sid: s.to_dict() for sid, s in self.stocks.items()},
        }

    # ============================================================
    #  Yardımcı
    # ============================================================

    def _add_event(self, emoji: str, message: str):
        """Olay günlüğüne yeni event ekler."""
        self.event_log.append({
            "emoji": emoji,
            "message": message,
            "tick": self.current_tick,
        })
        # Günlük çok uzamasın
        if len(self.event_log) > 50:
            self.event_log.pop(0)
