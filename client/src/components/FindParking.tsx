import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LocateFixed, MapPin, MapPinOff, Search, SquareParking, IndianRupee } from "lucide-react";
import { lotsApi, errorMessage, type Lot } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { distanceKm, fmtKm } from "@/lib/hooks";
import { btnClass, Notice, PageTitle, Skel } from "@/components/ui-kit";

const LotMap = lazy(() => import("@/components/LotMap"));

export function FindParking({ focusSearch = false }: { focusSearch?: boolean }) {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [locErr, setLocErr] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const locate = useCallback(() => {
    if (!navigator.geolocation) { setLocErr(true); return; }
    setLocErr(false);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocErr(false); setPos([p.coords.latitude, p.coords.longitude]); },
      () => { setLocErr(true); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);
  useEffect(locate, [locate]);

  const key = ["nearby", pos?.[0], pos?.[1]];
  const lots = useQuery({ queryKey: key, queryFn: () => lotsApi.nearby(pos![0], pos![1]), enabled: !!pos });

  // Live availability counts
  useEffect(() => {
    const s = getSocket();
    const onAvail = (p: { lotId: string; available: number }) =>
      qc.setQueryData<Lot[]>(key, (old) => old?.map((l) => (l._id === p.lotId ? { ...l, availableSlots: p.available } : l)));
    s.on("lot:availability", onAvail);
    return () => { s.off("lot:availability", onAvail); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, pos?.[0], pos?.[1]]);

  const list = useMemo(() => {
    const all = (lots.data ?? []).map((l) => ({
      ...l,
      km: pos && l.location ? distanceKm(pos, [l.location.coordinates[1], l.location.coordinates[0]]) : null,
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
        <button onClick={locate} aria-label="Use my location" className="press grid size-12 place-items-center rounded-full border-2 border-foreground">
          <LocateFixed className="size-5" />
        </button>
      </div>

      {locErr && !pos && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-foreground px-5 py-10 text-center" role="alert">
          <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground"><MapPinOff className="size-8" /></span>
          <div>
            <p className="text-xl font-bold">Location needed</p>
            <p className="mt-1 text-base text-muted-foreground">Turn on location to find parking near you.</p>
          </div>
          <button onClick={locate} className={btnClass("primary")}><LocateFixed className="size-5" />Enable Location</button>
          <p className="text-sm text-muted-foreground">If nothing happens, allow location in your browser settings.</p>
        </div>
      )}
      {!(locErr && !pos) && (<>

      <div className="mb-6 h-64 overflow-hidden rounded-2xl border border-border md:h-96">
        {pos ? (
          <ClientOnly fallback={<Skel className="h-full rounded-none" />}>
            <Suspense fallback={<Skel className="h-full rounded-none" />}>
              <LotMap center={pos} lots={lots.data ?? []} onSelect={openLot} />
            </Suspense>
          </ClientOnly>
        ) : <Skel className="h-full rounded-none" />}
      </div>

      <h2 className="mb-3 text-xl font-bold">Nearby</h2>
      {lots.isError && <Notice kind="error">{errorMessage(lots.error)}</Notice>}
      {(lots.isLoading || !pos) && <div className="grid gap-3 md:grid-cols-2"><Skel className="h-44" /><Skel className="h-44" /></div>}
      {lots.isSuccess && list.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input py-10 text-center">
          <SquareParking className="size-10" />
          <p className="text-lg font-semibold">No parking nearby</p>
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
              <div><div className="text-3xl font-black">{l.availableSlots}</div><div className="text-sm text-muted-foreground">spots free</div></div>
              <div><div className="flex items-center text-3xl font-black"><IndianRupee className="size-6" strokeWidth={3} />{l.hourlyRate}</div><div className="text-sm text-muted-foreground">per hour</div></div>
            </div>
            <span className={btnClass("primary", "md") + " mt-4 w-full"}>View Parking <ArrowRight className="size-5" /></span>
          </Link>
        ))}
      </div>
      </>)}
    </div>
  );
}
