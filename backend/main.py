"""
Borsa Manipülatörleri - Backend Server
=======================================
FastAPI + WebSocket tabanlı gerçek zamanlı çok oyunculu oyun sunucusu.

ADIM 1: Temel altyapı — Oda yönetimi, WebSocket bağlantıları
ADIM 2: Oyun mantığı — GameRoom, Stock, Card, Player entegrasyonu
"""

import json
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Set, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import GameRoom


# ============================================================
#  FastAPI Uygulama Başlatma
# ============================================================

app = FastAPI(
    title="Borsa Manipülatörleri",
    description="Gerçek zamanlı çok oyunculu borsa manipülasyon oyunu",
    version="0.1.0",
)

# CORS — Frontend her yerden bağlanabilsin (geliştirme aşaması)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#  Veri Modelleri (Pydantic)
# ============================================================

class CreateRoomRequest(BaseModel):
    player_name: str


class JoinRoomRequest(BaseModel):
    room_code: str
    player_name: str


# ============================================================
#  In-Memory Veri Yapıları
# ============================================================

class PlayerConnection:
    """Bir oyuncunun bağlantı bilgilerini tutar."""

    def __init__(self, player_id: str, player_name: str, websocket: Optional[WebSocket] = None):
        self.player_id = player_id
        self.player_name = player_name
        self.websocket = websocket
        self.is_connected = False

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "player_name": self.player_name,
            "is_connected": self.is_connected,
        }


class Room:
    """Bir oyun odasını temsil eder."""

    MAX_PLAYERS = 6
    MIN_PLAYERS = 2

    def __init__(self, room_code: str, host_id: str):
        self.room_code = room_code
        self.host_id = host_id
        self.players: Dict[str, PlayerConnection] = {}
        self.created_at = datetime.utcnow().isoformat()
        self.game_started = False
        self.game_state = None  # ADIM 2'de doldurulacak

    @property
    def player_count(self) -> int:
        return len(self.players)

    @property
    def is_full(self) -> bool:
        return self.player_count >= self.MAX_PLAYERS

    def add_player(self, player: PlayerConnection) -> bool:
        """Odaya oyuncu ekler. Başarılıysa True döner."""
        if self.is_full:
            return False
        if self.game_started:
            return False
        self.players[player.player_id] = player
        return True

    def remove_player(self, player_id: str) -> bool:
        """Odadan oyuncu çıkarır."""
        if player_id in self.players:
            del self.players[player_id]
            # Host ayrılırsa, varsa ilk oyuncuyu yeni host yap
            if player_id == self.host_id and self.players:
                self.host_id = next(iter(self.players))
            return True
        return False

    def to_dict(self) -> dict:
        return {
            "room_code": self.room_code,
            "host_id": self.host_id,
            "players": [p.to_dict() for p in self.players.values()],
            "player_count": self.player_count,
            "max_players": self.MAX_PLAYERS,
            "game_started": self.game_started,
            "created_at": self.created_at,
        }


# ============================================================
#  Connection Manager — WebSocket Bağlantı Yöneticisi
# ============================================================

