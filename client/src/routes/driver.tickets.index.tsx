import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Ticket as TicketIcon } from "lucide-react";
import { errorMessage, ticketsApi, type Ticket } from "@/lib/api";
import { useLotSlotNames } from "@/lib/hooks";
import { btnClass, Notice, PageTitle, Skel } from "@/components/ui-kit";
import { TicketBadge } from "@/components/TicketBadge";

export const Route = createFileRoute("/driver/tickets/")({ component: TicketsPage });

function TicketsPage() {
  const q = useQuery({ queryKey: ["tickets"], queryFn: ticketsApi.mine });
  const order = { issued: 0, entered: 1, exited: 2 } as const;
  const list = [...(q.data ?? [])].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div>
      <PageTitle>My Tickets</PageTitle>
      {q.isLoading && <div className="space-y-3"><Skel className="h-24" /><Skel className="h-24" /></div>}
      {q.isError && <Notice kind="error">{errorMessage(q.error)}</Notice>}
      {q.isSuccess && list.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-input py-12 text-center">
          <TicketIcon className="size-12" />
          <p className="text-lg font-semibold">No tickets yet</p>
          <Link to="/driver" className={btnClass("primary", "md")}>Find Parking</Link>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">{list.map((t) => <Row key={t._id} t={t} />)}</div>
    </div>
  );
}

function Row({ t }: { t: Ticket }) {
  const { lotName, slotLabel } = useLotSlotNames(t.lot, typeof t.reservation === "object" ? t.reservation.slot : undefined);
  return (
    <Link to="/driver/tickets/$id" params={{ id: t._id }} className="press flex items-center gap-4 rounded-2xl border border-border p-4 hover:border-foreground">
      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground">{slotLabel}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-bold">{lotName}</div>
        <TicketBadge status={t.status} />
      </div>
      <ChevronRight className="size-6" />
    </Link>
  );
}
