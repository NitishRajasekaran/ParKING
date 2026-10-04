import { createFileRoute } from "@tanstack/react-router";
import { ScanLine, User } from "lucide-react";
import { RoleShell } from "@/components/AppShell";

export const Route = createFileRoute("/guard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scan Ticket — ParKING Guard" },
      { name: "description", content: "Scan parking QR tickets and allow entry or exit." },
      { property: "og:title", content: "Scan Ticket — ParKING Guard" },
      { property: "og:description", content: "Scan parking QR tickets and allow entry or exit." },
    ],
  }),
  component: () => (
    <RoleShell role="guard" title="Guard" nav={[
      { to: "/guard", label: "Scan", icon: <ScanLine className="size-6" />, exact: true },
      { to: "/guard/profile", label: "Profile", icon: <User className="size-6" /> },
    ]} />
  ),
});