class ConnectionManager:
    """
    Tüm WebSocket bağlantılarını ve odaları yönetir.

    Sorumlulukları:
    - Oda oluşturma / silme
    - Oyuncu bağlantılarını kaydetme / koparma
    - Oda bazlı mesaj yayınlama (broadcast)
    - Belirli bir oyuncuya mesaj gönderme (unicast)
    """

    def __init__(self):
        # room_code -> Room
        self.rooms: Dict[str, Room] = {}
        # player_id -> room_code (hızlı lookup)
        self.player_room_map: Dict[str, str] = {}

    # ---------- Oda İşlemleri ----------

    def generate_room_code(self) -> str:
        """6 karakterlik benzersiz oda kodu üretir."""
        while True:
            code = uuid.uuid4().hex[:6].upper()
            if code not in self.rooms:
                return code

    def create_room(self, player_name: str) -> tuple[Room, PlayerConnection]:
        """Yeni oda oluşturur ve host oyuncuyu ekler."""
        room_code = self.generate_room_code()
        player_id = uuid.uuid4().hex[:8]

        player = PlayerConnection(player_id=player_id, player_name=player_name)
        room = Room(room_code=room_code, host_id=player_id)
        room.add_player(player)

        self.rooms[room_code] = room
        self.player_room_map[player_id] = room_code

        return room, player

    def join_room(self, room_code: str, player_name: str) -> tuple[Room, PlayerConnection]:
        """Mevcut bir odaya katılır. Hata durumunda exception fırlatır."""
        room_code = room_code.upper()

        if room_code not in self.rooms:
            raise ValueError("Oda bulunamadı!")

        room = self.rooms[room_code]

        if room.is_full:
            raise ValueError("Oda dolu!")

        if room.game_started:
            raise ValueError("Oyun zaten başlamış!")

        # Aynı isimde oyuncu var mı kontrol et
        for p in room.players.values():
            if p.player_name.lower() == player_name.lower():
                raise ValueError("Bu isim zaten kullanılıyor!")

        player_id = uuid.uuid4().hex[:8]
        player = PlayerConnection(player_id=player_id, player_name=player_name)
        room.add_player(player)
        self.player_room_map[player_id] = room_code

        return room, player

    def get_room(self, room_code: str) -> Optional[Room]:
        return self.rooms.get(room_code.upper())

    # ---------- WebSocket İşlemleri ----------

    async def connect_ws(self, websocket: WebSocket, player_id: str) -> Optional[Room]:
        """
        WebSocket bağlantısını kabul eder ve oyuncuyu ilgili odada aktif hale getirir.
        """
        await websocket.accept()

        room_code = self.player_room_map.get(player_id)
        if not room_code or room_code not in self.rooms:
            await websocket.close(code=4001, reason="Geçersiz oyuncu veya oda")
            return None

        room = self.rooms[room_code]
        player = room.players.get(player_id)
        if not player:
            await websocket.close(code=4002, reason="Oyuncu odada bulunamadı")
            return None

        player.websocket = websocket
        player.is_connected = True

        return room

    async def disconnect_ws(self, player_id: str):
        """Oyuncunun WebSocket bağlantısını koparır ve odayı günceller."""
        room_code = self.player_room_map.get(player_id)
        if not room_code or room_code not in self.rooms:
            return

        room = self.rooms[room_code]
        player = room.players.get(player_id)

        if player:
            player.websocket = None
            player.is_connected = False

        # Oyun başladıysa oyuncuyu odadan ÇIKARMA (reconnect edebilir)
        if room.game_started:
            print(f"⚠️  Oyuncu bağlantısı koptu (oyun devam ediyor): {player.player_name if player else player_id}")
            return

        # Lobideyken: oyuncuyu odadan çıkar
        room.remove_player(player_id)
        self.player_room_map.pop(player_id, None)

        # Oda boşaldıysa sil
        if room.player_count == 0:
            del self.rooms[room_code]
            print(f"🗑️  Oda silindi: {room_code}")
        else:
            # Kalan oyunculara bildir
            await self.broadcast_to_room(room_code, {
                "type": "player_left",
                "player_name": player.player_name if player else "Bilinmeyen",
                "room": room.to_dict(),
            })

    async def broadcast_to_room(self, room_code: str, message: dict):
        """Odadaki TÜM bağlı oyunculara mesaj gönderir."""
        room = self.rooms.get(room_code)
        if not room:
            return

        data = json.dumps(message, ensure_ascii=False)
        disconnected = []

        for player_id, player in room.players.items():
            if player.websocket and player.is_connected:
                try:
                    await player.websocket.send_text(data)
                except Exception:
                    disconnected.append(player_id)

        # Bağlantısı kopanları temizle
        for pid in disconnected:
            await self.disconnect_ws(pid)

    async def send_to_player(self, player_id: str, message: dict):
        """Belirli bir oyuncuya mesaj gönderir."""
        room_code = self.player_room_map.get(player_id)
        if not room_code or room_code not in self.rooms:
            return

        room = self.rooms[room_code]
        player = room.players.get(player_id)

        if player and player.websocket and player.is_connected:
            try:
                data = json.dumps(message, ensure_ascii=False)
                await player.websocket.send_text(data)
            except Exception:
                await self.disconnect_ws(player_id)


