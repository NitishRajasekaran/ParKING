import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  authApi,
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  TOKEN_KEY,
  USER_KEY,
  type Role,
  type User,
} from "./api";
import { closeSocket } from "./socket";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string, portal: LoginPortal) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  setupAdmin: (name: string, email: string, password: string) => Promise<User>;
  applyOwner: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export type LoginPortal = "driver" | "owner" | "staff";

export class RoleMismatchError extends Error {
  constructor(readonly actualRole: Role) {
    super("Account role does not match the selected portal");
    this.name = "RoleMismatchError";
  }
}

export function roleAllowedForPortal(role: Role, portal: LoginPortal) {
  if (portal === "staff") return role === "platform_admin" || role === "admin" || role === "guard";
  return portal === "owner" ? role === "owner" : role === "driver";
}

export function loginPortalForRole(role: Role): LoginPortal {
  return role === "owner" ? "owner" : role === "driver" ? "driver" : "staff";
}

export function homeFor(role: Role) {
  return role === "admin" || role === "platform_admin" ? "/admin" : role === "owner" ? "/owner" : role === "guard" ? "/guard" : "/driver";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const cached = getStoredUser();
    if (!token) { setReady(true); return; }
    if (cached) { setUser(cached); }
    authApi.me()
      .then((u) => { setUser(u); setStoredUser(u); })
      .catch((e) => {
        if (e?.response?.status === 401) { clearStoredSession(); setUser(null); }
      })
      .finally(() => setReady(true));
  }, []);

  const save = (token: string, u: User) => {
    setStoredToken(token);
    setStoredUser(u);
    closeSocket();
    setUser(u);
    return u;
  };

  const value: AuthState = {
    user, ready,
    login: async (email, password, portal) => {
      const r = await authApi.login(email, password);
      if (!roleAllowedForPortal(r.user.role, portal)) throw new RoleMismatchError(r.user.role);
      return save(r.token, r.user);
    },
    register: async (name, email, password) => { const r = await authApi.register(name, email, password); return save(r.token, r.user); },
    setupAdmin: async (name, email, password) => { const r = await authApi.setupAdmin(name, email, password); return save(r.token, r.user); },
    applyOwner: async (name, email, password) => { const r = await authApi.applyOwner(name, email, password); return save(r.token, r.user); },
    logout: () => { clearStoredSession(); closeSocket(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
