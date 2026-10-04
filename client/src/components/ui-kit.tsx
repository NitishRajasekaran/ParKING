import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "md" | "lg"; loading?: boolean };

export const btnClass = (variant: BtnProps["variant"] = "primary", size: BtnProps["size"] = "lg") =>
  cn(
    "press inline-flex items-center justify-center gap-2.5 rounded-xl font-semibold select-none disabled:opacity-40 disabled:pointer-events-none",
    size === "lg" ? "h-14 px-6 text-lg" : "h-11 px-4 text-base",
    variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "secondary" && "border-2 border-foreground bg-background text-foreground hover:bg-accent",
    variant === "ghost" && "text-foreground hover:bg-accent",
  );

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(({ variant, size, loading, className, children, disabled, ...p }, ref) => (
  <button ref={ref} className={cn(btnClass(variant, size), className)} disabled={disabled || loading} {...p}>
    {loading && <Loader2 className="size-5 animate-spin" />}
    {children}
  </button>
));
Btn.displayName = "Btn";

export function Field({ label, icon, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-base font-semibold">{label}</span>
      <span className="relative block">
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground">{icon}</span>}
        <input
          {...p}
          className={cn(
            "h-14 w-full rounded-xl border-2 border-input bg-background px-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none",
            icon && "pl-12",
          )}
        />
      </span>
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>{children}</div>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-3xl font-extrabold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-base text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-xl border-2 p-4 text-base font-medium",
        kind === "error" ? "border-foreground bg-background" : "border-border bg-muted")}>
      <span aria-hidden className="mt-0.5 text-lg font-black">{kind === "error" ? "✕" : kind === "success" ? "✓" : "i"}</span>
      <span>{children}</span>
    </div>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-muted", className)} />;
}

export function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-xl bg-muted">{icon}</span>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-lg font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

export const rupees = (n: number | null | undefined) => (n == null ? "—" : `₹${n.toLocaleString("en-IN")}`);
