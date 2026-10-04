import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Car, Check, Clock, IndianRupee, Lock, MapPin, QrCode, SquareParking } from "lucide-react";
import { errorMessage, reservationsApi, statusOf, type Slot, type SlotStatus, type Ticket } from "@/lib/api";
import { lotQuery, slotsQuery } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";
import { Btn, btnClass, Notice, Skel, Stat } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/driver/lots/$id")({ component: LotPage });

function LotPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const lot = useQuery(lotQuery(id));
  const slots = useQuery(slotsQuery(id));
  const [sel, setSel] = useState<Slot | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ ticket: Ticket; slot: Slot; at: string } | null>(null);

  // Live slot grid
  useEffect(() => {
    const s = getSocket();
    const join = () => s.emit("lot:join", { lotId: id });
    const onSlot = (p: { lotId: string; slotId: string; status: SlotStatus }) => {
      if (p.lotId !== id) return;
      qc.setQueryData<Slot[]>(["slots", id], (old) => old?.map((x) => (x._id === p.slotId ? { ...x, status: p.status } : x)));
      setSel((cur) => (cur && cur._id === p.slotId && p.status !== "available" ? null : cur));
    };
    const onAvail = (p: { lotId: string; available: number }) => {
      if (p.lotId === id) qc.setQueryData(["lot", id], (old: object | undefined) => (old ? { ...old, availableSlots: p.available } : old));
    };
    const onReconnect = () => { join(); qc.invalidateQueries({ queryKey: ["slots", id] }); };
    join();
    s.on("slot:updated", onSlot);
    s.on("lot:availability", onAvail);
    s.on("connect", onReconnect);
    return () => {
      s.emit("lot:leave", { lotId: id });
      s.off("slot:updated", onSlot); s.off("lot:availability", onAvail); s.off("connect", onReconnect);
    };
  }, [id, qc]);

  const rows = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots.data ?? []) {
      const k = s.label.match(/^[A-Za-z]+/)?.[0] ?? "";
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()].map(([k, v]) => [k, v.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))] as const);
  }, [slots.data]);

  const reserve = async () => {
    if (!sel) return;
    setBusy(true); setErr("");
    try {
      const r = await reservationsApi.create(id, sel._id);
      setDone({ ticket: r.ticket, slot: sel, at: r.reservation.createdAt });
      setConfirm(false); setSel(null);
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["slots", id] });
    } catch (e) {
      setConfirm(false); setSel(null);
      setErr(statusOf(e) === 409 ? "This slot was just taken. Please choose another slot." : errorMessage(e));
      qc.invalidateQueries({ queryKey: ["slots", id] });
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center animate-pop">
        <div className="grid size-24 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-14" strokeWidth={3} /></div>
        <h1 className="mt-6 text-3xl font-black">Parking Reserved</h1>
        <div className="mt-6 w-full space-y-4 rounded-2xl border border-border p-5 text-left">
          <Stat icon={<SquareParking className="size-6" />} label="Parking" value={lot.data?.name ?? "—"} />
          <Stat icon={<Car className="size-6" />} label="Slot" value={done.slot.label} />
          <Stat icon={<Clock className="size-6" />} label="Date / time" value={new Date(done.at || Date.now()).toLocaleString()} />
        </div>
        <Link to="/driver/tickets/$id" params={{ id: done.ticket._id }} className={btnClass("primary") + " mt-6 w-full"}>
          <QrCode className="size-6" />Show QR Ticket
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-0">
      <Link to="/driver" className="mb-4 inline-flex items-center gap-2 text-base font-semibold"><ArrowLeft className="size-5" />Back</Link>

      {lot.isLoading ? <Skel className="h-32" /> : lot.isError ? <Notice kind="error">{errorMessage(lot.error)}</Notice> : lot.data && (
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">{lot.data.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-base text-muted-foreground"><MapPin className="size-4" />{lot.data.address}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4"><div className="text-3xl font-black">{lot.data.availableSlots}</div><div className="text-sm text-muted-foreground">spots free of {lot.data.totalSlots}</div></div>
            <div className="rounded-2xl border border-border p-4"><div className="flex items-center text-3xl font-black"><IndianRupee className="size-6" strokeWidth={3} />{lot.data.hourlyRate}</div><div className="text-sm text-muted-foreground">per hour</div></div>
          </div>
        </div>
      )}

      {err && <div className="mb-4"><Notice kind="error">{err}</Notice></div>}

      <Legend />

      <div className="rounded-2xl border border-border p-4 md:p-6">
        <div className="mb-4 text-center text-sm font-bold tracking-[0.25em] text-muted-foreground">PARKING AREA</div>
        {slots.isLoading && <div className="grid grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-20" />)}</div>}
        {slots.isError && <Notice kind="error">{errorMessage(slots.error)}</Notice>}
        <div className="space-y-4">
          {rows.map(([row, list]) => (
            <div key={row} className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8">
              {list.map((s) => <SlotCell key={s._id} slot={s} selected={sel?._id === s._id} onPick={() => { setErr(""); setSel(sel?._id === s._id ? null : s); }} />)}
            </div>
          ))}
        </div>
      </div>

      {/* Sticky action */}
      <div className="fixed inset-x-0 bottom-20 z-[550] border-t border-border bg-background/95 p-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-24">
            <div className="text-sm text-muted-foreground">Selected</div>
            <div className="text-2xl font-black">{sel?.label ?? "—"}</div>
          </div>
          <Btn className="flex-1" disabled={!sel} onClick={() => setConfirm(true)}>Reserve Slot</Btn>
        </div>
      </div>

      {confirm && sel && lot.data && (
        <div className="fixed inset-0 z-[1000] grid place-items-end bg-foreground/40 sm:place-items-center" role="dialog" aria-modal="true" onClick={() => !busy && setConfirm(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-background p-6 animate-pop sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-black">Reserve {sel.label}?</h2>
            <div className="mt-5 space-y-4">
              <Stat icon={<SquareParking className="size-6" />} label="Parking" value={lot.data.name} />
              <Stat icon={<IndianRupee className="size-6" />} label="Rate" value={`₹${lot.data.hourlyRate} / hour`} />
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Btn loading={busy} onClick={reserve}><Check className="size-6" />Confirm Reservation</Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotCell({ slot, selected, onPick }: { slot: Slot; selected: boolean; onPick: () => void }) {
  const free = slot.status === "available";
  return (
    <button
      disabled={!free}
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${slot.label} ${selected ? "selected" : slot.status}`}
      className={cn(
        "press relative flex h-20 flex-col items-center justify-center overflow-hidden rounded-xl border-2 text-lg font-black transition-all duration-200",
        free && !selected && "border-foreground bg-background hover:bg-accent",
        selected && "scale-105 border-foreground bg-primary text-primary-foreground shadow-lg",
        slot.status === "reserved" && "border-strong bg-background text-foreground",
        slot.status === "occupied" && "pattern-solid border-strong text-primary-foreground",
      )}
    >
      {slot.status === "reserved" && <span className="pattern-stripes absolute inset-0 opacity-25" aria-hidden />}
      <span className="relative">{slot.label}</span>
      <span className="relative mt-0.5">
        {selected ? <Check className="size-5" strokeWidth={3} /> : slot.status === "reserved" ? <Lock className="size-4" /> : slot.status === "occupied" ? <Car className="size-5" /> : null}
      </span>
    </button>
  );
}

function Legend() {
  const items = [
    { label: "Free", box: <span className="size-6 rounded-md border-2 border-foreground" /> },
    { label: "Selected", box: <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground"><Check className="size-4" strokeWidth={3} /></span> },
    { label: "Reserved", box: <span className="relative grid size-6 place-items-center overflow-hidden rounded-md border-2 border-strong"><span className="pattern-stripes absolute inset-0 opacity-25" /><Lock className="relative size-3.5" /></span> },
    { label: "Occupied", box: <span className="pattern-solid grid size-6 place-items-center rounded-md text-primary-foreground"><Car className="size-4" /></span> },
  ];
  return (
    <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
      {items.map((i) => <span key={i.label} className="flex items-center gap-2 text-base font-semibold">{i.box}{i.label}</span>)}
    </div>
  );
}

