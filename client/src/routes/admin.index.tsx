import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Ban, Car, Check, CircleParking, IndianRupee, KeyRound, Plus, ShieldCheck, SquareParking, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { adminApi, availableOf, errorMessage, occupiedOf, refId, type AdminRequest, type Lot, type StaffRole, type StaffUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAdminLive } from "@/lib/admin-live";
import { getSocket } from "@/lib/socket";
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

      <VerificationRequestsSection />

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

function VerificationRequestsSection() {
  const qc = useQueryClient();
  const requests = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => adminApi.requests(),
    refetchInterval: 5000,
  });

  const [filterType, setFilterType] = useState<"all" | "password_reset" | "slot_cancellation">("all");
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["admin", "requests"] });
      void qc.invalidateQueries({ queryKey: ["admin", "lots"] });
    };
    s.on("admin:request:created", refresh);
    s.on("admin:request:updated", refresh);
    return () => {
      s.off("admin:request:created", refresh);
      s.off("admin:request:updated", refresh);
    };
  }, [qc]);

  const allList = requests.data ?? [];
  const pendingCount = allList.filter((r) => r.status === "pending").length;

  const filtered = allList.filter((r) => {
    if (showOnlyPending && r.status !== "pending") return false;
    if (filterType !== "all" && r.type !== filterType) return false;
    return true;
  });

  const handleApprove = async (req: AdminRequest) => {
    const label = req.type === "password_reset" ? "Approve password reset" : "Approve slot cancellation";
    if (!window.confirm(`${label} for ${req.userName || req.userEmail}?`)) return;
    setActionBusyId(req._id);
    setNotice(null);
    setErrorNotice(null);
    try {
      const res = await adminApi.approveRequest(req._id);
      setNotice(res.message);
      await qc.invalidateQueries({ queryKey: ["admin", "requests"] });
      await qc.invalidateQueries({ queryKey: ["admin", "lots"] });
    } catch (e) {
      setErrorNotice(errorMessage(e, "Could not approve request"));
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReject = async (req: AdminRequest) => {
    const reason = window.prompt("Reason for rejection (optional):");
    if (reason === null) return;
    setActionBusyId(req._id);
    setNotice(null);
    setErrorNotice(null);
    try {
      const res = await adminApi.rejectRequest(req._id, reason);
      setNotice(res.message);
      await qc.invalidateQueries({ queryKey: ["admin", "requests"] });
    } catch (e) {
      setErrorNotice(errorMessage(e, "Could not reject request"));
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Admin Verification Requests</h2>
            {pendingCount > 0 ? (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                {pendingCount} Pending
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                All Cleared
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Verify password resets and reserved slot cancellations requested by drivers, owners, and guards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`rounded-md px-2.5 py-1 ${filterType === "all" ? "bg-background shadow font-bold" : "text-muted-foreground"}`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setFilterType("password_reset")}
              className={`rounded-md px-2.5 py-1 ${filterType === "password_reset" ? "bg-background shadow font-bold" : "text-muted-foreground"}`}
            >
              Password Reset
            </button>
            <button
              type="button"
              onClick={() => setFilterType("slot_cancellation")}
              className={`rounded-md px-2.5 py-1 ${filterType === "slot_cancellation" ? "bg-background shadow font-bold" : "text-muted-foreground"}`}
            >
              Slot Cancellation
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowOnlyPending(!showOnlyPending)}
            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
              showOnlyPending ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {showOnlyPending ? "Pending Only" : "Show All"}
          </button>
        </div>
      </div>

      {notice && <div className="mt-4"><Notice kind="success">{notice}</Notice></div>}
      {errorNotice && <div className="mt-4"><Notice kind="error">{errorNotice}</Notice></div>}

      {requests.isLoading ? (
        <div className="mt-4 space-y-2"><Skel className="h-20" /><Skel className="h-20" /></div>
      ) : requests.isError ? (
        <div className="mt-4"><Notice kind="error">{errorMessage(requests.error)}</Notice></div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-input py-8 text-center text-sm text-muted-foreground">
          {showOnlyPending ? "No pending verification requests." : "No requests found."}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {filtered.map((item) => {
            const isPassword = item.type === "password_reset";
            const lotObj = item.lot && typeof item.lot === "object" ? (item.lot as any) : undefined;
            const slotObj = item.slot && typeof item.slot === "object" ? (item.slot as any) : undefined;
            const ticketObj = item.ticket && typeof item.ticket === "object" ? (item.ticket as any) : undefined;
            const userObj = item.user && typeof item.user === "object" ? (item.user as any) : undefined;

            return (
              <div key={item._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`mt-1 grid size-9 shrink-0 place-items-center rounded-xl ${
                    isPassword ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  }`}>
                    {isPassword ? <KeyRound className="size-4" /> : <Ban className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm">
                        {isPassword ? "Password Reset Request" : "Reserved Slot Cancellation"}
                      </span>
                      <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold uppercase">
                        {item.userRole}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                        item.status === "pending"
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          : item.status === "approved"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      Requested by: <b className="text-foreground">{item.userName || userObj?.name || item.userEmail}</b> ({item.userEmail}) • {new Date(item.createdAt).toLocaleString()}
                    </div>

                    {!isPassword && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {lotObj?.name && <span className="font-semibold text-foreground">Lot: {lotObj.name}</span>}
                        {slotObj?.label && <span className="font-semibold text-primary">Slot: {slotObj.label}</span>}
                        {ticketObj?.ticketCode && <span className="text-muted-foreground">Ticket: {ticketObj.ticketCode}</span>}
                        {item.reason && <span className="italic text-muted-foreground">Reason: "{item.reason}"</span>}
                      </div>
                    )}

                    {item.status !== "pending" && item.reviewedAt && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.status === "approved" ? "Verified & Approved" : "Rejected"} on {new Date(item.reviewedAt).toLocaleString()}
                        {item.reviewNotes && ` (${item.reviewNotes})`}
                      </div>
                    )}
                  </div>
                </div>

                {item.status === "pending" && (
                  <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                    <Btn
                      size="md"
                      loading={actionBusyId === item._id}
                      onClick={() => void handleApprove(item)}
                      className="h-9 px-3 text-xs"
                    >
                      <Check className="size-3.5" />
                      {isPassword ? "Approve Reset" : "Approve & Release Slot"}
                    </Btn>
                    <button
                      type="button"
                      disabled={actionBusyId === item._id}
                      onClick={() => void handleReject(item)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-destructive/40 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <X className="size-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
