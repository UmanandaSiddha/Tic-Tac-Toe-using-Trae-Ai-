import { GameMove, GameState, INITIAL_GAME_STATE } from '@/types/game';
import { useEffect, useState, useCallback } from 'react';

export const useGame = (gameId: string | null, playerId: string) => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  const connectToGame = useCallback(() => {
    if (!gameId) return null;

    // Clear any existing retry timeout
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }

    const eventSource = new EventSource(
      `/api/game?gameId=${gameId}&playerId=${playerId}`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      setRetryCount(0);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        setRetryTimeout(null);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      
      if (retryCount < 3) {
        setError('Connecting to game...');
        setRetryCount(prev => prev + 1);
        
        // Schedule retry with exponential backoff
        const timeout = setTimeout(() => {
          connectToGame();
        }, Math.min(1000 * Math.pow(2, retryCount), 5000));
        
        setRetryTimeout(timeout);
      } else {
        setError('Unable to connect to game. Please refresh the page to try again.');
      }
    };

    eventSource.addEventListener('gameState', (event) => {
      try {
        const data = JSON.parse(event.data);
        setGameState(data);
        setError(null);
        setRetryCount(0); // Reset retry count on successful game state
      } catch (err) {
        setError('Error processing game state');
      }
    });

    eventSource.addEventListener('playerJoined', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Player joined:', data);
        setError(null);
        setRetryCount(0); // Reset retry count on successful player join
      } catch (err) {
        setError('Error processing player join event');
      }
    });

    return eventSource;
  }, [gameId, playerId, retryCount, retryTimeout]);

  useEffect(() => {
    const eventSource = connectToGame();
    
    return () => {
      if (eventSource) {
        eventSource.close();
        setIsConnected(false);
      }
      // Clear any pending retry timeout
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        setRetryTimeout(null);
      }
    };
  }, [connectToGame, retryTimeout]);

  const makeMove = async (row: number, col: number) => {
    if (!gameId) return;

    // Validate if it's the player's turn before making the request
    const isPlayerX = gameState.players.X === playerId;
    const isPlayerO = gameState.players.O === playerId;
    const isPlayerTurn = 
      (isPlayerX && gameState.currentPlayer === 'X') ||
      (isPlayerO && gameState.currentPlayer === 'O');

    if (!isPlayerTurn) {
      setError("It's not your turn");
      return;
    }

    try {
      const move: GameMove = {
        row,
        col,
        playerId,
        gameId,
      };

      const response = await fetch('/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(move),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText);
        return;
      }

      const updatedGame = await response.json();
      setGameState(updatedGame);
      setError(null);
    } catch (error) {
      setError('Failed to make move');
    }
  };

  const createGame = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const data = await response.json();
      setGameState(data.game);
      setError(null);
      return data.gameId;
    } catch (error) {
      setError('Failed to create game');
      return null;
    }
  };

  return {
    gameState,
    error,
    isConnected,
    makeMove,
    createGame,
  };
};