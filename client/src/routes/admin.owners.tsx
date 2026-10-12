import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, errorMessage, refId } from "@/lib/api";
import { Btn, Card, Notice, PageTitle, Skel } from "@/components/ui-kit";

export const Route = createFileRoute("/admin/owners")({ component: OwnerManagement });
function OwnerManagement() {
  const qc = useQueryClient(); const pending = useQuery({ queryKey: ["admin", "owners", "pending"], queryFn: adminApi.pendingOwners });
  const owners = useQuery({ queryKey: ["admin", "owners", "approved"], queryFn: () => adminApi.owners("approved") }); const lots = useQuery({ queryKey: ["admin", "lots"], queryFn: adminApi.lots }); const [error, setError] = useState("");
  const act = async (id: string, action: "approve" | "reject") => { setError(""); try { await (action === "approve" ? adminApi.approveOwner(id) : adminApi.rejectOwner(id)); await Promise.all([qc.invalidateQueries({ queryKey: ["admin", "owners"] }), qc.invalidateQueries({ queryKey: ["admin", "lots"] })]); } catch (err) { setError(errorMessage(err)); } };
  const assign = async (lotId: string, ownerId: string) => { setError(""); try { await adminApi.assignLotOwner(lotId, ownerId || null); await qc.invalidateQueries({ queryKey: ["admin", "lots"] }); } catch (err) { setError(errorMessage(err)); } };
  return <div><PageTitle sub="Review owner applications and assign approved owners to parking lots.">Owner Management</PageTitle>{error && <Notice kind="error">{error}</Notice>}
    <section><h2 className="mb-3 text-xl font-bold">Pending applications</h2>{pending.isLoading ? <Skel className="h-20" /> : pending.isError ? <Notice kind="error">{errorMessage(pending.error)}</Notice> : pending.data?.length ? <div className="space-y-3">{pending.data.map((owner) => <Card key={owner._id}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-bold">{owner.name}</div><div className="text-sm text-muted-foreground">{owner.email}</div></div><div className="flex gap-2"><Btn size="md" onClick={() => act(owner._id, "approve")}>Approve</Btn><Btn size="md" variant="secondary" onClick={() => act(owner._id, "reject")}>Reject</Btn></div></div></Card>)}</div> : <p className="text-sm text-muted-foreground">No pending applications.</p>}</section>
    <section className="mt-6"><h2 className="mb-3 text-xl font-bold">Assign parking lots</h2>{owners.isError && <Notice kind="error">{errorMessage(owners.error)}</Notice>}{lots.isError && <Notice kind="error">{errorMessage(lots.error)}</Notice>}{lots.isLoading || owners.isLoading ? <Skel className="h-20" /> : (lots.data ?? []).map((lot) => <div key={lot._id} className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><div className="font-bold">{lot.name}</div><div className="text-sm text-muted-foreground">{lot.address}</div></div><select aria-label={"Owner for " + lot.name} className="h-11 min-w-48 rounded-lg border border-input bg-background px-3" value={refId(lot.owner ?? undefined)} onChange={(e) => assign(lot._id, e.target.value)}><option value="">Unassigned</option>{(owners.data ?? []).map((owner) => <option key={owner._id} value={owner._id}>{owner.name} ({owner.email})</option>)}</select></div>)}</section>
  </div>;
}
