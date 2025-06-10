'use client';

import { GameBoard } from '@/components/GameBoard';
import { useGame } from '@/hooks/useGame';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [gameId, setGameId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const { gameState, error, isConnected, makeMove, createGame } = useGame(
    gameId,
    playerId
  );

  useEffect(() => {
    // Check for game ID in URL when component mounts
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('gameId');
    if (id) {
      setGameId(id);
      // Update URL with game ID
      window.history.replaceState({}, '', `?gameId=${id}`);
    }
  }, []);

  const handleCreateGame = async () => {
    const newGameId = await createGame();
    if (newGameId) {
      setGameId(newGameId);
      // Update URL with game ID
      window.history.pushState({}, '', `?gameId=${newGameId}`);
    }
  };

  const handleJoinGame = () => {
    const id = prompt('Enter game ID:');
    if (id) {
      setGameId(id);
      window.history.pushState({}, '', `?gameId=${id}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const canStartGame = gameState.players.X && gameState.players.O;
  const playerSymbol = gameState.players.X === playerId ? 'X' : 'O';
  const isPlayer = gameState.players.X === playerId || gameState.players.O === playerId;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8 relative">
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            Game link copied successfully!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Multiplayer Tic-Tac-Toe
        </h1>

        {!gameId ? (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleCreateGame}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create New Game
            </button>
            <button
              onClick={handleJoinGame}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Join Game
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
                <p className="text-lg font-semibold text-gray-800">Game ID: <span className="text-blue-600">{gameId}</span></p>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Copy Game Link
              </button>
            </div>

            {error ? (
              <div className="text-red-500 bg-red-50 p-4 rounded-lg">
                {error}
              </div>
            ) : !isConnected ? (
              <div className="text-blue-500 bg-blue-50 p-4 rounded-lg">
                Connecting to game...
              </div>
            ) : !isPlayer ? (
              <div className="text-yellow-500 bg-yellow-50 p-4 rounded-lg">
                Waiting to join game...
              </div>
            ) : !canStartGame ? (
              <div className="text-blue-500 bg-blue-50 p-4 rounded-lg">
                Waiting for opponent to join...
              </div>
            ) : (
              <div className="text-green-500 bg-green-50 p-4 rounded-lg">
                Game in progress - You are {playerSymbol}
              </div>
            )}

            <GameBoard
              gameState={gameState}
              playerId={playerId}
              onMove={makeMove}
            />
          </div>
        )}
      </div>
    </main>
  );
}
