'use client';

import { GameState } from '@/types/game';
import { motion, AnimatePresence } from 'framer-motion';

interface GameBoardProps {
  gameState: GameState;
  onMove: (row: number, col: number) => void;
  playerId: string;
}

export const GameBoard = ({ gameState, onMove, playerId }: GameBoardProps) => {
  const isMyTurn =
    (gameState.players.X === playerId && gameState.currentPlayer === 'X') ||
    (gameState.players.O === playerId && gameState.currentPlayer === 'O');

  const getCellContent = (value: string | null) => {
    if (!value) return null;

    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`text-4xl font-bold ${value === 'X' ? 'text-blue-500' : 'text-red-500'}`}
      >
        {value}
      </motion.div>
    );
  };

  const getGameStatus = () => {
    if (gameState.winner) {
      const isWinner = 
        (gameState.winner === 'X' && gameState.players.X === playerId) ||
        (gameState.winner === 'O' && gameState.players.O === playerId);
      
      return {
        message: gameState.winner === 'draw' 
          ? "It's a draw!" 
          : isWinner 
            ? 'You won!' 
            : 'Opponent won!',
        color: gameState.winner === 'draw' 
          ? 'text-gray-700' 
          : isWinner 
            ? 'text-green-500' 
            : 'text-red-500'
      };
    }

    return {
      message: isMyTurn ? "It's your turn!" : "Opponent's turn...",
      color: isMyTurn ? 'text-blue-600' : 'text-gray-600'
    };
  };

  const status = getGameStatus();

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div 
        initial={false}
        animate={{ scale: isMyTurn ? 1.05 : 1 }}
        transition={{ duration: 0.5, repeat: isMyTurn ? Infinity : 0, repeatType: "reverse" }}
        className={`text-xl font-semibold mb-2 ${status.color}`}
      >
        {status.message}
      </motion.div>

      <div className="grid grid-cols-3 gap-2 p-4 bg-white rounded-lg shadow-lg">
        {gameState.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <motion.button
              key={`${rowIndex}-${colIndex}`}
              whileHover={!cell && isMyTurn ? { scale: 1.05 } : {}}
              whileTap={!cell && isMyTurn ? { scale: 0.95 } : {}}
              onClick={() => isMyTurn && !cell && onMove(rowIndex, colIndex)}
              className={`w-24 h-24 flex items-center justify-center border-2 rounded-md
                ${!cell && isMyTurn ? 'hover:bg-gray-50 cursor-pointer border-blue-200' : ''}
                ${cell ? 'cursor-not-allowed' : ''}
                ${!isMyTurn ? 'cursor-not-allowed opacity-80' : ''}
                ${gameState.winner ? 'border-gray-200' : ''}
              `}
              disabled={!isMyTurn || !!cell || !!gameState.winner}
            >
              {getCellContent(cell)}
            </motion.button>
          ))
        )}
      </div>

      <AnimatePresence>
        {gameState.winner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4"
          >
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Start New Game
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};