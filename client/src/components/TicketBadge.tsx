import { CircleCheck, CircleX, LogIn, LogOut } from "lucide-react";
import type { TicketStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const map: Record<TicketStatus, { label: string; icon: typeof LogIn; solid: boolean }> = {
  issued: { label: "Ready", icon: CircleCheck, solid: true },
  entered: { label: "Parked", icon: LogIn, solid: false },
  exited: { label: "Done", icon: LogOut, solid: false },
  cancelled: { label: "Cancelled", icon: CircleX, solid: false },
};

export function TicketBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const m = map[status];
  const I = m.icon;
  return (
    <span className={cn("mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
      m.solid ? "bg-primary text-primary-foreground" : status === "entered" ? "border-2 border-foreground" : "border border-border text-muted-foreground", className)}>
      <I className="size-4" />{m.label}
    </span>
  );
}
