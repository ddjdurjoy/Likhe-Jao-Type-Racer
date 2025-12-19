import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    const params = new URLSearchParams(window.location.search);
    const override = params.get("socketUrl");
    const url = override || (import.meta as any).env.VITE_SOCKET_URL || window.location.origin;
    // Debug log to verify URL at runtime
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log("Socket URL:", url);
    }
    socket = io(url, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
