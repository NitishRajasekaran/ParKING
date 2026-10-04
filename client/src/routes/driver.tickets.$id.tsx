import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft } from "lucide-react";
import { errorMessage, ticketsApi } from "@/lib/api";
import { useLotSlotNames } from "@/lib/hooks";
import { Notice, rupees, Skel } from "@/components/ui-kit";
import { TicketBadge } from "@/components/TicketBadge";

export const Route = createFileRoute("/driver/tickets/$id")({ component: TicketPage });

function TicketPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["ticket", id], queryFn: () => ticketsApi.get(id), refetchInterval: 15000 });
  const names = useLotSlotNames(q.data?.lot, q.data?.slot);
  const t = q.data;

  return (
    <div className="mx-auto max-w-sm">
      <Link to="/driver/tickets" className="mb-4 inline-flex items-center gap-2 text-base font-semibold"><ArrowLeft className="size-5" />Tickets</Link>
      {q.isLoading && <Skel className="h-[520px]" />}
      {q.isError && <Notice kind="error">{errorMessage(q.error)}</Notice>}
      {t && (
        <div className="animate-pop overflow-hidden rounded-3xl border-2 border-foreground">
          <div className="bg-primary py-4 text-center text-sm font-bold tracking-[0.3em] text-primary-foreground">PARKING TICKET</div>
          <div className="flex flex-col items-center px-6 pb-6 pt-6">
            <div className={t.status === "exited" ? "opacity-25" : ""}>
              <QRCodeSVG value={t.qrToken} size={240} level="M" marginSize={1} aria-label="QR ticket" />
            </div>
            <TicketBadge status={t.status} className="mt-4" />
          </div>
          {/* perforation */}
          <div className="relative border-t-2 border-dashed border-foreground">
            <span className="absolute -left-3 -top-3 size-6 rounded-full border-2 border-foreground bg-background" />
            <span className="absolute -right-3 -top-3 size-6 rounded-full border-2 border-foreground bg-background" />
          </div>
          <div className="px-6 py-5 text-center">
            <div className="text-sm text-muted-foreground">SLOT</div>
            <div className="text-5xl font-black">{names.slotLabel}</div>
            <div className="mt-2 text-lg font-bold">{names.lotName}</div>
            {t.status === "issued" && <p className="mt-4 rounded-xl bg-muted py-3 text-base font-semibold">Show this at entry</p>}
            {t.status === "entered" && <p className="mt-4 rounded-xl bg-muted py-3 text-base font-semibold">Show this at exit</p>}
            {t.status === "exited" && <p className="mt-4 text-base">Paid: <b>{rupees(t.amount)}</b></p>}
          </div>
        </div>
      )}
    </div>
  );
}
