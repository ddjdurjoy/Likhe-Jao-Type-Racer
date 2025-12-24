import { Server as HTTPServer } from "http";
import { Server } from "socket.io";

interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
  carId?: number;
  ready: boolean;
}

interface RoomState {
  code: string;
  hostId: string;
  players: PlayerInfo[];
  max: number;
  status: "waiting" | "countdown" | "racing" | "finished";
  isPublic?: boolean;
  // Race setup (generated once per race start)
  raceSeed?: number;
  raceLanguage?: "en" | "bn";
  raceDifficulty?: "easy" | "medium" | "hard";
  raceWordCount?: number;
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
  const allowedOrigins = [
    "http://localhost:5000",
    "http://localhost:5001",
    "https://likhe-jao-typeracer.vercel.app",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const onlineByUserId = new Map<string, Set<string>>();
  const userIdBySocketId = new Map<string, string>();

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;
    let authedUserId: string | null = null;

    function emitRoom() {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room) io.to(currentRoom).emit("room:update", room);
    }

    socket.on("queue:joinPublic", ({ name, avatar, carId, language, difficulty }: { name: string; avatar?: string; carId?: number; language?: "en" | "bn"; difficulty?: "easy" | "medium" | "hard" }) => {
      const lobby = getOrCreatePublicLobby();
      socket.join(lobby.code);
      currentRoom = lobby.code;
      
      const normalizedCarId = Number.isFinite(carId as number) ? Number(carId) : (lobby.players.length % 5);
      const existing = lobby.players.find(p => p.id === socket.id);
      if (existing) {
        // Update carId if it was missing/old
        existing.carId = normalizedCarId;
      }
      if (!existing) {
        lobby.players.push({ id: socket.id, name, avatar, carId: normalizedCarId, ready: false });
        // First player becomes host (also sets race settings)
        if (!lobby.hostId) {
          lobby.hostId = socket.id;
          (lobby as any).createdAt = Date.now();
          lobby.raceLanguage = language ?? "en";
          lobby.raceDifficulty = difficulty ?? "medium";
          lobby.raceWordCount = 20;
        }
      }

      socket.emit("room:joined", lobby);
      emitRoom();

      // Auto-start when full with real players
      const realPlayers = lobby.players.filter(p => !String(p.id).startsWith("bot-"));
      if (lobby.status === "waiting" && realPlayers.length >= lobby.max) {
        lobby.status = "countdown";
        // generate race seed once
        lobby.raceSeed = lobby.raceSeed ?? ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
        emitRoom();
        io.to(lobby.code).emit("race:countdown", {
          from: 3,
          seed: lobby.raceSeed,
          language: lobby.raceLanguage ?? "en",
          difficulty: lobby.raceDifficulty ?? "medium",
          wordCount: lobby.raceWordCount ?? 20,
        });
        setTimeout(() => {
          lobby.status = "racing";
          emitRoom();
          io.to(lobby.code).emit("race:start");
          // Create fresh public lobby for next players
          createPublicLobby();
        }, 3000);
      }
    });

    socket.on("room:create", ({ name, avatar, carId, isPublic, language, difficulty }: { name: string; avatar?: string; carId?: number; isPublic?: boolean; language?: "en" | "bn"; difficulty?: "easy" | "medium" | "hard" }) => {
      let code = makeCode();
      while (rooms.has(code)) code = makeCode();
      const state: RoomState = {
        code,
        hostId: socket.id,
        players: [{ id: socket.id, name, avatar, carId: Number.isFinite(carId as number) ? Number(carId) : 0, ready: false }],
        max: 5,
        status: "waiting",
        isPublic: !!isPublic,
        raceLanguage: language ?? "en",
        raceDifficulty: difficulty ?? "medium",
        raceWordCount: 20,
      };
      rooms.set(code, state);
      socket.join(code);
      currentRoom = code;
      socket.emit("room:created", state);
      emitRoom();
    });

