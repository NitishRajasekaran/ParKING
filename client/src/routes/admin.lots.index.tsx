import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { adminApi, errorMessage } from "@/lib/api";
import { useAdminLive } from "@/lib/admin-live";
import { btnClass, Notice, PageTitle, Skel } from "@/components/ui-kit";
import { LotTable } from "@/components/LotTable";

export const Route = createFileRoute("/admin/lots/")({ component: Lots });

function Lots() {
  useAdminLive();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "lots"], queryFn: adminApi.lots });

  const handleDeleteLot = async (lotId: string) => {
    try {
      await adminApi.deleteLot(lotId);
      await qc.invalidateQueries({ queryKey: ["admin", "lots"] });
    } catch (e) {
      alert(errorMessage(e, "Could not delete lot"));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle>Parking lots</PageTitle>
        <Link to="/admin/lots/new" className={btnClass("primary", "md")}><Plus className="size-5" />Create Parking Lot</Link>
      </div>
      {q.isLoading && <Skel className="h-40" />}
      {q.isError && <Notice kind="error">{errorMessage(q.error)}</Notice>}
      {q.data && <LotTable lots={q.data} onDeleteLot={handleDeleteLot} />}
    </div>
  );
}
