import { createFileRoute } from "@tanstack/react-router";
import { Building2, LayoutGrid, ShieldCheck } from "lucide-react";
import { RoleShell } from "@/components/AppShell";

export const Route = createFileRoute("/owner")({
  ssr: false,
  head: () => ({ meta: [{ title: "Owner Portal - ParKING" }] }),
  component: () => <RoleShell role="owner" title="Owner" nav={[
    { to: "/owner", label: "Overview", icon: <LayoutGrid className="size-6" />, exact: true },
    { to: "/owner/lots/new", label: "Add Lot", icon: <Building2 className="size-6" /> },
    { to: "/owner/guards", label: "Guards", icon: <ShieldCheck className="size-6" /> },
  ]} />,
});
