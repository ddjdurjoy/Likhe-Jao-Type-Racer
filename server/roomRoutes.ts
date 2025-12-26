import type { Express } from "express";
import type {
  P2PRoom,
  CreateRoomRequest,
  JoinRoomRequest,
  RoomListResponse,
} from "@shared/schema";

// In-memory room storage (resets on server restart)
const rooms = new Map<string, P2PRoom>();

// Auto-cleanup timer
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > fiveMinutes) {
      rooms.delete(code);
    }
  }
}, 60 * 1000); // Clean up every minute

export function registerRoomRoutes(app: Express) {
  // Create a new room
  app.post("/api/rooms", (req, res) => {
    try {
      const { code, hostUsername, hostSignal } = req.body as CreateRoomRequest;

      if (!code || !hostUsername || !hostSignal) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (rooms.has(code)) {
        return res.status(409).json({ error: "Room code already exists" });
      }

      const room: P2PRoom = {
        code,
        hostUsername,
        hostSignal,
        createdAt: Date.now(),
        players: [hostUsername],
        guestSignals: [],
      };

      rooms.set(code, room);

      res.status(201).json(room);
    } catch (error) {
      console.error("Create room error:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  // Get all active rooms
  app.get("/api/rooms", (_req, res) => {
    try {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      const activeRooms: P2PRoom[] = [];

      for (const room of rooms.values()) {
        if (now - room.createdAt < fiveMinutes) {
          activeRooms.push(room);
        }
      }

      const response: RoomListResponse = { rooms: activeRooms };
      res.json(response);
    } catch (error) {
      console.error("Get rooms error:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  // Get a specific room by code
  app.get("/api/rooms/:code", (req, res) => {
    try {
      const { code } = req.params;
      const room = rooms.get(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - room.createdAt > fiveMinutes) {
        rooms.delete(code.toUpperCase());
        return res.status(404).json({ error: "Room expired" });
      }

      res.json(room);
    } catch (error) {
      console.error("Get room error:", error);
      res.status(500).json({ error: "Failed to fetch room" });
    }
  });

  // Join a room (guest adds their signal)
  app.post("/api/rooms/:code/join", (req, res) => {
    try {
      const { code } = req.params;
      const { username, guestSignal } = req.body as JoinRoomRequest;

      if (!username || !guestSignal) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const room = rooms.get(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - room.createdAt > fiveMinutes) {
        rooms.delete(code.toUpperCase());
        return res.status(404).json({ error: "Room expired" });
      }

      if (room.players.length >= 4) {
        return res.status(400).json({ error: "Room is full" });
      }

      // Add player and their signal
      room.players.push(username);
      room.guestSignals.push({ username, signal: guestSignal });

      res.json(room);
    } catch (error) {
      console.error("Join room error:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });
}
