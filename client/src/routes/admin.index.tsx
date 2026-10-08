import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Car, CircleParking, IndianRupee, Plus, SquareParking } from "lucide-react";
import type { ReactNode } from "react";
import { adminApi, availableOf, errorMessage, occupiedOf } from "@/lib/api";
import { useAdminLive } from "@/lib/admin-live";
import { btnClass, Notice, PageTitle, rupees, Skel } from "@/components/ui-kit";
import { LotTable } from "@/components/LotTable";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  useAdminLive();
  const lots = useQuery({ queryKey: ["admin", "lots"], queryFn: adminApi.lots });
  const rev = useQuery({ queryKey: ["admin", "revenue"], queryFn: adminApi.revenue });
  const occ = useQuery({ queryKey: ["admin", "occupancy"], queryFn: adminApi.occupancy });

  const l = lots.data ?? [];
  const available = l.reduce((s, x) => s + availableOf(x), 0);
  const occupied = l.reduce((s, x) => s + occupiedOf(x), 0);
  const chart = (occ.data?.snapshots ?? []).map((p) => ({
    t: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    pct: p.totalSlots ? Math.round((p.occupiedCount / p.totalSlots) * 100) : 0,
    n: p.occupiedCount,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle>Dashboard</PageTitle>
        <Link to="/admin/lots/new" className={btnClass("primary", "md")}><Plus className="size-5" />Create Parking Lot</Link>
      </div>

      {lots.isError && <div className="mb-4"><Notice kind="error">{errorMessage(lots.error)}</Notice></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={<SquareParking className="size-6" />} label="Parking lots" value={lots.isLoading ? null : l.length} />
        <Metric icon={<CircleParking className="size-6" />} label="Free slots" value={lots.isLoading ? null : available} />
        <Metric icon={<Car className="size-6" />} label="Occupied" value={lots.isLoading ? null : occupied} />
        <Metric icon={<IndianRupee className="size-6" />} label="Revenue" value={rev.isLoading ? null : rev.isError ? "—" : rupees(Number.isFinite(rev.data?.totalRevenue) ? rev.data!.totalRevenue : 0)} dark />
      </div>

      <section className="mt-6 rounded-2xl border border-border p-5">
        <h2 className="mb-4 text-xl font-bold">Occupancy</h2>
        {occ.isLoading ? <Skel className="h-64" /> : occ.isError ? <Notice kind="error">{errorMessage(occ.error)}</Notice> : chart.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No data yet</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: "var(--color-muted-foreground)", fontSize: 13 }} tickLine={false} axisLine={false} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 13 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontFamily: "Figtree" }}
                  formatter={(v, _n, p) => [`${v}% (${(p.payload as { n: number }).n} cars)`, "Occupied"]} />
                <Area type="monotone" dataKey="pct" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="var(--color-chart-5)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Parking lots</h2>
        {lots.isLoading ? <Skel className="h-40" /> : <LotTable lots={l} />}
      </section>
    </div>
  );
}

function Metric({ icon, label, value, dark }: { icon: ReactNode; label: string; value: ReactNode | null; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-2xl bg-primary p-4 text-primary-foreground" : "rounded-2xl border border-border p-4"}>
      <div className="flex items-center gap-2 text-sm font-semibold opacity-80">{icon}{label}</div>
      <div className="mt-2 text-3xl font-black">{value ?? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" />}</div>
    </div>
  );
}