    socket.on("room:join", ({ code, name, avatar, carId, language, difficulty }: { code: string; name: string; avatar?: string; carId?: number; language?: "en" | "bn"; difficulty?: "easy" | "medium" | "hard" }) => {
      const room = rooms.get(code);
      if (!room) return socket.emit("room:error", { message: "Room not found" });
      const normalizedCarId = Number.isFinite(carId as number) ? Number(carId) : (room.players.length % 5);
      if (room.players.length >= room.max) return socket.emit("room:error", { message: "Room full" });
      const existing = room.players.find((p) => p.id === socket.id);
      if (existing) {
        existing.carId = normalizedCarId;
      }
      if (room.status !== "waiting") return socket.emit("room:error", { message: "Race already started" });
      if (!existing) {
        room.players.push({ id: socket.id, name, avatar, carId: normalizedCarId, ready: false });
      }
      // If host not set (shouldn't happen) or first player, set race settings
      if (!room.raceLanguage) room.raceLanguage = language ?? room.raceLanguage;
      if (!room.raceDifficulty) room.raceDifficulty = difficulty ?? room.raceDifficulty;
      if (!room.raceWordCount) room.raceWordCount = 20;
      socket.join(code);
      currentRoom = code;
      socket.emit("room:joined", room);
      emitRoom();
      // Auto-start ONLY when full with real players (no bots)
      if (room.status === "waiting" && room.players.length >= room.max) {
        const allReal = room.players.every((p) => !String(p.id).startsWith("bot-"));
        if (allReal) {
          room.status = "countdown";
          room.raceSeed = room.raceSeed ?? ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
          emitRoom();
          io.to(currentRoom).emit("race:countdown", {
            from: 3,
            seed: room.raceSeed,
            language: room.raceLanguage ?? "en",
            difficulty: room.raceDifficulty ?? "medium",
            wordCount: room.raceWordCount ?? 20,
          });
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
        room.raceSeed = room.raceSeed ?? ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
        emitRoom();
        io.to(currentRoom).emit("race:countdown", {
          from: 3,
          seed: room.raceSeed,
          language: room.raceLanguage ?? "en",
          difficulty: room.raceDifficulty ?? "medium",
          wordCount: room.raceWordCount ?? 20,
        });
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

    // Presence auth: client sends userId after login
    socket.on("presence:auth", async ({ userId }: { userId: string }) => {
      authedUserId = userId;
      userIdBySocketId.set(socket.id, userId);
      const set = onlineByUserId.get(userId) ?? new Set<string>();
      set.add(socket.id);
      onlineByUserId.set(userId, set);
      socket.broadcast.emit("presence:update", { userId, online: true });
    });

    socket.on("presence:who", ({ userIds }: { userIds: string[] }) => {
      const status = (userIds || []).map((id) => ({ userId: id, online: (onlineByUserId.get(id)?.size ?? 0) > 0 }));
      socket.emit("presence:status", status);
    });

    socket.on("friends:invite", ({ toUserId }: { toUserId: string }) => {
      if (!authedUserId) return;
      const targets = onlineByUserId.get(toUserId);
      if (!targets) return;
      for (const sid of targets) {
        io.to(sid).emit("friends:invite", { fromUserId: authedUserId, t: Date.now() });
      }
    });

    socket.on("room:chat", ({ message }: { message: string }) => {
      if (!currentRoom) return;
      const m = (message || "").slice(0, 200);
      io.to(currentRoom).emit("room:chat", { id: socket.id, message: m, t: Date.now() });
    });

    socket.on("disconnect", () => {
      // presence cleanup
      const uid = userIdBySocketId.get(socket.id);
      if (uid) {
        userIdBySocketId.delete(socket.id);
        const set = onlineByUserId.get(uid);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            onlineByUserId.delete(uid);
            socket.broadcast.emit("presence:update", { userId: uid, online: false });
          }
        }
      }

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
