import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Trash2, Layers } from "lucide-react";
import { availableOf, occupiedOf, lotsApi, errorMessage, type Lot } from "@/lib/api";
import { rupees, Notice, Skel } from "./ui-kit";

export function LotTable({
  lots,
  onDeleteLot,
  canManageSlots = true,
}: {
  lots: Lot[];
  onDeleteLot?: (id: string) => Promise<void> | void;
  canManageSlots?: boolean;
}) {
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);

  if (lots.length === 0) {
    return <p className="rounded-2xl border border-dashed border-input py-10 text-center text-muted-foreground">No parking lots yet</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {lots.map((l) => (
        <LotCard
          key={l._id}
          lot={l}
          isExpanded={expandedLotId === l._id}
          onToggleExpand={() => setExpandedLotId((curr) => (curr === l._id ? null : l._id))}
          onDeleteLot={onDeleteLot}
          canManageSlots={canManageSlots}
        />
      ))}
    </div>
  );
}

function LotCard({
  lot,
  isExpanded,
  onToggleExpand,
  onDeleteLot,
  canManageSlots,
}: {
  lot: Lot;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDeleteLot?: (id: string) => Promise<void> | void;
  canManageSlots: boolean;
}) {
  const occ = occupiedOf(lot);
  const pct = lot.totalSlots > 0 ? Math.round((occ / lot.totalSlots) * 100) : 0;
  const [deletingLot, setDeletingLot] = useState(false);

  const handleDeleteLot = async () => {
    if (!window.confirm(`Are you sure you want to delete "${lot.name}"? This will delete all associated slots and data.`)) return;
    if (onDeleteLot) {
      setDeletingLot(true);
      try {
        await onDeleteLot(lot._id);
      } finally {
        setDeletingLot(false);
      }
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border p-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold">{lot.name}</div>
            <div className="truncate text-sm text-muted-foreground">{lot.address}</div>
          </div>
          {onDeleteLot && (
            <button
              type="button"
              disabled={deletingLot}
              onClick={() => void handleDeleteLot()}
              title="Delete parking lot"
              aria-label="Delete parking lot"
              className="rounded-lg border border-destructive/40 p-2 text-destructive hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-label="Occupied">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 grid grid-cols-3 text-center">
          <div><div className="text-xl font-black">{availableOf(lot)}</div><div className="text-xs text-muted-foreground">Free</div></div>
          <div><div className="text-xl font-black">{occ}</div><div className="text-xs text-muted-foreground">Occupied</div></div>
          <div><div className="text-xl font-black">{rupees(lot.hourlyRate)}</div><div className="text-xs text-muted-foreground">/ hour</div></div>
        </div>
      </div>

      {canManageSlots && (
        <div className="mt-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="size-4" />
              Manage Slots ({lot.totalSlots})
            </span>
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {isExpanded && <LotSlotsSection lotId={lot._id} />}
        </div>
      )}
    </div>
  );
}

function LotSlotsSection({ lotId }: { lotId: string }) {
  const qc = useQueryClient();
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ["lot-slots", lotId],
    queryFn: () => lotsApi.slots(lotId),
  });

  const handleDeleteSlot = async (slotId: string, label: string) => {
    if (!window.confirm(`Delete available slot "${label}"?`)) return;
    setDeletingSlotId(slotId);
    setErrorNotice(null);
    try {
      await lotsApi.deleteSlot(lotId, slotId);
      await qc.invalidateQueries({ queryKey: ["lot-slots", lotId] });
      await qc.invalidateQueries({ queryKey: ["admin", "lots"] });
      await qc.invalidateQueries({ queryKey: ["owner", "lots"] });
    } catch (e) {
      setErrorNotice(errorMessage(e, "Could not delete slot"));
    } finally {
      setDeletingSlotId(null);
    }
  };

  if (slotsQuery.isLoading) return <div className="mt-3"><Skel className="h-20" /></div>;
  if (slotsQuery.isError) return <div className="mt-3"><Notice kind="error">{errorMessage(slotsQuery.error)}</Notice></div>;

  const slots = slotsQuery.data ?? [];
  if (slots.length === 0) return <p className="mt-3 text-center text-xs text-muted-foreground">No slots found</p>;

  return (
    <div className="mt-3 space-y-2">
      {errorNotice && <Notice kind="error">{errorNotice}</Notice>}
      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
        {slots.map((s) => (
          <div key={s._id} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold">{s.label}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                s.status === "available"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : s.status === "occupied"
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}>
                {s.status}
              </span>
            </div>
            {s.status === "available" ? (
              <button
                type="button"
                disabled={deletingSlotId === s._id}
                onClick={() => void handleDeleteSlot(s._id, s.label)}
                className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                title="Delete slot"
                aria-label={`Delete slot ${s.label}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground">In Use</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
