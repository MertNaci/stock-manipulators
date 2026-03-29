/**
 * WebSocket Service — Gerçek zamanlı iletişim
 */

import type { WSMessage } from '../types/game';

type MessageHandler = (message: WSMessage) => void;

export class GameWebSocket {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private playerId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const defaultWsUrl = `${protocol}//${window.location.host}/ws`;
      const baseWsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
      const wsUrl = `${baseWsUrl}/${this.playerId}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🟢 WebSocket bağlandı');
        this.reconnectAttempts = 0;
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(message));
        } catch (err) {
          console.error('WS mesaj parse hatası:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔴 WebSocket kapandı:', event.code, event.reason);
        this.stopPing();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`🔄 Yeniden bağlanılıyor... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) ${delay}ms`);
          setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WS hata:', error);
        reject(error);
      };
    });
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  send(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendChat(message: string) {
    this.send({ type: 'chat', message });
  }

  sendStartGame() {
    this.send({ type: 'start_game' });
  }

  sendBuyStock(stockId: string, amount: number) {
    this.send({ type: 'buy_stock', stock_id: stockId, amount });
  }

  sendSellStock(stockId: string, amount: number) {
    this.send({ type: 'sell_stock', stock_id: stockId, amount });
  }

  sendPlayCard(cardId: string, targetStockId: string) {
    this.send({ type: 'play_card', card_id: cardId, target_stock_id: targetStockId });
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers = [];
  }
}
