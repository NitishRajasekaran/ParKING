import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth, homeFor } from "@/lib/auth";
import type { Role } from "@/lib/api";
import { cn } from "@/lib/utils";

const roleMatches = (actual: Role, expected: Role) => actual === expected || ((actual === "admin" || actual === "platform_admin") && (expected === "admin" || expected === "platform_admin"));

export interface NavItem { to: string; label: string; icon: ReactNode; exact?: boolean }

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xl font-black tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-base text-primary-foreground">P</span>
      ParKING
    </span>
  );
}

export function RoleShell({ role, nav, title }: { role: Role; nav: NavItem[]; title: string }) {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (!roleMatches(user.role, role)) navigate({ to: homeFor(user.role), replace: true });
  }, [ready, user, role, navigate]);

  if (!ready || !user || !roleMatches(user.role, role)) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin" /></div>;
  }

  const signOut = () => { logout(); navigate({ to: "/login", replace: true }); };
  const linkCls = "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-muted-foreground hover:bg-accent";
  const activeCls = "!bg-primary !text-primary-foreground";

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop compact sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
        <Logo className="mb-1 px-2" />
        <div className="mb-6 px-2 text-sm text-muted-foreground">{title}</div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: !!n.exact }} className={linkCls} activeProps={{ className: activeCls }}>
              {n.icon}{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <div className="px-3 text-sm font-semibold">{user.name}</div>
          <button onClick={signOut} className={cn(linkCls, "w-full")}><LogOut className="size-5" />Sign out</button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-[500] flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Logo />
        <span className="text-sm font-semibold text-muted-foreground">{title}</span>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8 animate-page">
        <Outlet />
      </main>

      {/* Mobile compact bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-[600] flex justify-around rounded-2xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: !!n.exact }}
            className="press flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "!bg-primary !text-primary-foreground" }}>
            {n.icon}{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
