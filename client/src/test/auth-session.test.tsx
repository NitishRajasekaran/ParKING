import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, RoleMismatchError, useAuth } from "@/lib/auth";
import { authApi, TOKEN_KEY } from "@/lib/api";

describe("portal login session handling", () => {
  it("does not persist a staff session submitted through Owner Login", async () => {
    localStorage.clear();
    const login = vi.spyOn(authApi, "login").mockResolvedValue({
      token: "test-token",
      user: { _id: "staff-id", name: "Staff", email: "staff@example.com", role: "platform_admin" },
    });
    let caught: unknown;
    function Probe() {
      const auth = useAuth();
      return <button onClick={() => { void auth.login("staff@example.com", "password", "owner").catch((error) => { caught = error; }); }}>Sign in</button>;
    }
    try {
      const view = render(<AuthProvider><Probe /></AuthProvider>);
      fireEvent.click(view.getByRole("button", { name: "Sign in" }));
      await waitFor(() => expect(caught).toBeInstanceOf(RoleMismatchError));
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem("parking_user")).toBeNull();
    } finally {
      login.mockRestore();
      localStorage.clear();
    }
  });
});
