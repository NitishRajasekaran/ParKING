import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LocateFixed, MapPin, MapPinOff, Search, SquareParking, IndianRupee } from "lucide-react";
import { lotsApi, errorMessage, availableOf, type Lot } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { distanceKm, fmtKm } from "@/lib/hooks";
import { btnClass, Notice, PageTitle, Skel } from "@/components/ui-kit";

const LotMap = lazy(() => import("@/components/LotMap"));

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

export function FindParking({ focusSearch = false }: { focusSearch?: boolean }) {
  const [pos, setPos] = useState<[number, number]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("parking_last_pos");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length === 2 && Number.isFinite(parsed[0]) && Number.isFinite(parsed[1])) {
            return parsed as [number, number];
          }
        }
      } catch { /* ignore */ }
    }
    return DEFAULT_CENTER;
  });
  const [locErr, setLocErr] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const updatePos = useCallback((newPos: [number, number]) => {
    setPos(newPos);
    try { localStorage.setItem("parking_last_pos", JSON.stringify(newPos)); } catch { /* ignore */ }
  }, []);

  const locate = useCallback(() => {
    if (!window.isSecureContext) {
      setLocErr("Location access requires HTTPS or localhost. Showing default parking area; you can enter coordinates manually below.");
      return;
    }
    if (!navigator.geolocation) {
      setLocErr("This browser does not support location. Showing default parking area; you can enter coordinates manually below.");
      return;
    }
    if (navigator.permissions?.query) {
      void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
        if (permission.state === "denied") {
          setLocErr("Location is blocked in your browser. Showing default parking area; you can enter coordinates manually below.");
        }
      }).catch(() => { /* permissions query is optional */ });
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocErr("");
        updatePos([p.coords.latitude, p.coords.longitude]);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Showing default parking area; you can enter coordinates manually below."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Device location is unavailable. Showing default parking area; you can enter coordinates manually below."
            : "Location request timed out. Showing default parking area; you can enter coordinates manually below.";
        setLocErr(message);
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }, [updatePos]);

  // Automatically attempt location resolution on initial mount
  useEffect(() => {
    locate();
  }, [locate]);

  const useManualLocation = () => {
    const lat = Number(manualLat), lng = Number(manualLng);
    if (!manualLat || !manualLng || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocErr("Enter a valid latitude (−90 to 90) and longitude (−180 to 180).");
      return;
    }
    updatePos([lat, lng]);
    setLocErr("");
    setShowManual(false);
  };

  const handleViewportChange = useCallback((newCenter: [number, number]) => {
    setPos((old) => {
      const dist = distanceKm(old, newCenter);
      if (dist > 0.3) {
        try { localStorage.setItem("parking_last_pos", JSON.stringify(newCenter)); } catch { /* ignore */ }
        return newCenter;
      }
      return old;
    });
  }, []);

  const key = ["nearby", pos[0], pos[1]];
  const lots = useQuery({
    queryKey: key,
    queryFn: () => lotsApi.nearby(pos[0], pos[1]),
    staleTime: 30_000,
  });

  // Live availability counts
  useEffect(() => {
    const s = getSocket();
    const onAvail = (p: { lotId: string; availableCount: number }) =>
      qc.setQueryData<Lot[]>(key, (old) => old?.map((l) => (l._id === p.lotId ? { ...l, availableCount: p.availableCount, availableSlots: p.availableCount } : l)));
    s.on("lot:availability", onAvail);
    return () => { s.off("lot:availability", onAvail); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, pos[0], pos[1]]);

  const list = useMemo(() => {
    const all = (lots.data ?? []).map((l) => ({
      ...l,
      km: l.location ? distanceKm(pos, [l.location.coordinates[1], l.location.coordinates[0]]) : null,
    }));
    const f = q.trim().toLowerCase();
    return all
      .filter((l) => !f || l.name.toLowerCase().includes(f) || l.address?.toLowerCase().includes(f))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  }, [lots.data, pos, q]);

  const openLot = useCallback((id: string) => navigate({ to: "/driver/lots/$id", params: { id } }), [navigate]);

  return (
    <div>
      <PageTitle>Find Parking</PageTitle>

      <div className="mb-4 flex gap-2">
        <label className="flex h-12 flex-1 items-center gap-3 rounded-full bg-muted px-4 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-5 shrink-0" />
          <input autoFocus={focusSearch} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find parking"
            className="w-full bg-transparent text-lg placeholder:text-muted-foreground focus:outline-none" aria-label="Find parking" />
        </label>
        <button onClick={locate} aria-label="Use my location" title="Use my location" className="press grid size-12 place-items-center rounded-full border-2 border-foreground hover:bg-muted">
          <LocateFixed className="size-5" />
        </button>
      </div>

      {locErr && (
        <div className="mb-4 rounded-xl border border-border bg-muted/50 p-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPinOff className="size-4 shrink-0 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-muted-foreground">{locErr}</p>
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="mt-1 font-semibold underline underline-offset-2"
              >
                {showManual ? "Hide manual coordinates" : "Enter coordinates manually"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManual && (
        <div className="mb-4 rounded-2xl border border-border p-4 space-y-3 bg-background">
          <p className="text-sm font-semibold">Enter custom search coordinates</p>
          <div className="grid grid-cols-2 gap-2">
            <input inputMode="decimal" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Latitude" aria-label="Manual latitude" className="h-11 min-w-0 rounded-xl border-2 border-input px-3 text-sm" />
            <input inputMode="decimal" value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Longitude" aria-label="Manual longitude" className="h-11 min-w-0 rounded-xl border-2 border-input px-3 text-sm" />
          </div>
          <button onClick={useManualLocation} className={btnClass("secondary", "md")}>Set Search Location</button>
        </div>
      )}

      <div className="mb-6 h-64 overflow-hidden rounded-2xl border border-border md:h-96">
        <ClientOnly fallback={<Skel className="h-full rounded-none" />}>
          <Suspense fallback={<Skel className="h-full rounded-none" />}>
            <LotMap center={pos} lots={lots.data ?? []} onSelect={openLot} onViewportChange={handleViewportChange} />
          </Suspense>
        </ClientOnly>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">Nearby</h2>
        <span className="text-sm text-muted-foreground">Pan map to explore other areas</span>
      </div>

      {lots.isError && <Notice kind="error">{errorMessage(lots.error)}</Notice>}
      {lots.isLoading && <div className="grid gap-3 md:grid-cols-2"><Skel className="h-44" /><Skel className="h-44" /></div>}
      {lots.isSuccess && list.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input py-10 text-center">
          <SquareParking className="size-10" />
          <p className="text-lg font-semibold">No parking nearby</p>
          <p className="text-sm text-muted-foreground">Try dragging the map to search a different area, or use coordinates.</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((l) => (
          <Link key={l._id} to="/driver/lots/$id" params={{ id: l._id }}
            className="press flex flex-col rounded-2xl border border-border p-5 hover:border-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-bold">{l.name}</div>
                <div className="mt-1 flex items-center gap-1 text-base text-muted-foreground"><MapPin className="size-4" />{l.km != null ? fmtKm(l.km) : l.address}</div>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-xl font-black text-primary-foreground">P</span>
            </div>
            <div className="mt-4 flex gap-6">
              <div><div className="text-3xl font-black">{availableOf(l)}</div><div className="text-sm text-muted-foreground">spots free</div></div>
              <div><div className="flex items-center text-3xl font-black"><IndianRupee className="size-6" strokeWidth={3} />{l.hourlyRate}</div><div className="text-sm text-muted-foreground">per hour</div></div>
            </div>
            <span className={btnClass("primary", "md") + " mt-4 w-full"}>View Parking <ArrowRight className="size-5" /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
