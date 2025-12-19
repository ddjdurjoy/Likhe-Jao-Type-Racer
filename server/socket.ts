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
}

const rooms = new Map<string, RoomState>();

function makeCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function setupSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;

    function emitRoom() {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room) io.to(currentRoom).emit("room:update", room);
    }

    socket.on("room:create", ({ name, avatar }: { name: string; avatar?: string }) => {
      let code = makeCode();
      while (rooms.has(code)) code = makeCode();
      const state: RoomState = {
        code,
        hostId: socket.id,
        players: [{ id: socket.id, name, avatar, ready: false }],
        max: 5,
        status: "waiting",
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
      room.players = room.players.filter((p) => p.id !== socket.id);
      // reassign host if needed
      if (room.hostId === socket.id && room.players.length > 0) {
        room.hostId = room.players[0].id;
      }
      // remove empty room
      if (room.players.length === 0) rooms.delete(currentRoom);
      else emitRoom();
    });
  });

  return io;
}
