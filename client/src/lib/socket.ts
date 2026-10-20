import { io, type Socket } from "socket.io-client";
import { API_BASE, getStoredToken } from "./api";

// Socket.io is receive-only for live updates. REST performs all changes.
let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = typeof window !== "undefined" ? getStoredToken() ?? "" : "";
  if (socket) {
    if (socket.auth && typeof socket.auth === "object" && (socket.auth as any).token !== token) {
      (socket.auth as any).token = token;
      if (socket.connected) {
        socket.disconnect().connect();
      } else {
        socket.connect();
      }
    }
    return socket;
  }
  socket = io(API_BASE || undefined, {
    auth: (cb) => {
      const currentToken = typeof window !== "undefined" ? getStoredToken() ?? "" : "";
      cb({ token: currentToken });
    },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
