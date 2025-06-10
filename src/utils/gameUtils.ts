import { GameBoard, GameState, Player } from '@/types/game';

export const checkWinner = (board: GameBoard): Player | 'draw' | null => {
  // Check rows
  for (let row = 0; row < 3; row++) {
    if (
      board[row][0] &&
      board[row][0] === board[row][1] &&
      board[row][0] === board[row][2]
    ) {
      return board[row][0];
    }
  }

  // Check columns
  for (let col = 0; col < 3; col++) {
    if (
      board[0][col] &&
      board[0][col] === board[1][col] &&
      board[0][col] === board[2][col]
    ) {
      return board[0][col];
    }
  }

  // Check diagonals
  if (
    board[0][0] &&
    board[0][0] === board[1][1] &&
    board[0][0] === board[2][2]
  ) {
    return board[0][0];
  }

  if (
    board[0][2] &&
    board[0][2] === board[1][1] &&
    board[0][2] === board[2][0]
  ) {
    return board[0][2];
  }

  // Check for draw
  const isDraw = board.every(row => row.every(cell => cell !== null));
  if (isDraw) return 'draw';

  return null;
};

export const makeMove = (gameState: GameState, row: number, col: number): GameState => {
  if (gameState.winner || gameState.board[row][col]) {
    return gameState;
  }

  const newBoard = gameState.board.map(r => [...r]);
  newBoard[row][col] = gameState.currentPlayer;

  const winner = checkWinner(newBoard);

  return {
    ...gameState,
    board: newBoard,
    currentPlayer: gameState.currentPlayer === 'X' ? 'O' : 'X',
    winner,
  };
};

export const generateGameId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};