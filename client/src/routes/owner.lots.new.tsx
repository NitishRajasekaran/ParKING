import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LocateFixed, Plus } from "lucide-react";
import { ownerApi, errorMessage } from "@/lib/api";
import { Btn, btnClass, Field, Notice, PageTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/owner/lots/new")({ component: NewOwnerLot });
const empty = { name: "", address: "", latitude: "", longitude: "", hourlyRate: "", totalSlots: "" };
function NewOwnerLot() {
  const qc = useQueryClient(); const [form, setForm] = useState(empty); const [error, setError] = useState(""); const [created, setCreated] = useState(""); const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((old) => ({ ...old, [key]: e.target.value }));
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setForm((old) => ({ ...old, latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) })));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setError(""); setBusy(true); try { const lot = await ownerApi.createLot({ name: form.name.trim(), address: form.address.trim(), latitude: Number(form.latitude), longitude: Number(form.longitude), hourlyRate: Number(form.hourlyRate), totalSlots: Number(form.totalSlots) }); setCreated(lot.name); setForm(empty); await qc.invalidateQueries({ queryKey: ["owner"] }); } catch (err) { setError(errorMessage(err, "Could not create parking lot.")); } finally { setBusy(false); } };
  if (created) return <div className="mx-auto max-w-lg py-8 text-center"><PageTitle>Parking lot created</PageTitle><p className="mb-6">{created}</p><Link to="/owner" className={btnClass("primary")}>Return to Owner Overview</Link></div>;
  return <form onSubmit={submit} className="mx-auto max-w-xl space-y-4"><PageTitle>Create Parking Lot</PageTitle>{error && <Notice kind="error">{error}</Notice>}<Field label="Parking name" required value={form.name} onChange={change("name")} /><Field label="Address" required value={form.address} onChange={change("address")} /><div className="grid grid-cols-2 gap-3"><Field label="Latitude" type="number" step="any" min={-90} max={90} required value={form.latitude} onChange={change("latitude")} /><Field label="Longitude" type="number" step="any" min={-180} max={180} required value={form.longitude} onChange={change("longitude")} /></div><Btn type="button" variant="secondary" size="md" onClick={locate}><LocateFixed className="size-5" />Use my location</Btn><div className="grid grid-cols-2 gap-3"><Field label="Hourly rate" type="number" min={0} step="any" required value={form.hourlyRate} onChange={change("hourlyRate")} /><Field label="Number of slots" type="number" min={1} max={260} required value={form.totalSlots} onChange={change("totalSlots")} /></div><Btn type="submit" loading={busy} className="w-full"><Plus className="size-5" />Create Parking Lot</Btn></form>;
}
