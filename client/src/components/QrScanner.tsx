import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2, Square } from "lucide-react";

function cameraError(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (!window.isSecureContext) return "Camera access requires HTTPS or localhost. Open the secure review link, or enter the ticket code below.";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "Camera permission was denied. Allow camera access for this site in browser settings, then try again or enter the ticket code.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No camera was found. Enter the ticket code below.";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "The camera is busy or unavailable. Close other camera apps and try again, or enter the ticket code.";
  return "This browser could not start the camera. Use an up-to-date browser or enter the ticket code.";
}

function isScannerRunning(scanner: any): boolean {
  if (!scanner) return false;
  if (typeof scanner.getState === "function") {
    try {
      const state = scanner.getState();
      return state === 2 || state === 3;
    } catch {
      return false;
    }
  }
  return Boolean(scanner.isScanning);
}

function stopMediaTracks(containerId: string) {
  if (typeof document === "undefined") return;
  const container = document.getElementById(containerId);
  const video = container?.querySelector("video") as HTMLVideoElement | null;
  if (video?.srcObject && "getTracks" in (video.srcObject as MediaStream)) {
    (video.srcObject as MediaStream).getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  }
}

export function QrScanner({ onScan }: { onScan: (text: string) => void | Promise<void> }) {
  const id = useRef(`qr-${Math.random().toString(36).slice(2)}`).current;
  const [err, setErr] = useState("");
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const activeRef = useRef(false);
  const scanHandled = useRef(false);
  const mountedRef = useRef(true);
  const cb = useRef(onScan);
  cb.current = onScan;

  const stop = async () => {
    activeRef.current = false;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (scanner && isScannerRunning(scanner)) {
      try { await scanner.stop(); } catch { /* scanner may already have stopped */ }
    }
    try { scanner?.clear(); } catch { /* detached element */ }
    stopMediaTracks(id);
  };

  const start = async () => {
    if (starting || activeRef.current) return;
    setErr("");
    scanHandled.current = false;
    if (!window.isSecureContext) { setErr(cameraError(new Error("InsecureContextError"))); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setErr("Camera scanning is unsupported here. Enter the ticket code below."); return; }
    setStarting(true);
    try {
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (permission.state === "denied") {
            setErr("Camera permission is blocked for this site. Allow camera access in browser settings, then try again or enter the ticket code.");
            return;
          }
        } catch { /* Some browsers do not expose camera permission status. */ }
      }
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(id, { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (width, height) => {
          const edge = Math.max(160, Math.min(280, Math.floor(Math.min(width, height) * 0.78)));
          return { width: edge, height: edge };
        }, aspectRatio: 1, disableFlip: false },
        async (text) => {
          if (!activeRef.current || scanHandled.current) return;
          scanHandled.current = true;
          await stop();
          await cb.current(text);
        },
        () => { /* no QR in the current camera frame */ },
      );
      if (!mountedRef.current) {
        if (isScannerRunning(scanner)) await scanner.stop().catch(() => {});
        try { scanner.clear(); } catch {}
        stopMediaTracks(id);
        scannerRef.current = null;
        return;
      }
      activeRef.current = true;
      setScanning(true);
    } catch (error) {
      activeRef.current = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner && isScannerRunning(scanner)) { try { await scanner.stop(); } catch { /* startup cleanup */ } }
      try { scanner?.clear(); } catch { /* detached element */ }
      stopMediaTracks(id);
      if (mountedRef.current) setErr(cameraError(error));
    } finally { if (mountedRef.current) setStarting(false); }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRef.current = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner && isScannerRunning(scanner)) {
        scanner.stop().catch(() => {});
      }
      try { scanner?.clear(); } catch { /* unmount cleanup */ }
      stopMediaTracks(id);
    };
  }, [id]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(82vw,360px)] overflow-hidden rounded-3xl bg-foreground">
      <div id={id} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      {err ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto p-4 text-center text-primary-foreground">
          <CameraOff className="size-12 shrink-0" /><p className="text-sm font-semibold sm:text-base">{err}</p>
        </div>
      ) : scanning ? (
        <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-background/90" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-primary-foreground">
          <Camera className="size-12" /><p className="font-semibold">Camera starts when you tap below.</p>
        </div>
      )}
      <div className="absolute inset-x-3 bottom-3 flex justify-center">
        {scanning
          ? <button type="button" onClick={() => void stop()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-background px-4 font-semibold text-foreground"><Square className="size-4" />Stop camera</button>
          : <button type="button" onClick={() => void start()} disabled={starting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-background px-4 font-semibold text-foreground disabled:opacity-60">{starting ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}{starting ? "Starting camera…" : "Start camera"}</button>}
      </div>
    </div>
  );
}
