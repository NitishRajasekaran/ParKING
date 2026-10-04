import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Btn, Card, PageTitle, Stat } from "@/components/ui-kit";

export const Route = createFileRoute("/driver/profile")({ component: Profile });

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md">
      <PageTitle>Profile</PageTitle>
      <Card className="space-y-4">
        <Stat icon={<User className="size-6" />} label="Name" value={user?.name} />
        <Stat icon={<Mail className="size-6" />} label="Email" value={user?.email} />
      </Card>
      <Btn variant="secondary" className="mt-6 w-full" onClick={() => { logout(); navigate({ to: "/login", replace: true }); }}>
        <LogOut className="size-5" />Sign out
      </Btn>
    </div>
  );
}
