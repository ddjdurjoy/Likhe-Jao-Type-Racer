import { Server as HTTPServer } from "http";
import { Server } from "socket.io";

interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
  ready: boolean;
}

interface RoomState {
  code: string;
  hostId: string;
  players: PlayerInfo[];
  max: number;
  status: "waiting" | "countdown" | "racing" | "finished";
  isPublic?: boolean;
}

const rooms = new Map<string, RoomState>();
let currentPublicLobbyCode: string | null = null;

function makeCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function createPublicLobby(): RoomState {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();
  const lobby: RoomState = {
    code,
    hostId: "",
    players: [],
    max: 5,
    status: "waiting",
    isPublic: true,
  };
  (lobby as any).createdAt = Date.now();
  rooms.set(code, lobby);
  currentPublicLobbyCode = code;
  return lobby;
}

function getOrCreatePublicLobby(): RoomState {
  if (currentPublicLobbyCode) {
    const r = rooms.get(currentPublicLobbyCode);
    if (r && r.status === "waiting") return r;
  }
  return createPublicLobby();
}

export function setupSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: [
        "https://likhe-jao.vercel.app",
        "https://*.vercel.app",
        "http://localhost:5000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;

    function emitRoom() {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room) io.to(currentRoom).emit("room:update", room);
    }

    socket.on("queue:joinPublic", ({ name, avatar }: { name: string; avatar?: string }) => {
      const lobby = getOrCreatePublicLobby();
      socket.join(lobby.code);
      currentRoom = lobby.code;
      
      const existing = lobby.players.find(p => p.id === socket.id);
      if (!existing) {
        lobby.players.push({ id: socket.id, name, avatar, ready: false });
        // First player becomes host
        if (!lobby.hostId) {
          lobby.hostId = socket.id;
          (lobby as any).createdAt = Date.now();
        }
      }

      socket.emit("room:joined", lobby);
      emitRoom();

      // Auto-start when full with real players
      const realPlayers = lobby.players.filter(p => !String(p.id).startsWith("bot-"));
      if (lobby.status === "waiting" && realPlayers.length >= lobby.max) {
        lobby.status = "countdown";
        emitRoom();
        io.to(lobby.code).emit("race:countdown", { from: 3 });
        setTimeout(() => {
          lobby.status = "racing";
          emitRoom();
          io.to(lobby.code).emit("race:start");
          // Create fresh public lobby for next players
          createPublicLobby();
        }, 3000);
      }
    });

    socket.on("room:create", ({ name, avatar, isPublic }: { name: string; avatar?: string; isPublic?: boolean }) => {
      let code = makeCode();
      while (rooms.has(code)) code = makeCode();
      const state: RoomState = {
        code,
        hostId: socket.id,
        players: [{ id: socket.id, name, avatar, ready: false }],
        max: 5,
        status: "waiting",
        isPublic: !!isPublic,
      };
      rooms.set(code, state);
      socket.join(code);
      currentRoom = code;
      socket.emit("room:created", state);
      emitRoom();
    });

    socket.on("room:join", ({ code, name, avatar }: { code: string; name: string; avatar?: string }) => {
      const room = rooms.get(code);
      if (!room) return socket.emit("room:error", { message: "Room not found" });
      if (room.players.length >= room.max) return socket.emit("room:error", { message: "Room full" });
      if (room.status !== "waiting") return socket.emit("room:error", { message: "Race already started" });
      room.players.push({ id: socket.id, name, avatar, ready: false });
      socket.join(code);
      currentRoom = code;
      socket.emit("room:joined", room);
      emitRoom();
      // Auto-start ONLY when full with real players (no bots)
      if (room.status === "waiting" && room.players.length >= room.max) {
        const allReal = room.players.every((p) => !String(p.id).startsWith("bot-"));
        if (allReal) {
          room.status = "countdown";
          emitRoom();
          io.to(currentRoom).emit("race:countdown", { from: 3 });
          setTimeout(() => {
            room.status = "racing";
            emitRoom();
            io.to(currentRoom!).emit("race:start");
          }, 3000);
        }
      }
    });

    socket.on("room:ready", ({ ready }: { ready: boolean }) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      const p = room.players.find((x) => x.id === socket.id);
      if (p) p.ready = ready;
      emitRoom();
    });

    socket.on("room:start", () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      if (room.hostId !== socket.id) return; // host only
      if (room.status !== "waiting") return;
      // Start countdown sync
      room.status = "countdown";
      emitRoom();
      io.to(currentRoom).emit("race:countdown", { from: 3 });
      setTimeout(() => {
        room.status = "racing";
        emitRoom();
        io.to(currentRoom!).emit("race:start");
      }, 3000);
    });

    socket.on("room:startWithBots", () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      if (room.status !== "waiting") return;
      // fill with bots (as placeholders)
      const needed = Math.max(0, room.max - room.players.length);
      for (let i = 0; i < needed; i++) {
        room.players.push({ id: `bot-${Date.now()}-${i}`, name: `Bot ${i + 1}`, ready: true });
      }
      // broadcast updated room with bots
      emitRoom();
      // then start synchronized countdown
      room.status = "countdown";
      emitRoom();
      io.to(currentRoom).emit("race:countdown", { from: 3 });
      setTimeout(() => {
        room.status = "racing";
        emitRoom();
        io.to(currentRoom!).emit("race:start");
      }, 3000);
    });

    // Update room privacy (host only, while waiting)
    socket.on("room:updatePrivacy", ({ isPublic }: { isPublic: boolean }) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      if (room.hostId !== socket.id) return;
      if (room.status !== "waiting") return;
      room.isPublic = !!isPublic;
      emitRoom();
    });

    // Public lobby: host-only start after 8s with min 2 players
    socket.on("room:startAnyway", () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room || !room.isPublic || room.status !== "waiting") return;
      if (room.hostId !== socket.id) return; // host only
      
      const realPlayers = room.players.filter(p => !String(p.id).startsWith("bot-"));
      const createdAt = (room as any).createdAt || Date.now();
      const elapsed = Date.now() - createdAt;
      
      if (realPlayers.length >= 2 && realPlayers.length < room.max && elapsed >= 8000) {
        room.status = "countdown";
        emitRoom();
        io.to(currentRoom).emit("race:countdown", { from: 3 });
        setTimeout(() => {
          room.status = "racing";
          emitRoom();
          io.to(currentRoom!).emit("race:start");
          // Create fresh public lobby for next players
          if (room.isPublic) createPublicLobby();
        }, 3000);
      }
    });

    socket.on("race:position", ({ progress }: { progress: number }) => {
      // naive anti-cheat: clamp progress 0..1
      const clamped = Math.max(0, Math.min(1, progress));
      if (!currentRoom) return;
      socket.to(currentRoom).emit("race:position", { id: socket.id, progress: clamped });
    });

    socket.on("room:chat", ({ message }: { message: string }) => {
      if (!currentRoom) return;
      const m = (message || "").slice(0, 200);
      io.to(currentRoom).emit("room:chat", { id: socket.id, message: m, t: Date.now() });
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      room.players = room.players.filter(p => p.id !== socket.id);
      
      // Reassign host if needed
      if (room.hostId === socket.id && room.players.length > 0) {
        const nextReal = room.players.find(p => !String(p.id).startsWith("bot-"));
        room.hostId = nextReal ? nextReal.id : room.players[0].id;
      }
      
      // Remove empty room
      if (room.players.length === 0) {
        rooms.delete(currentRoom);
        if (currentPublicLobbyCode === currentRoom) {
          currentPublicLobbyCode = null;
        }
      } else {
        emitRoom();
      }
    });
  });

  return io;
}
