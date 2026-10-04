import { createFileRoute } from "@tanstack/react-router";
import { Home, Search, Ticket, User } from "lucide-react";
import { RoleShell } from "@/components/AppShell";

export const Route = createFileRoute("/driver")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Find Parking — ParKING" },
      { name: "description", content: "Find nearby parking, reserve a slot and keep your QR tickets." },
      { property: "og:title", content: "Find Parking — ParKING" },
      { property: "og:description", content: "Find nearby parking, reserve a slot and keep your QR tickets." },
    ],
  }),
  component: () => (
    <RoleShell
      role="driver"
      title="Driver"
      nav={[
        { to: "/driver", label: "Home", icon: <Home className="size-6" />, exact: true },
        { to: "/driver/search", label: "Search", icon: <Search className="size-6" /> },
        { to: "/driver/tickets", label: "Tickets", icon: <Ticket className="size-6" /> },
        { to: "/driver/profile", label: "Profile", icon: <User className="size-6" /> },
      ]}
    />
  ),
});
