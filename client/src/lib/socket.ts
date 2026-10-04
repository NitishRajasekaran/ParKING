import { io, type Socket } from "socket.io-client";
import { API_BASE, TOKEN_KEY } from "./api";

// Socket.io is receive-only for live updates. REST performs all changes.
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const token = window.localStorage.getItem(TOKEN_KEY) ?? "";
  socket = io(API_BASE || undefined, { auth: { token }, transports: ["websocket", "polling"] });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
