import { io, type Socket } from "socket.io-client";
import { API_BASE, TOKEN_KEY } from "./api";

// Socket.io is receive-only for live updates. REST performs all changes.
let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) ?? "" : "";
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
      const currentToken = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) ?? "" : "";
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
