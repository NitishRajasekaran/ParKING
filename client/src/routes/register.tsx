import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

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
        <h1 className="text-4xl font-black tracking-tight">Create account</h1>
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} icon={<User className="size-5" />} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="size-5" />} />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock className="size-5" />} />
        <Btn type="submit" loading={busy}><UserPlus className="size-5" />Create account</Btn>
        <p className="text-center text-base">Have an account? <Link to="/login" className="font-bold underline underline-offset-4">Sign in</Link></p>
      </form>
    </div>
  );
}