# Tek global ConnectionManager instance
manager = ConnectionManager()


# ============================================================
#  REST API Endpoint'leri
# ============================================================

@app.get("/")
async def root():
    """Sağlık kontrolü (health check)."""
    return {
        "game": "Borsa Manipülatörleri",
        "version": "0.1.0",
        "status": "online",
        "active_rooms": len(manager.rooms),
    }


@app.post("/api/rooms/create")
async def create_room(request: CreateRoomRequest):
    """Yeni bir oyun odası oluşturur."""
    if not request.player_name.strip():
        raise HTTPException(status_code=400, detail="Oyuncu adı boş olamaz!")

    if len(request.player_name) > 20:
        raise HTTPException(status_code=400, detail="Oyuncu adı en fazla 20 karakter olabilir!")

    room, player = manager.create_room(request.player_name.strip())

    return {
        "success": True,
        "room_code": room.room_code,
        "player_id": player.player_id,
        "room": room.to_dict(),
    }


@app.post("/api/rooms/join")
async def join_room(request: JoinRoomRequest):
    """Mevcut bir odaya katılır."""
    if not request.player_name.strip():
        raise HTTPException(status_code=400, detail="Oyuncu adı boş olamaz!")

    if not request.room_code.strip():
        raise HTTPException(status_code=400, detail="Oda kodu boş olamaz!")

    if len(request.player_name) > 20:
        raise HTTPException(status_code=400, detail="Oyuncu adı en fazla 20 karakter olabilir!")

    try:
        room, player = manager.join_room(
            room_code=request.room_code.strip(),
            player_name=request.player_name.strip(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "success": True,
        "room_code": room.room_code,
        "player_id": player.player_id,
        "room": room.to_dict(),
    }


@app.get("/api/rooms/{room_code}")
async def get_room(room_code: str):
    """Bir odanın güncel bilgilerini döner."""
    room = manager.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Oda bulunamadı!")

    return {"success": True, "room": room.to_dict()}


# ============================================================
#  WebSocket Endpoint
# ============================================================

@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    """
    Ana WebSocket endpoint'i.
    Oyuncu oda oluşturup/katıldıktan sonra bu endpoint üzerinden
    gerçek zamanlı iletişim kurar.
    """
    room = await manager.connect_ws(websocket, player_id)
    if not room:
        return

    # Odadaki herkese yeni oyuncunun katıldığını bildir
    player = room.players.get(player_id)
    await manager.broadcast_to_room(room.room_code, {
        "type": "player_joined",
        "player_name": player.player_name if player else "Bilinmeyen",
        "room": room.to_dict(),
    })

    print(f"✅ Bağlandı: {player.player_name} -> Oda {room.room_code}")

    try:
        while True:
            # İstemciden gelen mesajları dinle
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type", "")

            # --- Mesaj Tipleri ---
            if msg_type == "chat":
                # Lobide sohbet mesajı
                await manager.broadcast_to_room(room.room_code, {
                    "type": "chat",
                    "player_name": player.player_name,
                    "message": data.get("message", ""),
                })

            elif msg_type == "start_game":
                # Sadece host oyunu başlatabilir
                if player_id != room.host_id:
                    await manager.send_to_player(player_id, {
                        "type": "error",
                        "message": "Sadece oda sahibi oyunu başlatabilir!",
                    })
                    continue

                if room.player_count < Room.MIN_PLAYERS:
                    await manager.send_to_player(player_id, {
                        "type": "error",
                        "message": f"Oyun başlatmak için en az {Room.MIN_PLAYERS} oyuncu gerekli!",
                    })
                    continue

                # GameRoom oluştur ve oyun döngüsünü başlat
                game = GameRoom(room_code=room.room_code)
                game.set_callbacks(
                    broadcast=manager.broadcast_to_room,
                    send_to_player=manager.send_to_player,
                )

                # Oyuncuları GameRoom'a aktar
                player_list = [
                    (pid, pc.player_name)
                    for pid, pc in room.players.items()
                ]
                game.initialize_players(player_list)

                room.game_state = game
                room.game_started = True

                await manager.broadcast_to_room(room.room_code, {
                    "type": "game_started",
                    "room": room.to_dict(),
                    "message": "🚀 Oyun başladı! Borsa açılıyor...",
                })
                print(f"🎮 Oyun başladı: Oda {room.room_code}")

                # Oyun döngüsünü arka planda başlat (mesaj dinlemeyi bloklamaz)
                asyncio.create_task(game.start_game())

            # --- Oyun İçi Aksiyonlar ---

            elif msg_type == "buy_stock":
                game = room.game_state
                if not game or not game.is_active:
                    await manager.send_to_player(player_id, {
                        "type": "error",
                        "message": "Oyun henüz başlamadı!",
                    })
                    continue

                result = await game.handle_buy(
                    player_id=player_id,
                    stock_id=data.get("stock_id", ""),
                    amount=int(data.get("amount", 0)),
                )
                await manager.send_to_player(player_id, {
                    "type": "trade_result",
                    "action": "buy",
                    **result,
                })

            elif msg_type == "sell_stock":
                game = room.game_state
                if not game or not game.is_active:
                    await manager.send_to_player(player_id, {
                        "type": "error",
                        "message": "Oyun henüz başlamadı!",
                    })
                    continue

                result = await game.handle_sell(
                    player_id=player_id,
                    stock_id=data.get("stock_id", ""),
                    amount=int(data.get("amount", 0)),
                )
                await manager.send_to_player(player_id, {
                    "type": "trade_result",
                    "action": "sell",
                    **result,
                })

            elif msg_type == "play_card":
                game = room.game_state
                if not game or not game.is_active:
                    await manager.send_to_player(player_id, {
                        "type": "error",
                        "message": "Oyun henüz başlamadı!",
                    })
                    continue

                result = await game.handle_play_card(
                    player_id=player_id,
                    card_id=data.get("card_id", ""),
                    target_stock_id=data.get("target_stock_id", ""),
                )
                await manager.send_to_player(player_id, {
                    "type": "card_result",
                    **result,
                })

            elif msg_type == "ping":
                # Bağlantı canlı mı kontrolü
                await manager.send_to_player(player_id, {"type": "pong"})

            else:
                await manager.send_to_player(player_id, {
                    "type": "error",
                    "message": f"Bilinmeyen mesaj tipi: {msg_type}",
                })

    except WebSocketDisconnect:
        print(f"❌ Bağlantı koptu: {player.player_name} -> Oda {room.room_code}")
        await manager.disconnect_ws(player_id)
    except Exception as e:
        print(f"⚠️  Hata ({player.player_name}): {e}")
        await manager.disconnect_ws(player_id)


# ============================================================
#  Sunucu Başlatma
# ============================================================

if __name__ == "__main__":
    import uvicorn
    import os

    print("=" * 50)
    print("  🎰 BORSA MANİPÜLATÖRLERİ - Sunucu Başlıyor")
    print("=" * 50)

    # Bulut sunucusu (örn. Render, Heroku) dinamik port atayacağı için:
    port = int(os.environ.get("PORT", 8000))
    is_prod = os.environ.get("ENV") == "production"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_prod,  # Üretimde reload kapalı
        log_level="info",
    )
