import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MapPin, SquareParking, Ticket } from "lucide-react";
import { useAuth, homeFor } from "@/lib/auth";
import { Logo } from "@/components/AppShell";
import { btnClass } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParKING — Find. Reserve. Park." },
      { name: "description", content: "Find nearby parking, reserve a slot in seconds and enter with a QR ticket." },
      { property: "og:title", content: "ParKING — Find. Reserve. Park." },
      { property: "og:description", content: "Find nearby parking, reserve a slot in seconds and enter with a QR ticket." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && user) navigate({ to: homeFor(user.role), replace: true });
  }, [ready, user, navigate]);

  const steps = [
    { icon: <MapPin className="size-7" />, t: "Find" },
    { icon: <SquareParking className="size-7" />, t: "Reserve" },
    { icon: <Ticket className="size-7" />, t: "Park" },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 animate-page">
      <Logo />
      <div className="my-auto py-10">
        <h1 className="text-5xl font-black leading-[1.05] tracking-tight">Find.<br />Reserve.<br />Park.</h1>
        <div className="mt-8 grid grid-cols-3 gap-3">
          {steps.map((s) => (
            <div key={s.t} className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4">
              {s.icon}
              <span className="text-base font-bold">{s.t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Link to="/login" className={btnClass("primary")}>Sign in</Link>
        <Link to="/register" className={btnClass("secondary")}>Create account</Link>
      </div>
    </div>
  );
}
