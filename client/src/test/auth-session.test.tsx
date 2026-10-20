import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AuthProvider, RoleMismatchError, useAuth } from "@/lib/auth";
import {
  authApi,
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  guardApi,
  http,
  setStoredToken,
  setStoredUser,
  ticketsApi,
  TOKEN_KEY,
  USER_KEY,
  type User,
} from "@/lib/api";

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

describe("portal login session handling", () => {
  const originalSessionStorage = window.sessionStorage;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, "sessionStorage", {
      value: originalSessionStorage,
      configurable: true,
      writable: true,
    });
    localStorage.clear();
    sessionStorage.clear();
    clearStoredSession();
  });

  it("does not persist a staff session submitted through Owner Login", async () => {
    localStorage.clear();
    sessionStorage.clear();
    const login = vi.spyOn(authApi, "login").mockResolvedValue({
      token: "test-token",
      user: { _id: "staff-id", name: "Staff", email: "staff@example.com", role: "platform_admin" },
    });
    let caught: unknown;
    function Probe() {
      const auth = useAuth();
      return (
        <button
          onClick={() => {
            void auth.login("staff@example.com", "password", "owner").catch((error) => {
              caught = error;
            });
          }}
        >
          Sign in
        </button>
      );
    }
    try {
      const view = render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      fireEvent.click(view.getByRole("button", { name: "Sign in" }));
      await waitFor(() => expect(caught).toBeInstanceOf(RoleMismatchError));
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
      expect(getStoredToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    } finally {
      login.mockRestore();
      localStorage.clear();
      sessionStorage.clear();
    }
  });

  it("clears the persisted session on logout", async () => {
    localStorage.clear();
    sessionStorage.clear();
    let doLogout = () => {};
    function Probe() {
      const auth = useAuth();
      doLogout = auth.logout;
      return null;
    }
    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    localStorage.setItem(TOKEN_KEY, "session-token");
    localStorage.setItem(USER_KEY, JSON.stringify({ _id: "u1", role: "driver" }));
    setStoredToken("session-token");
    setStoredUser({ _id: "u1", role: "driver", name: "Driver", email: "driver@example.com" });

    doLogout();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
    view.unmount();
  });

  it("maintains independent Driver and Guard sessions in separate tabs without cross-tab overwrite", () => {
    const tab1Storage = new MockStorage();
    const tab2Storage = new MockStorage();

    const driverUser: User = { _id: "driver-1", name: "Driver Dan", email: "dan@test.com", role: "driver" };
    const guardUser: User = { _id: "guard-2", name: "Guard Gary", email: "gary@test.com", role: "guard", assignedLots: ["lot-1"] };

    // Tab 1 logs in as Driver
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });
    setStoredToken("driver-jwt-token");
    setStoredUser(driverUser);

    expect(getStoredToken()).toBe("driver-jwt-token");
    expect(getStoredUser()).toEqual(driverUser);

    // Tab 2 logs in as Guard
    Object.defineProperty(window, "sessionStorage", { value: tab2Storage, configurable: true, writable: true });
    setStoredToken("guard-jwt-token");
    setStoredUser(guardUser);

    expect(getStoredToken()).toBe("guard-jwt-token");
    expect(getStoredUser()).toEqual(guardUser);

    // Switch back to Tab 1: Driver session is intact and NOT overwritten by Guard
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });
    expect(getStoredToken()).toBe("driver-jwt-token");
    expect(getStoredUser()?.role).toBe("driver");
    expect(getStoredUser()?._id).toBe("driver-1");

    // Shared localStorage was not polluted with either token
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("ensures independent logout: logging out in Tab 1 leaves Tab 2 session intact", () => {
    const tab1Storage = new MockStorage();
    const tab2Storage = new MockStorage();

    // Tab 1 setup
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });
    setStoredToken("driver-jwt-token");
    setStoredUser({ _id: "driver-1", name: "Driver Dan", email: "dan@test.com", role: "driver" });

    // Tab 2 setup
    Object.defineProperty(window, "sessionStorage", { value: tab2Storage, configurable: true, writable: true });
    setStoredToken("guard-jwt-token");
    setStoredUser({ _id: "guard-2", name: "Guard Gary", email: "gary@test.com", role: "guard" });

    // Tab 1 logs out
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });
    clearStoredSession();
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();

    // Tab 2 remains logged in as Guard
    Object.defineProperty(window, "sessionStorage", { value: tab2Storage, configurable: true, writable: true });
    expect(getStoredToken()).toBe("guard-jwt-token");
    expect(getStoredUser()?.role).toBe("guard");
  });

  it("selects the correct tab token for API requests via Axios request interceptor", async () => {
    const tab1Storage = new MockStorage();
    const tab2Storage = new MockStorage();

    // Tab 1: Driver
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });
    setStoredToken("driver-jwt-token");

    // Interceptor in Tab 1
    const getInterceptor = () => (http.interceptors.request as any).handlers[0].fulfilled;
    const tab1Config = await getInterceptor()({ headers: {} });
    expect(tab1Config.headers.Authorization).toBe("Bearer driver-jwt-token");

    // Tab 2: Guard
    Object.defineProperty(window, "sessionStorage", { value: tab2Storage, configurable: true, writable: true });
    setStoredToken("guard-jwt-token");

    const tab2Config = await getInterceptor()({ headers: {} });
    expect(tab2Config.headers.Authorization).toBe("Bearer guard-jwt-token");

    // Back to Tab 1
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });
    const tab1ConfigAgain = await getInterceptor()({ headers: {} });
    expect(tab1ConfigAgain.headers.Authorization).toBe("Bearer driver-jwt-token");
  });

  it("fetches My Tickets using the Driver tab token without Guard session interference", async () => {
    const tab1Storage = new MockStorage();
    const tab2Storage = new MockStorage();

    // Setup Tab 1 (Driver) and Tab 2 (Guard)
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });
    setStoredToken("driver-token-abc");

    Object.defineProperty(window, "sessionStorage", { value: tab2Storage, configurable: true, writable: true });
    setStoredToken("guard-token-xyz");

    // Switch to Tab 1 to fetch driver's tickets
    Object.defineProperty(window, "sessionStorage", { value: tab1Storage, configurable: true, writable: true });

    let capturedAuthHeader: string | undefined;
    const httpGetSpy = vi.spyOn(http, "get").mockImplementation((url, config) => {
      // Run the interceptor logic on config to capture headers
      const handler = (http.interceptors.request as any).handlers[0].fulfilled;
      const finalConfig = handler({ headers: config?.headers ?? {}, ...config });
      capturedAuthHeader = finalConfig.headers.Authorization;
      return Promise.resolve({
        data: [{ _id: "ticket-101", status: "issued", ticketCode: "PK-101" }],
      }) as any;
    });

    const tickets = await ticketsApi.mine();
    expect(capturedAuthHeader).toBe("Bearer driver-token-abc");
    expect(tickets).toHaveLength(1);
    expect(tickets[0]._id).toBe("ticket-101");

    httpGetSpy.mockRestore();
  });

  it("sends Guard token on guard validation and correctly distinguishes authorization failure", async () => {
    const tab2Storage = new MockStorage();
    Object.defineProperty(window, "sessionStorage", { value: tab2Storage, configurable: true, writable: true });
    setStoredToken("guard-token-xyz");

    let capturedAuthHeader: string | undefined;
    const httpPostSpy = vi.spyOn(http, "post").mockImplementation((url, body, config) => {
      const handler = (http.interceptors.request as any).handlers[0].fulfilled;
      const finalConfig = handler({ headers: config?.headers ?? {}, ...config });
      capturedAuthHeader = finalConfig.headers.Authorization;
      return Promise.resolve({
        data: { _id: "ticket-202", status: "issued", qrToken: "qr-202" },
      }) as any;
    });

    const result = await guardApi.validate("qr-202");
    expect(capturedAuthHeader).toBe("Bearer guard-token-xyz");
    expect(result.valid).toBe(true);
    expect(result.ticket?._id).toBe("ticket-202");

    httpPostSpy.mockRestore();
  });
});

