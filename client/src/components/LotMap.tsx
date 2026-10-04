import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Lot } from "@/lib/api";

// Browser-only: load via React.lazy behind <ClientOnly>.
export default function LotMap({ center, lots, onSelect }: { center: [number, number]; lots: Lot[]; onSelect?: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(center, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map.current);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { map.current?.setView(center); }, [center]);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    L.marker(center, {
      icon: L.divIcon({ className: "", html: '<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:5px solid #111"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(g);
    lots.forEach((lot) => {
      const c = lot.location?.coordinates; if (!c) return;
      const html = `<div style="display:flex;align-items:center;gap:4px;background:#111;color:#fff;font:700 13px Figtree,sans-serif;padding:5px 9px;border-radius:10px;white-space:nowrap;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">P · ${lot.availableSlots}</div>`;
      L.marker([c[1], c[0]], { icon: L.divIcon({ className: "", html, iconSize: [60, 28], iconAnchor: [30, 14] }), title: lot.name })
        .on("click", () => onSelect?.(lot._id)).addTo(g);
    });
  }, [lots, center, onSelect]);

  return <div ref={el} className="map-gray h-full w-full" />;
}
