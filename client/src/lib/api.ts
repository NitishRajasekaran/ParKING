import axios, { AxiosError } from "axios";

export type Role = "driver" | "guard" | "owner" | "platform_admin" | "admin";
export interface User { _id: string; name: string; email: string; role: Role; ownerStatus?: "none" | "pending" | "approved" | "rejected"; ownerId?: string | null; assignedLots?: string[] }
export interface AuthResponse { token: string; user: User }
export type StaffRole = "platform_admin" | "guard";
export interface StaffUser extends Omit<User, "assignedLots"> { assignedLots?: Array<string | { _id: string; name: string }>; createdAt: string }
export interface OwnerApplication extends User { role: "owner"; ownerStatus: "pending" | "approved" | "rejected"; createdAt: string; updatedAt?: string }
export type OwnerGuard = Omit<User, "assignedLots"> & { role: "guard"; assignedLots: Array<string | { _id: string; name: string; address?: string }>; createdAt?: string };
export interface OwnerStatus { userId: string; name: string; email: string; role: "owner"; ownerStatus: "pending" | "approved" | "rejected"; createdAt?: string; updatedAt?: string }

type Ref = string | { _id: string; name?: string; label?: string; [k: string]: unknown };

export interface Lot {
  _id: string;
  name: string;
  address: string;
  location?: { type: "Point"; coordinates: [number, number] };
  totalSlots: number;
  hourlyRate: number;
  availableSlots?: number;
  availableCount?: number;
  occupiedSlots?: number;
  reservedSlots?: number;
  owner?: Ref | null;
}
export type SlotStatus = "available" | "reserved" | "occupied";
export interface Slot { _id: string; lot: string; label: string; status: SlotStatus }
export interface Reservation { _id: string; user?: string; lot: Ref; slot: Ref; status: "reserved" | "checked_in" | "completed"; createdAt: string }
export type TicketStatus = "issued" | "entered" | "exited";
export interface Ticket {
  _id: string; reservation: string | { _id: string; slot: Ref }; user?: Ref; lot: Ref; qrToken: string; ticketCode?: string;
  status: TicketStatus; enteredAt?: string | null; exitedAt?: string | null; amount?: number | null;
}
export interface ValidateResponse { valid: boolean; ticket?: Ticket }
export interface OccupancyPoint { timestamp: string; occupiedCount: number; totalSlots: number }
export interface OccupancyResponse { lotsWithOccupancy: unknown[]; snapshots: OccupancyPoint[] }

const configuredApiUrl = (import.meta.env["VITE_API_URL"] as string | undefined)?.trim();
// In development use the same-origin Vite proxy; phone URLs then need no IP in source.
export const API_BASE = import.meta.env.DEV || !configuredApiUrl || configuredApiUrl === "/api"
  ? ""
  : configuredApiUrl.replace(/\/$/, "");
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
  adminSetupStatus: () => http.get<{ available: boolean }>("/auth/setup-admin/status").then((r) => r.data),
  setupAdmin: (name: string, email: string, password: string) => http.post<AuthResponse>("/auth/setup-admin", { name, email, password }).then((r) => r.data),
  applyOwner: (name: string, email: string, password: string) => http.post<AuthResponse>("/auth/apply-owner", { name, email, password }).then((r) => r.data),
  me: () => http.get<User | { user: User }>("/auth/me").then((r) => ((r.data as any)?.user ?? r.data) as User),
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

export const ownerApi = {
  status: () => http.get<OwnerStatus>("/owner/status").then((r) => r.data),
  lots: () => http.get<Lot[]>("/owner/lots").then((r) => r.data),
  createLot: (body: { name: string; address: string; latitude: number; longitude: number; hourlyRate: number; totalSlots: number }) =>
    http.post<Lot>("/owner/lots", body).then((r) => r.data),
  guards: () => http.get<OwnerGuard[]>("/owner/guards").then((r) => r.data),
  createGuard: (body: { name: string; email: string; password: string; assignedLots: string[] }) =>
    http.post<OwnerGuard>("/owner/guards", body).then((r) => r.data),
  assignGuardLots: (id: string, assignedLots: string[]) =>
    http.patch<OwnerGuard>(`/owner/guards/${id}/assign`, { assignedLots }).then((r) => r.data),
  revenue: () => http.get<{ totalRevenue: number; totalSessions: number }>("/owner/metrics/revenue").then((r) => r.data),
  occupancy: () => http.get<OccupancyResponse>("/owner/metrics/occupancy").then((r) => r.data),
};

export const adminApi = {
  revenue: () => http.get<{ totalRevenue: number; [k: string]: unknown }>("/admin/metrics/revenue").then((r) => r.data),
  occupancy: () => http.get<OccupancyResponse>("/admin/metrics/occupancy").then((r) => r.data),
  lots: () => http.get<Lot[]>("/admin/lots").then((r) => r.data),
  staff: () => http.get<StaffUser[]>("/admin/users").then((r) => r.data),
  createStaff: (body: { name: string; email: string; password: string; role: StaffRole; assignedLots?: string[] }) =>
    http.post<StaffUser>("/admin/users", body).then((r) => r.data),
  assignGuardLots: (id: string, assignedLots: string[]) =>
    http.patch<StaffUser>(`/admin/users/${id}/assign-lots`, { assignedLots }).then((r) => r.data),
  owners: (status?: string) => http.get<OwnerApplication[]>("/admin/owners", { params: status ? { status } : undefined }).then((r) => r.data),
  pendingOwners: () => http.get<OwnerApplication[]>("/admin/owners/pending").then((r) => r.data),
  approveOwner: (id: string) => http.post<OwnerApplication>(`/admin/owners/${id}/approve`).then((r) => r.data),
  rejectOwner: (id: string) => http.post<OwnerApplication>(`/admin/owners/${id}/reject`).then((r) => r.data),
  assignLotOwner: (id: string, ownerId: string | null) => http.patch<Lot>(`/admin/lots/${id}/assign-owner`, { ownerId }).then((r) => r.data),
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
/** Occupied count: use occupiedSlots when sent, else totalSlots - availableSlots. */
export function occupiedOf(l: Lot): number {
  const o = num(l.occupiedSlots);
  if (o !== undefined) return o;
  const t = num(l.totalSlots), a = num(l.availableSlots ?? l.availableCount);
  return t !== undefined && a !== undefined ? Math.max(0, t - a) : 0;
}
export const availableOf = (l: Lot) => num(l.availableSlots) ?? num(l.availableCount) ?? 0;
