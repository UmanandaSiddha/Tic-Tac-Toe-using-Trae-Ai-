import { GameMove, GameState, INITIAL_GAME_STATE } from '@/types/game';
import { generateGameId, makeMove } from '@/utils/gameUtils';
import { NextRequest } from 'next/server';

const games = new Map<string, GameState>();
const connections = new Map<string, Set<ReadableStreamController<Uint8Array>>>();
const playerConnections = new Map<string, string>(); // Track which game a player is connected to

function sendEventToClients(gameId: string, event: string, data: unknown) {
  const gameConnections = connections.get(gameId);
  if (gameConnections) {
    const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const deadConnections = new Set<ReadableStreamController<Uint8Array>>();

    gameConnections.forEach((controller) => {
      try {
        if (controller.desiredSize !== null) {
          controller.enqueue(new TextEncoder().encode(eventData));
        } else {
          deadConnections.add(controller);
        }
      } catch (error) {
        console.error('Error sending event to client:', error);
        deadConnections.add(controller);
      }
    });

    // Cleanup dead connections
    deadConnections.forEach(controller => {
      gameConnections.delete(controller);
    });
  }
}

function cleanupPlayerConnection(playerId: string, gameId: string) {
  const gameConnections = connections.get(gameId);
  if (gameConnections) {
    // Remove player from connections
    playerConnections.delete(playerId);
    
    // Update game state to mark player as disconnected
    const game = games.get(gameId);
    if (game) {
      if (game.players.X === playerId) {
        game.players.X = null;
      } else if (game.players.O === playerId) {
        game.players.O = null;
      }
      games.set(gameId, game);
      
      // Notify other players about disconnection
      try {
        sendEventToClients(gameId, 'playerDisconnected', { playerId });
        sendEventToClients(gameId, 'gameState', game);
      } catch (error) {
        console.error('Error notifying about player disconnection:', error);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get('gameId');
  const playerId = searchParams.get('playerId');

  if (!gameId || !playerId) {
    return new Response('Missing gameId or playerId', { status: 400 });
  }

  // Check if player is already connected to a different game
  const existingGameId = playerConnections.get(playerId);
  if (existingGameId && existingGameId !== gameId) {
    return new Response('Player already connected to a different game', { status: 400 });
  }

  let game = games.get(gameId);
  if (!game) {
    // Create a new game if it doesn't exist
    game = { ...INITIAL_GAME_STATE };
    games.set(gameId, game);
    connections.set(gameId, new Set());
  }

  // Initialize connections for this game if not exists
  if (!connections.has(gameId)) {
    connections.set(gameId, new Set());
  }

  // Handle player assignment and reconnection
  if (!game.players.X && !game.players.O) {
    // First player gets X
    game.players.X = playerId;
    games.set(gameId, game);
    playerConnections.set(playerId, gameId);
    try {
      sendEventToClients(gameId, 'gameState', game);
      sendEventToClients(gameId, 'playerJoined', { player: 'X', playerId });
    } catch (error) {
      console.error('Error sending initial player X events:', error);
    }
  } else if (!game.players.O && playerId !== game.players.X) {
    // Second player gets O
    game.players.O = playerId;
    games.set(gameId, game);
    playerConnections.set(playerId, gameId);
    try {
      sendEventToClients(gameId, 'playerJoined', { player: 'O', playerId });
      sendEventToClients(gameId, 'gameState', game);
    } catch (error) {
      console.error('Error sending initial player O events:', error);
    }
  } else if (playerId === game.players.X || playerId === game.players.O) {
    // Player reconnecting
    playerConnections.set(playerId, gameId);
    try {
      sendEventToClients(gameId, 'playerJoined', { 
        player: playerId === game.players.X ? 'X' : 'O', 
        playerId 
      });
    } catch (error) {
      console.error('Error sending reconnection event:', error);
    }
  } else {
    return new Response('Game is full', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the game's connections
      const gameConnections = connections.get(gameId);
      if (gameConnections) {
        gameConnections.add(controller);
      }

      // Send initial game state
      try {
        if (controller.desiredSize !== null) {
          controller.enqueue(
            encoder.encode(`event: gameState\ndata: ${JSON.stringify(game)}\n\n`)
          );
        }
      } catch (error) {
        console.error('Error sending initial game state:', error);
      }
    },
    cancel(controller) {
      try {
        // Cleanup player connection
        cleanupPlayerConnection(playerId, gameId);

        const gameConnections = connections.get(gameId);
        if (gameConnections) {
          // Remove this controller from the connections
          gameConnections.delete(controller);

          // If no more connections, check if we should cleanup the game
          if (gameConnections.size === 0) {
            const game = games.get(gameId);
            if (game && !game.players.X && !game.players.O) {
              connections.delete(gameId);
              games.delete(gameId);
            }
          }
        }
      } catch (error) {
        console.error('Error during connection cleanup:', error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  const move: GameMove = await request.json();
  const game = games.get(move.gameId);

  if (!game) {
    return new Response('Game not found', { status: 404 });
  }

  if (game.winner) {
    return new Response('Game is already finished', { status: 400 });
  }

  // Validate that it's the player's turn
  const isPlayerX = game.players.X === move.playerId;
  const isPlayerO = game.players.O === move.playerId;
  const isPlayerTurn =
    (isPlayerX && game.currentPlayer === 'X') ||
    (isPlayerO && game.currentPlayer === 'O');

  if (!isPlayerTurn) {
    return new Response('Not your turn', { status: 400 });
  }

  // Validate that the cell is empty
  if (game.board[move.row][move.col] !== null) {
    return new Response('Cell is already occupied', { status: 400 });
  }

  const updatedGame = makeMove(game, move.row, move.col);
  games.set(move.gameId, updatedGame);
  try {
    sendEventToClients(move.gameId, 'gameState', updatedGame);
  } catch (error) {
    console.error('Error sending game state update:', error);
  }

  return new Response(JSON.stringify(updatedGame));
}

export async function PUT() {
  const gameId = generateGameId();
  const game = { ...INITIAL_GAME_STATE };
  games.set(gameId, game);
  connections.set(gameId, new Set());

  return new Response(JSON.stringify({ gameId, game }));
}