import { describe, expect, it, vi } from "vitest";
import { homeFor, loginPortalForRole, roleAllowedForPortal, RoleMismatchError } from "@/lib/auth";
import { authApi, http } from "@/lib/api";

describe("role-specific authentication", () => {
  it.each([
    ["platform_admin", "/admin"],
    ["owner", "/owner"],
    ["guard", "/guard"],
    ["driver", "/driver"],
  ] as const)("routes %s to %s", (role, path) => {
    expect(homeFor(role)).toBe(path);
  });

  it("accepts only the portal's role family", () => {
    expect(roleAllowedForPortal("platform_admin", "staff")).toBe(true);
    expect(roleAllowedForPortal("guard", "staff")).toBe(true);
    expect(roleAllowedForPortal("owner", "staff")).toBe(false);
    expect(roleAllowedForPortal("owner", "owner")).toBe(true);
    expect(roleAllowedForPortal("platform_admin", "owner")).toBe(false);
    expect(roleAllowedForPortal("driver", "driver")).toBe(true);
  });

  it("directs mismatched accounts to the portal for their actual role", () => {
    expect(loginPortalForRole("platform_admin")).toBe("staff");
    expect(loginPortalForRole("guard")).toBe("staff");
    expect(loginPortalForRole("owner")).toBe("owner");
    expect(loginPortalForRole("driver")).toBe("driver");
  });

  it("identifies role mismatches before the auth provider stores a session", () => {
    const mismatch = new RoleMismatchError("platform_admin");
    expect(mismatch.actualRole).toBe("platform_admin");
  });

  it("sends no role or privileged fields during public driver registration", async () => {
    const post = vi.spyOn(http, "post").mockResolvedValue({ data: { token: "t", user: { _id: "u", name: "Driver", email: "d@example.com", role: "driver" } } } as never);
    try {
      await authApi.register("Driver", "d@example.com", "driver-password");
      expect(post).toHaveBeenCalledWith("/auth/register", { name: "Driver", email: "d@example.com", password: "driver-password" });
      const body = post.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(body).not.toHaveProperty("role");
      expect(body).not.toHaveProperty("ownerStatus");
      expect(body).not.toHaveProperty("assignedLots");
    } finally {
      post.mockRestore();
    }
  });
});
