import { describe, expect, it } from "vitest";
import { ticketDisplayCode, ticketQrPayload } from "@/lib/ticket-code";

describe("ticket code and QR mapping", () => {
  it("shows the backend-issued copy code while keeping the exact QR token payload", () => {
    const ticket = { qrToken: "opaque-qr-token", ticketCode: "PK-3ABC9DEF" };
    expect(ticketDisplayCode(ticket)).toBe("PK-3ABC9DEF");
    expect(ticketQrPayload(ticket)).toBe("opaque-qr-token");
  });

  it("keeps old tickets without a display code scannable and manually addressable", () => {
    const oldTicket = { qrToken: "legacy-qr-token" };
    expect(ticketDisplayCode(oldTicket)).toBe("legacy-qr-token");
    expect(ticketQrPayload(oldTicket)).toBe("legacy-qr-token");
  });
});
