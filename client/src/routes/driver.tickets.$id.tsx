import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage, ticketsApi } from "@/lib/api";
import { useLotSlotNames } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";
import { Notice, rupees, Skel } from "@/components/ui-kit";
import { TicketBadge } from "@/components/TicketBadge";
import { ticketDisplayCode, ticketQrPayload } from "@/lib/ticket-code";

export const Route = createFileRoute("/driver/tickets/$id")({ component: TicketPage });

function TicketPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketsApi.get(id),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 15000,
  });

  useEffect(() => {
    const s = getSocket();
    const onTicketUpdate = (data?: { ticketId?: string }) => {
      if (!data?.ticketId || data.ticketId === id) {
        void qc.invalidateQueries({ queryKey: ["ticket", id] });
        void qc.invalidateQueries({ queryKey: ["tickets"] });
      }
    };
    s.on("ticket:entry", onTicketUpdate);
    s.on("ticket:exit", onTicketUpdate);
    return () => {
      s.off("ticket:entry", onTicketUpdate);
      s.off("ticket:exit", onTicketUpdate);
    };
  }, [id, qc]);
  const slotRef = q.data?.reservation && typeof q.data.reservation === "object" ? q.data.reservation.slot : undefined;
  const names = useLotSlotNames(q.data?.lot, slotRef);
  const t = q.data;
  const [copied, setCopied] = useState(false);
  const ticketCode = t ? ticketDisplayCode(t) : undefined;
  const copyCode = async () => {
    if (!ticketCode) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ticketCode);
      } else {
        const field = document.createElement("textarea");
        field.value = ticketCode;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

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
              <QRCodeSVG value={ticketQrPayload(t)} size={240} level="M" marginSize={1} aria-label="QR ticket" />
            </div>
            <div className="mt-3 w-full rounded-xl bg-muted px-3 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ticket code</div>
              <div className="mt-1 break-all font-mono text-lg font-black tracking-wider" aria-label={`Ticket code ${ticketCode}`}>{ticketCode}</div>
              <button type="button" onClick={() => void copyCode()} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold" aria-label="Copy ticket code">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy code"}
              </button>
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
