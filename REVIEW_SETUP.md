# ParKING college review setup

## Start locally on the same Wi-Fi

1. In PowerShell window 1:

   ```powershell
   cd E:\Projects\ParKING\server
   npm run dev
   ```

   The backend reads the existing `server/.env` for the database and signing secrets. Keep that file private.

2. In PowerShell window 2:

   ```powershell
   cd E:\Projects\ParKING\client
   npm run dev
   ```

   Vite listens on the laptop network interface and proxies `/api` and `/socket.io` to `127.0.0.1:5000`. Development ignores `VITE_API_URL`, so no laptop IP has to be stored in frontend source or `.env.local`.

3. Connect the phone to the same Wi-Fi. Run `ipconfig` on Windows and use the laptop's IPv4 address for that Wi-Fi adapter, then open `http://<that-ip>:8080` in the phone browser. Allow the Windows firewall prompt for Node/Vite on the private network if it appears.

   Plain HTTP on a LAN is not a secure browser context on most phones. Geolocation and camera access may therefore be blocked. Use the temporary HTTPS option below for the full camera/location demonstration. Driver parking search also offers manual latitude/longitude entry.

## Temporary HTTPS review link

`cloudflared` was not available in the development environment, so a tunnel has not been started or tested. If you install Cloudflare Tunnel, run the backend and Vite as above, then in a third PowerShell window run:

```powershell
cloudflared tunnel --url http://localhost:8080
```

Open the generated `https://….trycloudflare.com` URL on the phone. The tunnel targets only Vite; Vite proxies API and WebSocket requests to the laptop backend, so port 5000 does not need a public listener. The URL is public to anyone who obtains it: use it only for the review, do not expose credentials, and stop it with Ctrl+C afterward. Cloudflare account/access configuration is needed if the link must be restricted to named reviewers. The app's existing login, role checks, and guard lot checks remain active.

For ngrok, the same local Vite target can be used with `ngrok http 8080`; use its HTTPS URL and restrict the audience with the ngrok account controls when needed.

## Demonstrate reservation to guard validation

1. If this database has no Platform Admin, open **Staff Login** and use **Set Up First Platform Admin** with credentials you choose. This setup link closes after the first Platform Admin is created.
2. In the Admin Dashboard, create a parking lot, then create a Guard and select the lot. Existing guards can be assigned through **Guard lot access**. An unassigned legacy guard is denied ticket and socket room access until a Platform Admin or Owner assigns at least one lot.
3. On the phone, open `/register` and create a Driver account, then sign in.
4. Tap the location control and allow location, or enter coordinates manually. Choose a parking lot and an available slot, then reserve it.
5. Open **Show QR Ticket**. Keep the QR visible; the copyable `Ticket code` is a manual fallback. The QR retains the original opaque token payload.
6. Sign out from the mobile header and sign in with the assigned Guard account. Open **Scan Ticket**, tap **Start camera**, and allow camera access. Scan the driver's ticket QR, or tap **Type code** and enter the displayed code.
7. Confirm the lot, slot, and driver. Tap **ALLOW ENTRY**. For exit, scan or enter the same ticket again and tap **ALLOW EXIT**. The slot and ticket state update through the existing backend and live Socket.IO events.

Camera and location permissions are controlled by the phone browser. If denied, use the site information/permissions controls in the browser address bar or site settings, enable Camera/Location, then reload. No browser permission is bypassed by this application.
