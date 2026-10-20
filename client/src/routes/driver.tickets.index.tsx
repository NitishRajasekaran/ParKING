import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ChevronRight, RefreshCw, Ticket as TicketIcon } from "lucide-react";
import { errorMessage, ticketsApi, type Ticket } from "@/lib/api";
import { useLotSlotNames } from "@/lib/hooks";
import { btnClass, Btn, Notice, PageTitle, Skel } from "@/components/ui-kit";
import { TicketBadge } from "@/components/TicketBadge";
import { getSocket } from "@/lib/socket";

export const Route = createFileRoute("/driver/tickets/")({ component: TicketsPage });

function TicketsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["tickets"],
    queryFn: ticketsApi.mine,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    // Invalidate and refetch whenever TicketsPage is visited/mounted
    void qc.invalidateQueries({ queryKey: ["tickets"] });
  }, [qc]);

  useEffect(() => {
    const s = getSocket();
    const refresh = (data?: { ticket?: Ticket }) => {
      if (data?.ticket) {
        qc.setQueryData<Ticket[]>(["tickets"], (old) => {
          const existing = old ?? [];
          return existing.some((t) => t._id === data.ticket!._id)
            ? existing.map((t) => (t._id === data.ticket!._id ? data.ticket! : t))
            : [data.ticket!, ...existing];
        });
      }
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    };
    s.on("ticket:entry", refresh);
    s.on("ticket:exit", refresh);
    s.on("reservation:created", refresh);
    return () => {
      s.off("ticket:entry", refresh);
      s.off("ticket:exit", refresh);
      s.off("reservation:created", refresh);
    };
  }, [qc]);

  const order = { issued: 0, entered: 1, exited: 2 } as const;
  const list = [...(q.data ?? [])].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageTitle>My Tickets</PageTitle>
        <button
          type="button"
          onClick={() => void q.refetch()}
          aria-label="Refresh tickets"
          title="Refresh tickets"
          className="rounded-xl border border-border p-2 hover:bg-muted"
        >
          <RefreshCw className={`size-5 ${q.isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      {q.isLoading && <div className="space-y-3"><Skel className="h-24" /><Skel className="h-24" /></div>}
      {q.isError && <Notice kind="error">{errorMessage(q.error)}</Notice>}
      {q.isSuccess && list.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-input py-12 text-center">
          <TicketIcon className="size-12" />
          <p className="text-lg font-semibold">No tickets yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Reserve a parking slot to generate your QR ticket. If you recently reserved on another account, sign in to that account.
          </p>
          <div className="flex gap-3">
            <Link to="/driver" className={btnClass("primary", "md")}>Find Parking</Link>
            <Btn variant="secondary" size="md" onClick={() => void q.refetch()}>Check Again</Btn>
          </div>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">{list.map((t) => <Row key={t._id} t={t} />)}</div>
    </div>
  );
}

function Row({ t }: { t: Ticket }) {
  const slotRef = t.reservation && typeof t.reservation === "object" ? t.reservation.slot : undefined;
  const { lotName, slotLabel } = useLotSlotNames(t.lot, slotRef);
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
