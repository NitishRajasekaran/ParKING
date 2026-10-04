import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

// Browser-only camera QR scanner. html5-qrcode is imported dynamically.
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const id = useRef(`qr-${Math.random().toString(36).slice(2)}`).current;
  const [err, setErr] = useState("");
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    let stopped = false;
    let inst: { stop: () => Promise<void>; isScanning?: boolean } | null = null;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (stopped) return;
      const s = new Html5Qrcode(id);
      inst = s;
      try {
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => { if (!stopped) { stopped = true; cb.current(text); } }, () => {});
      } catch {
        setErr("Camera is not available. Type the code below.");
      }
    })();
    return () => {
      stopped = true;
      if (inst?.isScanning) inst.stop().catch(() => {});
    };
  }, [id]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-foreground">
      <div id={id} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      {err ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-primary-foreground">
          <CameraOff className="size-12" /><p className="text-lg font-semibold">{err}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-background/90" />
      )}
    </div>
  );
}
