import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LocateFixed, Plus } from "lucide-react";
import { errorMessage, lotsApi } from "@/lib/api";
import { Btn, btnClass, Field, Notice, PageTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/admin/lots/new")({ component: NewLot });

const empty = { name: "", address: "", latitude: "", longitude: "", hourlyRate: "", totalSlots: "" };

function NewLot() {
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const useHere = () => navigator.geolocation?.getCurrentPosition((p) =>
    setF((c) => ({ ...c, latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) })));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const lot = await lotsApi.create({
        name: f.name.trim(), address: f.address.trim(),
        latitude: Number(f.latitude), longitude: Number(f.longitude),
        hourlyRate: Number(f.hourlyRate), totalSlots: Number(f.totalSlots),
      });
      setCreated(lot?.name ?? f.name);
      setF(empty);
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { setErr(errorMessage(e, "Could not create parking lot.")); }
    finally { setBusy(false); }
  };

  if (created) return (
    <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center animate-pop">
      <div className="grid size-24 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-14" strokeWidth={3} /></div>
      <h1 className="mt-6 text-3xl font-black">Parking lot created successfully</h1>
      <p className="mt-2 text-lg text-muted-foreground">{created}</p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <Link to="/admin/lots" className={btnClass("primary")}>See all lots</Link>
        <Btn variant="secondary" onClick={() => setCreated(null)}><Plus className="size-5" />Add another</Btn>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5">
      <PageTitle>Create Parking Lot</PageTitle>
      {err && <Notice kind="error">{err}</Notice>}
      <Field label="Parking name" required value={f.name} onChange={set("name")} />
      <Field label="Address" required value={f.address} onChange={set("address")} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" type="number" step="any" min={-90} max={90} required value={f.latitude} onChange={set("latitude")} />
        <Field label="Longitude" type="number" step="any" min={-180} max={180} required value={f.longitude} onChange={set("longitude")} />
      </div>
      <Btn type="button" variant="secondary" size="md" onClick={useHere}><LocateFixed className="size-5" />Use my location</Btn>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hourly rate (₹)" type="number" min={0} step="any" required value={f.hourlyRate} onChange={set("hourlyRate")} />
        <Field label="Number of slots" type="number" min={1} max={1000} required value={f.totalSlots} onChange={set("totalSlots")} />
      </div>
      <Btn type="submit" loading={busy} className="w-full"><Plus className="size-6" />Create Parking Lot</Btn>
    </form>
  );
}
