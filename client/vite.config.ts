// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    // Vite is reachable from a phone on the same Wi-Fi; API and Socket.IO
    // remain same-origin and are proxied back to this laptop's Express server.
    server: {
      host: "0.0.0.0",
      // Permit the hostnames used by temporary HTTPS review tunnels. Keep the
      // tunnel short-lived and share its URL only with review participants.
      allowedHosts: [".trycloudflare.com", ".ngrok-free.app"],
      proxy: {
        "/api": { target: "http://127.0.0.1:5000", changeOrigin: true },
        "/socket.io": { target: "http://127.0.0.1:5000", changeOrigin: true, ws: true },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
