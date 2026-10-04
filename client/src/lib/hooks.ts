import { useQuery } from "@tanstack/react-query";
import { lotsApi, refId, refName, type Lot, type Slot } from "./api";

export const lotQuery = (id: string) => ({ queryKey: ["lot", id], queryFn: () => lotsApi.get(id), enabled: !!id, staleTime: 60_000 });
export const slotsQuery = (id: string) => ({ queryKey: ["slots", id], queryFn: () => lotsApi.slots(id), enabled: !!id });

/** Resolve display names for a lot + slot that may arrive as ids or populated objects. */
export function useLotSlotNames(lot: Parameters<typeof refId>[0], slot: Parameters<typeof refId>[0]) {
  const lotId = refId(lot);
  const slotId = refId(slot);
  const lotName = refName(lot);
  const slotLabel = refName(slot, "label");
  const lq = useQuery<Lot>({ ...lotQuery(lotId), enabled: !!lotId && !lotName });
  const sq = useQuery<Slot[]>({ ...slotsQuery(lotId), enabled: !!lotId && !slotLabel });
  return {
    lotName: lotName ?? lq.data?.name ?? "Parking",
    slotLabel: slotLabel ?? sq.data?.find((s) => s._id === slotId)?.label ?? "—",
    lot: lq.data,
  };
}

export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtKm = (k: number) => (k < 1 ? `${Math.round(k * 1000)} m` : `${k.toFixed(1)} km`);
