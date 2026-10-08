import axios, { AxiosError } from "axios";

export type Role = "driver" | "guard" | "admin";
export interface User { _id: string; name: string; email: string; role: Role }
export interface AuthResponse { token: string; user: User }

type Ref = string | { _id: string; name?: string; label?: string; [k: string]: unknown };

export interface Lot {
  _id: string;
  name: string;
  address: string;
  location?: { type: "Point"; coordinates: [number, number] };
  totalSlots: number;
  hourlyRate: number;
  availableSlots: number;
  occupiedSlots?: number;
}
export type SlotStatus = "available" | "reserved" | "occupied";
export interface Slot { _id: string; lot: string; label: string; status: SlotStatus }
export interface Reservation { _id: string; user?: string; lot: Ref; slot: Ref; status: "reserved" | "checked_in" | "completed"; createdAt: string }
export type TicketStatus = "issued" | "entered" | "exited";
export interface Ticket {
  _id: string; reservation: string | { _id: string; slot: Ref }; user?: Ref; lot: Ref; qrToken: string;
  status: TicketStatus; enteredAt?: string | null; exitedAt?: string | null; amount?: number | null;
}
export interface ValidateResponse { valid: boolean; ticket?: Ticket }
export interface OccupancyPoint { timestamp: string; occupiedCount: number; totalSlots: number }

export const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";
export const TOKEN_KEY = "parking_token";

export const http = axios.create({ baseURL: API_BASE || "/api" });

http.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = window.localStorage.getItem(TOKEN_KEY);
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export function errorMessage(e: unknown, fallback = "Something went wrong. Try again."): string {
  if (e instanceof AxiosError) {
    if (!e.response) return "Cannot reach the server. Check your connection.";
    const d = e.response.data as { message?: string; error?: string } | undefined;
    return d?.message || d?.error || fallback;
  }
  return fallback;
}
export const statusOf = (e: unknown) => (e instanceof AxiosError ? e.response?.status : undefined);

export const refId = (r: Ref | undefined) => (r == null ? "" : typeof r === "string" ? r : r._id);
export const refName = (r: Ref | undefined, key: "name" | "label" = "name") =>
  r && typeof r === "object" && typeof r[key] === "string" ? (r[key] as string) : undefined;

// ---------- Services (match the backend contract exactly) ----------
export const authApi = {
  login: (email: string, password: string) => http.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),
  register: (name: string, email: string, password: string) => http.post<AuthResponse>("/auth/register", { name, email, password }).then((r) => r.data),
  me: () => http.get<{ user: User }>("/auth/me").then((r) => r.data.user),
};

export const lotsApi = {
  nearby: (lat: number, lng: number) => http.get<Lot[]>("/lots/nearby", { params: { lat, lng } }).then((r) => r.data),
  get: (id: string) => http.get<Lot>(`/lots/${id}`).then((r) => r.data),
  slots: (id: string) => http.get<Slot[]>(`/lots/${id}/slots`).then((r) => r.data),
  create: (body: { name: string; address: string; latitude: number; longitude: number; hourlyRate: number; totalSlots: number }) =>
    http.post<Lot>("/lots", body).then((r) => r.data),
};

export const reservationsApi = {
  create: (lotId: string, slotId: string) => http.post<{ reservation: Reservation; ticket: Ticket }>("/reservations", { lotId, slotId }).then((r) => r.data),
  mine: () => http.get<Reservation[]>("/reservations/mine").then((r) => r.data),
};

export const ticketsApi = {
  mine: () => http.get<Ticket[]>("/tickets/mine").then((r) => r.data),
  get: (id: string) => http.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
};

export const guardApi = {
  validate: (qrToken: string) =>
    http.post<Ticket>("/guard/validate", { qrToken }).then((r) => ({
      valid: true,
      ticket: r.data,
    })),

  entry: (qrToken: string) =>
    http.post("/guard/entry", { qrToken }).then((r) => r.data),

  exit: (qrToken: string) =>
    http.post("/guard/exit", { qrToken }).then((r) => r.data),
};

export const adminApi = {
  revenue: () => http.get<{ totalRevenue: number; [k: string]: unknown }>("/admin/metrics/revenue").then((r) => r.data),
  occupancy: () => http.get<OccupancyPoint[]>("/admin/metrics/occupancy").then((r) => r.data),
  lots: () => http.get<Lot[]>("/admin/lots").then((r) => r.data),
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
/** Occupied count: use occupiedSlots when sent, else totalSlots - availableSlots. */
export function occupiedOf(l: Lot): number {
  const o = num(l.occupiedSlots);
  if (o !== undefined) return o;
  const t = num(l.totalSlots), a = num(l.availableSlots);
  return t !== undefined && a !== undefined ? Math.max(0, t - a) : 0;
}
export const availableOf = (l: Lot) => num(l.availableSlots) ?? 0;
