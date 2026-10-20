import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scannerMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  camera: null as unknown,
  onDecoded: null as null | ((text: string) => void),
}));

vi.mock("html5-qrcode", () => ({
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5Qrcode: class {
    isScanning = false;
    constructor(_id: string, _config: unknown) {}
    start(...args: unknown[]) {
      scannerMock.camera = args[0];
      scannerMock.onDecoded = args[2] as (text: string) => void;
      return scannerMock.start().then(() => { this.isScanning = true; return null; });
    }
    stop() { this.isScanning = false; return scannerMock.stop(); }
    clear() { scannerMock.clear(); }
  },
}));

import { QrScanner } from "@/components/QrScanner";

describe("mobile QR scanner lifecycle", () => {
  beforeEach(() => {
    scannerMock.start.mockReset().mockResolvedValue(undefined);
    scannerMock.stop.mockReset().mockResolvedValue(undefined);
    scannerMock.clear.mockReset();
    scannerMock.camera = null;
    scannerMock.onDecoded = null;
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn() } });
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
  });

  it("does not initialize the camera until Start camera is pressed and asks for the rear camera", async () => {
    const view = render(<QrScanner onScan={() => {}} />);
    expect(scannerMock.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await waitFor(() => expect(scannerMock.start).toHaveBeenCalledOnce());
    expect(scannerMock.camera).toEqual({ facingMode: "environment" });
    expect(screen.getByRole("button", { name: "Stop camera" })).toBeInTheDocument();
    view.unmount();
  });

  it("reports permission denial and lets the guard keep using manual entry", async () => {
    scannerMock.start.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    render(<QrScanner onScan={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    expect(await screen.findByText(/Camera permission was denied/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start camera" })).toBeInTheDocument();
  });

  it("checks supported permission status before initializing the camera", async () => {
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: "denied" }) },
    });
    render(<QrScanner onScan={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    expect(await screen.findByText(/Camera permission is blocked/i)).toBeInTheDocument();
    expect(scannerMock.start).not.toHaveBeenCalled();
  });

  it("stops the camera stream when unmounted", async () => {
    const view = render(<QrScanner onScan={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Stop camera" });
    view.unmount();
    await waitFor(() => expect(scannerMock.stop).toHaveBeenCalledOnce());
  });

  it("submits only one decoded value while stopping the camera", async () => {
    const onScan = vi.fn().mockResolvedValue(undefined);
    render(<QrScanner onScan={onScan} />);
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Stop camera" });
    scannerMock.onDecoded?.("opaque-qr-token");
    scannerMock.onDecoded?.("second-value");
    await waitFor(() => expect(onScan).toHaveBeenCalledOnce());
    expect(onScan).toHaveBeenCalledWith("opaque-qr-token");
    expect(scannerMock.stop).toHaveBeenCalledOnce();
  });

  it("supports multiple consecutive start and stop lifecycles without getting stuck", async () => {
    const onScan = vi.fn().mockResolvedValue(undefined);
    const view = render(<QrScanner onScan={onScan} />);

    // First scan cycle
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Stop camera" });
    scannerMock.onDecoded?.("ticket-a");
    await waitFor(() => expect(onScan).toHaveBeenCalledWith("ticket-a"));
    expect(scannerMock.stop).toHaveBeenCalledOnce();

    // Second scan cycle in same mounted instance
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Stop camera" });
    scannerMock.onDecoded?.("ticket-b");
    await waitFor(() => expect(onScan).toHaveBeenCalledWith("ticket-b"));
    expect(scannerMock.stop).toHaveBeenCalledTimes(2);

    view.unmount();
  });
});
