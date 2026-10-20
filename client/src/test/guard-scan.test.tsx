import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scannerMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  onDecoded: null as null | ((text: string) => void),
}));

vi.mock("html5-qrcode", () => ({
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5Qrcode: class {
    state = 1;
    getState() { return this.state; }
    start(...args: unknown[]) {
      this.state = 2; // SCANNING
      scannerMock.onDecoded = args[2] as (text: string) => void;
      return scannerMock.start().then(() => null);
    }
    stop() {
      this.state = 1; // NOT_STARTED
      return scannerMock.stop();
    }
    clear() { scannerMock.clear(); }
  },
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    guardApi: {
      validate: vi.fn(),
      entry: vi.fn(),
      exit: vi.fn(),
    },
  };
});

import { AxiosError } from "axios";
import { guardApi } from "@/lib/api";
import { Route } from "@/routes/guard.index";

const GuardComponent = Route.options.component!;

describe("Guard scanning lifecycle and multi-ticket validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scannerMock.start.mockResolvedValue(undefined);
    scannerMock.stop.mockResolvedValue(undefined);
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn() } });
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
  });

  it("validates ticket A, allows entry, resets, and validates ticket B in the same session", async () => {
    const mockTicketA = {
      _id: "ticket-1",
      qrToken: "token-a",
      ticketCode: "PK-AAAA1111",
      status: "issued" as const,
      lot: { _id: "lot-1", name: "Downtown Lot" },
      reservation: { _id: "res-1", slot: { _id: "slot-1", label: "A1" } },
      user: { _id: "user-1", name: "Alice Driver" },
    };
    const mockTicketB = {
      _id: "ticket-2",
      qrToken: "token-b",
      ticketCode: "PK-BBBB2222",
      status: "entered" as const,
      lot: { _id: "lot-1", name: "Downtown Lot" },
      reservation: { _id: "res-2", slot: { _id: "slot-2", label: "B2" } },
      user: { _id: "user-2", name: "Bob Driver" },
    };

    vi.mocked(guardApi.validate).mockResolvedValueOnce({ valid: true, ticket: mockTicketA as any });
    vi.mocked(guardApi.entry).mockResolvedValueOnce({} as any);

    render(<GuardComponent />);

    // --- Ticket A ---
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Stop camera" });
    scannerMock.onDecoded?.("token-a");

    // Valid ticket A details rendered
    expect(await screen.findByText("VALID TICKET")).toBeInTheDocument();
    expect(screen.getByText("Alice Driver")).toBeInTheDocument();
    expect(screen.getByText("Downtown Lot")).toBeInTheDocument();

    // Confirm entry
    fireEvent.click(screen.getByRole("button", { name: /ALLOW ENTRY/i }));
    expect(await screen.findByText("ENTRY ALLOWED")).toBeInTheDocument();
    expect(guardApi.entry).toHaveBeenCalledWith("token-a");

    // Click "Scan next" to transition back to scanning
    fireEvent.click(screen.getByRole("button", { name: /Scan next/i }));
    expect(await screen.findByText("SCAN TICKET")).toBeInTheDocument();

    // --- Ticket B ---
    vi.mocked(guardApi.validate).mockResolvedValueOnce({ valid: true, ticket: mockTicketB as any });
    vi.mocked(guardApi.exit).mockResolvedValueOnce({} as any);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Stop camera" });
    scannerMock.onDecoded?.("token-b");

    // Valid ticket B details rendered
    expect(await screen.findByText("VALID TICKET")).toBeInTheDocument();
    expect(screen.getByText("Bob Driver")).toBeInTheDocument();

    // Confirm exit
    fireEvent.click(screen.getByRole("button", { name: /ALLOW EXIT/i }));
    expect(await screen.findByText("EXIT ALLOWED")).toBeInTheDocument();
    expect(guardApi.exit).toHaveBeenCalledWith("token-b");
  });

  it("handles failed validation gracefully and allows another scan immediately", async () => {
    const error = new AxiosError("Invalid QR code — ticket not found");
    error.response = { status: 404, data: { message: "Invalid QR code — ticket not found" } } as any;
    vi.mocked(guardApi.validate).mockRejectedValueOnce(error);

    render(<GuardComponent />);
    fireEvent.click(screen.getByRole("button", { name: "Type code" }));
    const input = screen.getByLabelText("Ticket code");
    fireEvent.change(input, { target: { value: "PK-UNKNOWN" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText("INVALID TICKET")).toBeInTheDocument();
    expect(screen.getByText("Invalid QR code — ticket not found")).toBeInTheDocument();

    // Guard clicks "Scan again"
    fireEvent.click(screen.getByRole("button", { name: /Scan again/i }));
    expect(await screen.findByText("SCAN TICKET")).toBeInTheDocument();

    // Can immediately enter another ticket
    const validTicket = {
      _id: "ticket-valid",
      qrToken: "token-valid",
      ticketCode: "PK-VALID99",
      status: "issued" as const,
      lot: { _id: "lot-1", name: "Central Garage" },
      reservation: { _id: "res-3", slot: { _id: "slot-3", label: "C3" } },
      user: { _id: "user-3", name: "Charlie Driver" },
    };
    vi.mocked(guardApi.validate).mockResolvedValueOnce({ valid: true, ticket: validTicket as any });

    fireEvent.click(screen.getByRole("button", { name: "Type code" }));
    const input2 = screen.getByLabelText("Ticket code");
    fireEvent.change(input2, { target: { value: "PK-VALID99" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText("VALID TICKET")).toBeInTheDocument();
    expect(screen.getByText("Charlie Driver")).toBeInTheDocument();
  });
});
