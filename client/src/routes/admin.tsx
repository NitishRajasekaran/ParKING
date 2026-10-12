import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid, Plus, ShieldCheck, SquareParking } from "lucide-react";
import { RoleShell } from "@/components/AppShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ParKING" },
      { name: "description", content: "Watch occupancy and revenue, and add new parking lots." },
      { property: "og:title", content: "Admin Dashboard — ParKING" },
      { property: "og:description", content: "Watch occupancy and revenue, and add new parking lots." },
    ],
  }),
  component: () => (
    <RoleShell role="admin" title="Admin" nav={[
      { to: "/admin", label: "Dashboard", icon: <LayoutGrid className="size-6" />, exact: true },
      { to: "/admin/lots", label: "Lots", icon: <SquareParking className="size-6" />, exact: true },
      { to: "/admin/lots/new", label: "Add", icon: <Plus className="size-6" /> },
      { to: "/admin/owners", label: "Owners", icon: <ShieldCheck className="size-6" /> },
    ]} />
  ),
});
