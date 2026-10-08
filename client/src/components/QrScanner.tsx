import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const id = useRef(`qr-${Math.random().toString(36).slice(2)}`).current;
  const [err, setErr] = useState("");
  const cb = useRef(onScan);

  cb.current = onScan;

  useEffect(() => {
    let stopped = false;
    let inst: any = null;

    const startScanner = async () => {
      try {
        const {
          Html5Qrcode,
          Html5QrcodeSupportedFormats,
        } = await import("html5-qrcode");

        if (stopped) return;

        const scanner = new Html5Qrcode(id);
        inst = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,

            qrbox: {
              width: 300,
              height: 300,
            },

            aspectRatio: 1.0,

            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
            ],

            disableFlip: false,
          },

          async (text) => {
            if (stopped) return;

            stopped = true;

            try {
              await scanner.stop();
            } catch {}

            cb.current(text);
          },

          () => {
            // QR not detected in this frame.
            // Keep scanning silently.
          }
        );
      } catch (error) {
        console.error("QR scanner error:", error);
        setErr("Camera is not available. Type the code below.");
      }
    };

    startScanner();

    return () => {
      stopped = true;

      if (inst?.isScanning) {
        inst.stop().catch(() => {});
      }
    };
  }, [id]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-foreground">
      <div
        id={id}
        className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />

      {err ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-primary-foreground">
          <CameraOff className="size-12" />
          <p className="text-lg font-semibold">{err}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-background/90" />
      )}
    </div>
  );
}