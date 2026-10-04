import { availableOf, occupiedOf, type Lot } from "@/lib/api";
import { rupees } from "./ui-kit";

export function LotTable({ lots }: { lots: Lot[] }) {
  if (lots.length === 0) return <p className="rounded-2xl border border-dashed border-input py-10 text-center text-muted-foreground">No parking lots yet</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {lots.map((l) => {
        const occ = occupiedOf(l);
        const pct = l.totalSlots > 0 ? Math.round((occ / l.totalSlots) * 100) : 0;
        return (
          <div key={l._id} className="rounded-2xl border border-border p-4">
            <div className="text-lg font-bold">{l.name}</div>
            <div className="truncate text-sm text-muted-foreground">{l.address}</div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-label="Occupied">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 text-center">
              <div><div className="text-xl font-black">{availableOf(l)}</div><div className="text-xs text-muted-foreground">Free</div></div>
              <div><div className="text-xl font-black">{occ}</div><div className="text-xs text-muted-foreground">Occupied</div></div>
              <div><div className="text-xl font-black">{rupees(l.hourlyRate)}</div><div className="text-xs text-muted-foreground">/ hour</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
