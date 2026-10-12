import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Mail, User, UserPlus } from "lucide-react";
import { useAuth, homeFor } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { Logo } from "@/components/AppShell";
import { Btn, Field, Notice } from "@/components/ui-kit";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — ParKING" },
      { name: "description", content: "Create a free driver account to reserve parking with ParKING." },
      { property: "og:title", content: "Create account — ParKING" },
      { property: "og:description", content: "Create a free driver account to reserve parking with ParKING." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register, user, ready } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) {
      navigate({ to: homeFor(user.role), replace: true });
    }
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const u = await register(name.trim(), email.trim(), password);
      navigate({ to: homeFor(u.role), replace: true });
    } catch (e) {
      setErr(errorMessage(e, "Could not create account."));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 animate-page">
      <Link to="/"><Logo /></Link>
      <form onSubmit={submit} className="my-auto flex flex-col gap-5 py-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Create Driver Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Public registration creates a Driver account.</p>
        </div>
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} icon={<User className="size-5" />} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="size-5" />} />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock className="size-5" />} />
        <Btn type="submit" loading={busy}><UserPlus className="size-5" />Create Driver Account</Btn>
        <p className="text-center text-base">Already have an account? <Link to="/login" className="font-bold underline underline-offset-4">Sign in</Link></p>
      </form>
    </div>
  );
}
