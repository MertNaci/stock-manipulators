import { useState, useCallback } from 'react';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import { GameWebSocket } from './services/websocket';

type Screen = 'lobby' | 'game';

interface GameSession {
  roomCode: string;
  playerId: string;
  ws: GameWebSocket;
}

function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameSession, setGameSession] = useState<GameSession | null>(null);

  const handleGameStart = useCallback(
    (roomCode: string, playerId: string, ws: GameWebSocket) => {
      setGameSession({ roomCode, playerId, ws });
      setScreen('game');
    },
    [],
  );

  const handleBackToLobby = useCallback(() => {
    gameSession?.ws.disconnect();
    setGameSession(null);
    setScreen('lobby');
  }, [gameSession]);

  if (screen === 'game' && gameSession) {
    return (
      <GameBoard
        roomCode={gameSession.roomCode}
        playerId={gameSession.playerId}
        ws={gameSession.ws}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  return <Lobby onGameStart={handleGameStart} />;
}

export default App;
