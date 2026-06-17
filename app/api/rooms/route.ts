import { NextRequest, NextResponse } from "next/server";

interface RoomPlayer {
  id: number;
  name: string;
  isBot: boolean;
  role: "human" | "devil";
  isHost: boolean;
  lastActive?: number;
}

interface PendingAction {
  playerId: number;
  type: "use_item" | "shoot";
  itemId?: string;
  targetId?: number;
  timestamp: number;
}

interface RoomState {
  roomId: string;
  players: RoomPlayer[];
  status: "lobby" | "playing" | "ended";
  hostAuthoritativeState: any; 
  pendingActions: PendingAction[];
  lastUpdated: number;
}

// In-memory rooms repository (since it is a standalone development/test server)
const roomsCache = new Map<string, RoomState>();

// Periodically prune stale rooms (inactive for more than 1 hour)
function pruneStaleRooms() {
  const now = Date.now();
  for (const [roomId, room] of roomsCache.entries()) {
    if (now - room.lastUpdated > 3600000) {
      roomsCache.delete(roomId);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    pruneStaleRooms();
    const body = await req.json();
    const { action, roomId, playerName, playerId, gameState, guestAction } = body;

    // 1. CREATE ROOM
    if (action === "create") {
      let code = "";
      // Generate unique random 8 digit code
      do {
        code = Math.floor(10000000 + Math.random() * 90000000).toString();
      } while (roomsCache.has(code));

      const hostPlayer: RoomPlayer = {
        id: 0,
        name: playerName || "Host Survivor",
        isBot: false,
        role: "human",
        isHost: true,
      };

      const newRoom: RoomState = {
        roomId: code,
        players: [hostPlayer],
        status: "lobby",
        hostAuthoritativeState: null,
        pendingActions: [],
        lastUpdated: Date.now(),
      };

      roomsCache.set(code, newRoom);
      return NextResponse.json({ success: true, roomId: code, players: newRoom.players });
    }

    // 2. JOIN ROOM
    if (action === "join") {
      if (!roomId) {
        return NextResponse.json({ success: false, error: "Lobby code is required." }, { status: 400 });
      }
      const room = roomsCache.get(roomId);
      if (!room) {
        return NextResponse.json({ success: false, error: "The oak table with this code does not exist." }, { status: 404 });
      }

      if (room.status !== "lobby") {
        return NextResponse.json({ success: false, error: "The game has already commenced at this table." }, { status: 400 });
      }

      if (room.players.length >= 5) {
        return NextResponse.json({ success: false, error: "This chamber is already fully occupied (Max 5 players)." }, { status: 400 });
      }

      // Check for duplicate name
      const cleanName = (playerName || "").trim();
      if (!cleanName) {
        return NextResponse.json({ success: false, error: "The shadows reject an empty name. Proclaim yourself." }, { status: 400 });
      }
      const nameExists = room.players.some(p => p.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (nameExists) {
        return NextResponse.json({ success: false, error: "This survivor name has already been claimed at this table. Choose another name." }, { status: 400 });
      }

      const newPlayer: RoomPlayer = {
        id: room.players.length,
        name: cleanName,
        isBot: false,
        role: "human", // default, host will randomise when starting
        isHost: false,
        lastActive: Date.now(),
      };

      room.players.push(newPlayer);
      room.lastUpdated = Date.now();

      return NextResponse.json({
        success: true,
        roomId: room.roomId,
        playerId: newPlayer.id,
        players: room.players
      });
    }

    // 3. HOST AUTHORITATIVE SYNC (And fetch pending actions)
    if (action === "sync_state") {
      if (!roomId) return NextResponse.json({ success: false, error: "Room ID is required" }, { status: 400 });
      const room = roomsCache.get(roomId);
      if (!room) return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });

      // Host updates the state
      room.hostAuthoritativeState = gameState;
      room.status = gameState.gameState === "setup" ? "lobby" : "playing";
      room.lastUpdated = Date.now();

      // Update host connection heartbeat
      room.players = room.players.map(p => {
        if (p.id === 0) return { ...p, lastActive: Date.now() };
        return p;
      });

      // Retrieve guest pending actions and then drain the queue
      const actions = [...room.pendingActions];
      room.pendingActions = [];

      return NextResponse.json({
        success: true,
        players: room.players,
        pendingActions: actions,
      });
    }

    // 4. GUEST ACTIONS PUSH
    if (action === "guest_action") {
      if (!roomId || playerId === undefined || !guestAction) {
        return NextResponse.json({ success: false, error: "Invalid action payload" }, { status: 400 });
      }
      const room = roomsCache.get(roomId);
      if (!room) return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });

      // Update guest heartbeat on action
      room.players = room.players.map(p => {
        if (p.id === playerId) return { ...p, lastActive: Date.now() };
        return p;
      });

      const newAction: PendingAction = {
        playerId,
        type: guestAction.type,
        itemId: guestAction.itemId,
        targetId: guestAction.targetId,
        timestamp: Date.now(),
      };

      room.pendingActions.push(newAction);
      room.lastUpdated = Date.now();

      return NextResponse.json({ success: true });
    }

    // 5. GUEST STATE PULL
    if (action === "pull_state") {
      if (!roomId) return NextResponse.json({ success: false, error: "Room ID is required" }, { status: 400 });
      const room = roomsCache.get(roomId);
      if (!room) return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });

      // Update guest heartbeat on state pull
      room.players = room.players.map(p => {
        if (p.id === playerId) return { ...p, lastActive: Date.now() };
        return p;
      });

      let returnedGameState = room.hostAuthoritativeState;
      if (returnedGameState) {
        // Deep copy the game state to prevent unintended reference mutation in Cache
        const parsedState = JSON.parse(JSON.stringify(returnedGameState));
        
        if (parsedState.simPlayers) {
          parsedState.simPlayers = parsedState.simPlayers.map((p: any) => {
            const isMe = playerId !== undefined && p.id === playerId;
            const isExposed = p.isExposed;
            const isEnded = parsedState.gameState === "ended";

            if (isMe || isExposed || isEnded) {
              return p;
            } else {
              return {
                ...p,
                role: "hidden"
              };
            }
          });
        }

        // Mask peeking/phone secrets if it is NOT the requesting guest's turn
        const isMyTurn = playerId !== undefined && parsedState.turnIndex === playerId;
        if (!isMyTurn) {
          parsedState.peekingTopCard = null;
          parsedState.burnerPhoneMessage = null;
          parsedState.inspectedIndex = null;
        }

        returnedGameState = parsedState;
      }

      return NextResponse.json({
        success: true,
        status: room.status,
        players: room.players,
        gameState: returnedGameState
      });
    }

    return NextResponse.json({ success: false, error: "Action not recognized" }, { status: 400 });
  } catch (error: any) {
    console.error("Multiplayer rooms API crash:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
