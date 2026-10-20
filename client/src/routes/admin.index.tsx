import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Car, CircleParking, IndianRupee, Plus, ShieldCheck, SquareParking, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { adminApi, availableOf, errorMessage, occupiedOf, refId, type Lot, type StaffRole, type StaffUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAdminLive } from "@/lib/admin-live";
import { Btn, btnClass, Field, Notice, PageTitle, rupees, Skel } from "@/components/ui-kit";
import { LotTable } from "@/components/LotTable";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  useAdminLive();
  const { user: currentUser } = useAuth();
  const lots = useQuery({ queryKey: ["admin", "lots"], queryFn: adminApi.lots });
  const rev = useQuery({ queryKey: ["admin", "revenue"], queryFn: adminApi.revenue });
  const occ = useQuery({ queryKey: ["admin", "occupancy"], queryFn: adminApi.occupancy });
  const staff = useQuery({ queryKey: ["admin", "staff"], queryFn: adminApi.staff });
  const queryClient = useQueryClient();
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffAssignedLots, setStaffAssignedLots] = useState<string[]>([]);
  const [staffError, setStaffError] = useState("");
  const [staffNotice, setStaffNotice] = useState("");
  const [staffBusy, setStaffBusy] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [purgingTickets, setPurgingTickets] = useState(false);
  const [masterNotice, setMasterNotice] = useState("");
  const [masterError, setMasterError] = useState("");

  const l = lots.data ?? [];
  const available = l.reduce((s, x) => s + availableOf(x), 0);
  const occupied = l.reduce((s, x) => s + occupiedOf(x), 0);
  const chart = (occ.data?.snapshots ?? []).map((p) => ({
    t: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    pct: p.totalSlots ? Math.round((p.occupiedCount / p.totalSlots) * 100) : 0,
    n: p.occupiedCount,
  }));

  const handlePurgeTickets = async () => {
    if (!window.confirm("Purge ALL completed/exited tickets across the entire platform? Active tickets will not be affected.")) return;
    setPurgingTickets(true);
    setMasterNotice("");
    setMasterError("");
    try {
      const res = await adminApi.clearUsedTickets();
      setMasterNotice(`Successfully purged ${res.deletedCount} used ticket(s).`);
    } catch (e) {
      setMasterError(errorMessage(e, "Could not purge used tickets"));
    } finally {
      setPurgingTickets(false);
    }
  };

  const handleDeleteStaff = async (member: StaffUser) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${member.name}" (${member.email})?`)) return;
    setDeletingStaffId(member._id);
    setStaffError("");
    setStaffNotice("");
    try {
      await adminApi.deleteStaff(member._id);
      setStaffNotice(`Staff member "${member.name}" has been removed.`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    } catch (e) {
      setStaffError(errorMessage(e, "Could not remove staff account"));
    } finally {
      setDeletingStaffId(null);
    }
  };

  const handleDeleteLot = async (lotId: string) => {
    setMasterError("");
    try {
      await adminApi.deleteLot(lotId);
      await queryClient.invalidateQueries({ queryKey: ["admin", "lots"] });
      setMasterNotice("Parking lot deleted successfully.");
    } catch (e) {
      setMasterError(errorMessage(e, "Could not delete parking lot"));
    }
  };

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

      <section className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-destructive">Master Controls</h2>
            <p className="text-sm text-muted-foreground">Platform-level maintenance and cleanup actions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              variant="secondary"
              size="md"
              loading={purgingTickets}
              onClick={() => void handlePurgeTickets()}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Purge All Used Tickets
            </Btn>
          </div>
        </div>
        {masterNotice && <div className="mt-3"><Notice kind="success">{masterNotice}</Notice></div>}
        {masterError && <div className="mt-3"><Notice kind="error">{masterError}</Notice></div>}
      </section>

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

      <section className="mt-6 rounded-2xl border border-border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Staff Management</h2>
            <p className="text-sm text-muted-foreground">Create Admin and Guard accounts, or remove staff.</p>
          </div>
          <div className="flex gap-2">
            <Btn size="md" variant={staffRole === "guard" ? "primary" : "secondary"} onClick={() => { setStaffRole("guard"); setStaffAssignedLots([]); setStaffError(""); setStaffNotice(""); }}><ShieldCheck className="size-5" />Create Guard</Btn>
            <Btn size="md" variant={staffRole === "platform_admin" ? "primary" : "secondary"} onClick={() => { setStaffRole("platform_admin"); setStaffAssignedLots([]); setStaffError(""); setStaffNotice(""); }}><Plus className="size-5" />Create Admin</Btn>
          </div>
        </div>
        {staffError && <div className="mb-4"><Notice kind="error">{staffError}</Notice></div>}
        {staffNotice && <div className="mb-4"><Notice kind="success">{staffNotice}</Notice></div>}
        {staffRole && (
          <form className="mb-5 grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2" onSubmit={async (e) => {
            e.preventDefault(); setStaffError(""); setStaffNotice(""); setStaffBusy(true);
            try {
              if (staffRole === "guard" && !staffAssignedLots.length) {
                setStaffError("Assign at least one parking lot to this guard.");
                setStaffBusy(false);
                return;
              }
              await adminApi.createStaff({ name: staffName.trim(), email: staffEmail.trim(), password: staffPassword, role: staffRole, ...(staffRole === "guard" ? { assignedLots: staffAssignedLots } : {}) });
              setStaffName(""); setStaffEmail(""); setStaffPassword("");
              setStaffAssignedLots([]);
              setStaffNotice(`${staffRole === "guard" ? "Guard" : "Admin"} account created.`);
              await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
            } catch (e) {
              setStaffError(errorMessage(e, "Could not create staff account."));
            } finally { setStaffBusy(false); }
          }}>
            <div className="sm:col-span-2 text-sm font-bold">New {staffRole === "guard" ? "Guard" : "Admin"} account</div>
            <Field label="Name" autoComplete="name" required value={staffName} onChange={(e) => setStaffName(e.target.value)} />
            <Field label="Email" type="email" autoComplete="email" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
            <Field label="Password" type="password" autoComplete="new-password" minLength={8} required value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
            {staffRole === "guard" && <div className="sm:col-span-2"><p className="mb-2 text-sm font-bold">Assign parking lots</p>{l.length ? <div className="flex flex-wrap gap-2">{l.map((lot) => <label key={lot._id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input type="checkbox" checked={staffAssignedLots.includes(lot._id)} onChange={() => setStaffAssignedLots((old) => old.includes(lot._id) ? old.filter((id) => id !== lot._id) : [...old, lot._id])} />{lot.name}</label>)}</div> : <p className="text-sm text-muted-foreground">Create a parking lot before adding a guard.</p>}</div>}
            <div className="flex items-end"><Btn type="submit" size="md" loading={staffBusy} className="w-full">Create {staffRole === "guard" ? "Guard" : "Admin"}</Btn></div>
          </form>
        )}
        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-bold">Existing staff accounts</h3>
          {staff.isLoading ? <p className="text-sm text-muted-foreground">Loading staff...</p> : staff.isError ? <Notice kind="error">{errorMessage(staff.error)}</Notice> : staff.data?.length ? (
            <ul className="divide-y divide-border">
              {staff.data.map((member) => (
                <li key={member._id} className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="min-w-0 truncate font-semibold">
                      {member.name} <span className="font-normal text-muted-foreground">({member.email})</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs capitalize">{member.role}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {member.role === "guard" && <GuardAssignmentEditor member={member} lots={l} />}
                    {member._id !== currentUser?._id && (
                      <button
                        type="button"
                        disabled={deletingStaffId === member._id}
                        onClick={() => void handleDeleteStaff(member)}
                        className="rounded-lg border border-destructive/40 p-2 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        title="Remove staff member"
                        aria-label={`Remove staff member ${member.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No staff accounts yet.</p>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Parking lots</h2>
        {lots.isLoading ? <Skel className="h-40" /> : <LotTable lots={l} onDeleteLot={handleDeleteLot} />}
      </section>
    </div>
  );
}

function GuardAssignmentEditor({ member, lots }: { member: StaffUser; lots: Lot[] }) {
  const queryClient = useQueryClient();
  const initial = () => (member.assignedLots ?? []).map(refId).filter(Boolean);
  const [selected, setSelected] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelected((member.assignedLots ?? []).map(refId).filter(Boolean));
  }, [member.assignedLots]);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      await adminApi.assignGuardLots(member._id, selected);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      setMessage(selected.length ? "Assignments saved" : "Guard access paused until a lot is assigned");
    } catch (error) { setMessage(errorMessage(error, "Could not update guard lots.")); }
    finally { setBusy(false); }
  };

  return <div className="w-full rounded-xl bg-muted p-3 sm:max-w-lg">
    <div className="mb-2 font-bold">Guard lot access</div>
    {lots.length ? <div className="flex flex-wrap gap-2">{lots.map((lot) => <label key={lot._id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"><input type="checkbox" checked={selected.includes(lot._id)} onChange={() => setSelected((old) => old.includes(lot._id) ? old.filter((id) => id !== lot._id) : [...old, lot._id])} />{lot.name}</label>)}</div> : <p className="text-muted-foreground">No parking lots are available.</p>}
    <div className="mt-2 flex flex-wrap items-center gap-3"><Btn type="button" size="md" loading={busy} disabled={!lots.length} onClick={() => void save()}>Save assignments</Btn>{message && <span role="status" className="text-sm">{message}</span>}</div>
  </div>;
}

function Metric({ icon, label, value, dark }: { icon: ReactNode; label: string; value: ReactNode | null; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-2xl bg-primary p-4 text-primary-foreground" : "rounded-2xl border border-border p-4"}>
      <div className="flex items-center gap-2 text-sm font-semibold opacity-80">{icon}{label}</div>
      <div className="mt-2 text-3xl font-black">{value ?? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" />}</div>
    </div>
  );
}
