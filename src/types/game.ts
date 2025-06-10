export type Player = 'X' | 'O';

export type GameBoard = (Player | null)[][];

export type GameState = {
  board: GameBoard;
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  gameId: string;
  players: {
    X: string | null;
    O: string | null;
  };
};

export type GameMove = {
  row: number;
  col: number;
  playerId: string;
  gameId: string;
};

export const INITIAL_BOARD: GameBoard = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

export const INITIAL_GAME_STATE: GameState = {
  board: INITIAL_BOARD,
  currentPlayer: 'X',
  winner: null,
  gameId: '',
  players: {
    X: null,
    O: null,
  },
};