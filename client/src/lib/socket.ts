import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    const url = (import.meta as any).env.VITE_SOCKET_URL || window.location.origin;
    socket = io(url, { transports: ["websocket"], withCredentials: true });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
