import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail, LogIn } from "lucide-react";
import { useAuth, homeFor } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { Logo } from "@/components/AppShell";
import { Btn, Field, Notice } from "@/components/ui-kit";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — ParKING" },
      { name: "description", content: "Sign in to ParKING to find parking, scan tickets or manage lots." },
      { property: "og:title", content: "Sign in — ParKING" },
      { property: "og:description", content: "Sign in to ParKING to find parking, scan tickets or manage lots." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const u = await login(email.trim(), password);
      navigate({ to: homeFor(u.role), replace: true });
    } catch (e) {
      setErr(errorMessage(e, "Wrong email or password."));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 animate-page">
      <Link to="/"><Logo /></Link>
      <form onSubmit={submit} className="my-auto flex flex-col gap-5 py-10">
        <h1 className="text-4xl font-black tracking-tight">Sign in</h1>
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="size-5" />} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock className="size-5" />} />
        <Btn type="submit" loading={busy}><LogIn className="size-5" />Sign in</Btn>
        <p className="text-center text-base">New here? <Link to="/register" className="font-bold underline underline-offset-4">Create account</Link></p>
      </form>
    </div>
  );
}
