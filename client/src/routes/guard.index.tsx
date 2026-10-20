import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Car, Check, Keyboard, LogIn, LogOut, RotateCcw, ScanLine, SquareParking, User, X } from "lucide-react";
import { errorMessage, guardApi, refName, statusOf, type ValidateResponse } from "@/lib/api";
import { QrScanner } from "@/components/QrScanner";
import { Btn, Notice, Stat } from "@/components/ui-kit";
import { TicketBadge } from "@/components/TicketBadge";
import { ticketDisplayCode } from "@/lib/ticket-code";

export const Route = createFileRoute("/guard/")({ component: GuardScan });

type Phase =
  | { k: "scan" }
  | { k: "checking" }
  | { k: "result"; token: string; res: ValidateResponse }
  | { k: "invalid"; title: string; msg: string }
  | { k: "done"; action: "entry" | "exit" };

function GuardScan() {
  const [phase, setPhase] = useState<Phase>({ k: "scan" });
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const isCheckingRef = useRef(false);

  const check = async (token: string) => {
    const t = token.trim();
    if (!t || isCheckingRef.current || phase.k === "checking") return;
    isCheckingRef.current = true;
    setPhase({ k: "checking" });
    try {
      const res = await guardApi.validate(t);
      setPhase(res.valid && res.ticket ? { k: "result", token: res.ticket.qrToken || t, res } : { k: "invalid", title: "INVALID TICKET", msg: "This ticket cannot be used." });
    } catch (e) {
      const status = statusOf(e);
      const message = errorMessage(e, "This ticket cannot be used.");
      const lowerMessage = message.toLowerCase();
      const title = status === 401 ? "GUARD LOGIN REQUIRED" : status === 403 ? "UNAUTHORIZED GUARD" : status === 404 ? "INVALID TICKET" : lowerMessage.includes("expired") ? "EXPIRED TICKET" : status === 409 || lowerMessage.includes("already") ? "TICKET ALREADY USED" : status === undefined ? "CONNECTION ERROR" : "VALIDATION FAILED";
      setPhase({ k: "invalid", title, msg: message });
    } finally {
      isCheckingRef.current = false;
    }
  };
  const reset = () => {
    isCheckingRef.current = false;
    setManual("");
    setShowManual(false);
    setPhase({ k: "scan" });
  };

  if (phase.k === "result") return <Result token={phase.token} res={phase.res} onDone={(a) => setPhase({ k: "done", action: a })} onReset={reset} />;

  if (phase.k === "invalid") return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center animate-pop">
      <div className="grid size-28 place-items-center rounded-full border-[6px] border-foreground"><X className="size-16" strokeWidth={3} /></div>
      <h1 className="mt-6 text-3xl font-black">{phase.title}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{phase.msg}</p>
      <Btn className="mt-8 w-full" onClick={reset}><ScanLine className="size-6" />Scan again</Btn>
    </div>
  );

  if (phase.k === "done") return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center animate-pop">
      <div className="grid size-28 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-16" strokeWidth={3} /></div>
      <h1 className="mt-6 text-4xl font-black">{phase.action === "entry" ? "ENTRY ALLOWED" : "EXIT ALLOWED"}</h1>
      <Btn className="mt-8 w-full" onClick={reset}><ScanLine className="size-6" />Scan next</Btn>
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-5 text-center text-4xl font-black tracking-tight">SCAN TICKET</h1>
      {phase.k === "checking" ? (
        <div className="grid aspect-square w-full animate-pulse place-items-center rounded-3xl bg-muted text-xl font-bold">Checking…</div>
      ) : (
        <QrScanner onScan={check} />
      )}
      <div className="mt-5">
        {!showManual ? (
          <Btn variant="secondary" className="w-full" onClick={() => setShowManual(true)}><Keyboard className="size-5" />Type code</Btn>
        ) : (
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void check(manual); }}>
            <input autoFocus value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ticket code" aria-label="Ticket code"
              className="h-14 min-w-0 flex-1 rounded-xl border-2 border-input px-4 text-lg focus:border-foreground focus:outline-none" />
            <Btn type="submit" disabled={!manual.trim()} className="w-full sm:w-auto">Check</Btn>
          </form>
        )}
      </div>
    </div>
  );
}

function Result({ token, res, onDone, onReset }: { token: string; res: ValidateResponse; onDone: (a: "entry" | "exit") => void; onReset: () => void }) {
  const t = res.ticket!;
  const lotName = refName(t.lot) ?? "—";
  const slotLabel = refName(typeof t.reservation === "object" ? t.reservation.slot : undefined, "label") ?? "—";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const action: "entry" | "exit" | null = t.status === "issued" ? "entry" : t.status === "entered" ? "exit" : null;

  const go = async () => {
    if (!action || busy) return;
    setBusy(true); setErr("");
    try { await (action === "entry" ? guardApi.entry(token) : guardApi.exit(token)); onDone(action); }
    catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md animate-pop">
      <div className="flex items-center gap-4 rounded-3xl bg-primary p-5 text-primary-foreground">
        <span className="grid size-14 place-items-center rounded-full bg-background text-foreground"><Check className="size-9" strokeWidth={3} /></span>
        <span className="text-3xl font-black">VALID TICKET</span>
      </div>
      <div className="mt-4 min-w-0 space-y-4 rounded-2xl border border-border p-4 sm:p-5">
        <Stat icon={<User className="size-6" />} label="Driver" value={refName(t.user) ?? "—"} />
        <Stat icon={<SquareParking className="size-6" />} label="Parking" value={lotName} />
        <Stat icon={<Car className="size-6" />} label="Slot" value={<span className="text-2xl font-black">{slotLabel}</span>} />
        <div className="break-all rounded-lg bg-muted p-3"><div className="text-sm text-muted-foreground">Ticket code</div><div className="font-mono font-bold">{ticketDisplayCode(t)}</div></div>
        <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">Status</span><TicketBadge status={t.status} /></div>
      </div>
      {err && <div className="mt-4"><Notice kind="error">{err}</Notice></div>}
      <div className="mt-5 flex flex-col gap-3">
        {action ? (
          <Btn className="h-16 text-xl" loading={busy} disabled={busy} onClick={go}>
            {action === "entry" ? <LogIn className="size-6" /> : <LogOut className="size-6" />}
            {action === "entry" ? "ALLOW ENTRY" : "ALLOW EXIT"}
          </Btn>
        ) : <Notice kind="info">This ticket is already used.</Notice>}
        <Btn variant="secondary" disabled={busy} onClick={onReset}><RotateCcw className="size-5" />Cancel</Btn>
      </div>
    </div>
  );
}
