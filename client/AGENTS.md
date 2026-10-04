<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Frontend only; the existing Express/MongoDB/Socket.io backend at `VITE_API_URL` owns all data — never add a backend, Supabase, or mock APIs.
- All REST calls live in `src/lib/api.ts` (Axios, Bearer JWT from localStorage) and must match the user's backend contract exactly — no invented endpoints.
- Socket.io (`src/lib/socket.ts`) is receive-only for live updates; REST performs every change.
- Role sections `/driver`, `/guard`, `/admin` are `ssr: false` layouts gated client-side by `RoleShell`, because the JWT lives in localStorage.
- Leaflet and html5-qrcode are imported only in browser-only modules (lazy/dynamic) to keep SSR safe.
