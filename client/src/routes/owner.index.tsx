import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShieldCheck } from "lucide-react";
import { ownerApi, errorMessage, availableOf } from "@/lib/api";
import { btnClass, Card, Notice, PageTitle, rupees, Skel } from "@/components/ui-kit";
import { LotTable } from "@/components/LotTable";

export const Route = createFileRoute("/owner/")({ component: OwnerHome });
function OwnerHome() {
  const status = useQuery({ queryKey: ["owner", "status"], queryFn: ownerApi.status });
  const approved = status.data?.ownerStatus === "approved";
  const lots = useQuery({ queryKey: ["owner", "lots"], queryFn: ownerApi.lots, enabled: approved });
  const revenue = useQuery({ queryKey: ["owner", "revenue"], queryFn: ownerApi.revenue, enabled: approved });
  if (status.isLoading) return <Skel className="h-40" />;
  if (status.isError) return <Notice kind="error">{errorMessage(status.error)}</Notice>;
  if (!approved) return <div className="mx-auto max-w-xl"><PageTitle>Owner application</PageTitle><Card><h2 className="text-xl font-bold capitalize">{status.data?.ownerStatus}</h2><p className="mt-2 text-muted-foreground">{status.data?.ownerStatus === "rejected" ? "Your application was not approved. Contact the platform team for help." : "Your application is awaiting platform admin review. You can use this portal after it is approved."}</p></Card></div>;
  const items = lots.data ?? [];
  return <div><div className="flex flex-wrap items-start justify-between gap-3"><PageTitle sub="Manage your parking locations and staff.">Owner Overview</PageTitle><Link to="/owner/lots/new" className={btnClass("primary", "md")}><Plus className="size-5" />Add Parking Lot</Link></div>
    {lots.isError && <Notice kind="error">{errorMessage(lots.error)}</Notice>}
    <div className="grid gap-3 sm:grid-cols-3"><Card><div className="text-sm text-muted-foreground">Parking lots</div><div className="mt-1 text-3xl font-black">{lots.isLoading ? "..." : items.length}</div></Card><Card><div className="text-sm text-muted-foreground">Available slots</div><div className="mt-1 text-3xl font-black">{lots.isLoading ? "..." : items.reduce((n, lot) => n + availableOf(lot), 0)}</div></Card><Card><div className="text-sm text-muted-foreground">Revenue</div><div className="mt-1 text-3xl font-black">{revenue.isLoading ? "..." : revenue.isError ? "-" : rupees(revenue.data?.totalRevenue)}</div></Card></div>
    <div className="mt-6"><Link to="/owner/guards" className={btnClass("secondary", "md")}><ShieldCheck className="size-5" />Manage Guards</Link></div>
    <section className="mt-6"><h2 className="mb-3 text-xl font-bold">Your parking lots</h2>{lots.isLoading ? <Skel className="h-36" /> : <LotTable lots={items} />}</section>
  </div>;
}
