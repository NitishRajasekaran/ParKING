import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Lock, LogIn, Mail, ShieldCheck, User, UserRound } from "lucide-react";
import { useAuth, homeFor, loginPortalForRole, RoleMismatchError, type LoginPortal } from "@/lib/auth";
import { authApi, errorMessage } from "@/lib/api";
import { Logo } from "@/components/AppShell";
import { Btn, Field, Notice } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in - ParKING" },
      { name: "description", content: "Sign in to ParKING as a driver, owner, or staff member." },
      { property: "og:title", content: "Sign in - ParKING" },
      { property: "og:description", content: "Sign in to ParKING as a driver, owner, or staff member." },
    ],
  }),
  component: LoginPage,
});

type LoginMode = "driver" | "owner" | "staff" | "setupAdmin" | "applyOwner" | "forgotPassword";

function LoginPage() {
  const { login, setupAdmin: createAdmin, applyOwner, user, ready } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>("driver");
  const [lastPortal, setLastPortal] = useState<LoginPortal>("driver");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mismatchPortal, setMismatchPortal] = useState<LoginPortal | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: homeFor(user.role), replace: true });
  }, [ready, user, navigate]);

  const setupStatus = useQuery({
    queryKey: ["auth", "admin-setup-status"],
    queryFn: authApi.adminSetupStatus,
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const changeMode = (next: LoginMode) => {
    setErr("");
    setSuccessMsg("");
    setMismatchPortal(null);
    if (next === "driver" || next === "owner" || next === "staff") {
      setLastPortal(next);
    }
    setMode(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");
    setBusy(true);
    try {
      if (mode === "setupAdmin") {
        const admin = await createAdmin(name.trim(), email.trim(), password);
        navigate({ to: homeFor(admin.role), replace: true });
        return;
      }
      if (mode === "applyOwner") {
        const owner = await applyOwner(name.trim(), email.trim(), password);
        navigate({ to: homeFor(owner.role), replace: true });
        return;
      }
      if (mode === "forgotPassword") {
        const res = await authApi.forgotPassword(email.trim(), password);
        setSuccessMsg(res.message || "Password updated successfully! Sign in below.");
        setPassword("");
        setMode(lastPortal);
        return;
      }
      const portal = mode as LoginPortal;
      const signedInUser = await login(email.trim(), password, portal);
      navigate({ to: homeFor(signedInUser.role), replace: true });
    } catch (e) {
      if (e instanceof RoleMismatchError) {
        const actualRole = e.actualRole;
        const target = loginPortalForRole(actualRole);
        const roleName = ({ platform_admin: "Platform Admin", admin: "Admin", owner: "Owner", guard: "Guard", driver: "Driver" } as const)[actualRole];
        const portalName = target === "staff" ? "Staff Login" : target === "owner" ? "Owner Login" : "Driver Login";
        setMismatchPortal(target);
        setErr(`This account has the ${roleName} role. Continue with ${portalName}.`);
      } else {
        setMismatchPortal(null);
        setErr(
          errorMessage(
            e,
            mode === "setupAdmin"
              ? "Could not set up the Platform Admin account."
              : mode === "applyOwner"
              ? "Could not submit the owner application."
              : mode === "forgotPassword"
              ? "Could not reset password. Please check your email."
              : "Wrong email or password."
          )
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const isBackMode = mode === "setupAdmin" || mode === "applyOwner" || mode === "forgotPassword";
  const isCreatingAccount = mode === "setupAdmin" || mode === "applyOwner";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 animate-page">
      <Link to="/"><Logo /></Link>
      <form onSubmit={submit} className="my-auto flex flex-col gap-5 py-10">
        {isBackMode ? (
          <button
            type="button"
            onClick={() => changeMode(mode === "setupAdmin" ? "staff" : lastPortal)}
            className="inline-flex items-center gap-2 self-start text-sm font-bold underline underline-offset-4"
          >
            <ArrowLeft className="size-4" />
            {mode === "setupAdmin" ? "Back to Staff Login" : `Back to ${lastPortal === "staff" ? "Staff" : lastPortal === "owner" ? "Owner" : "Driver"} Login`}
          </button>
        ) : (
          <div className="grid grid-cols-3 rounded-2xl border-2 border-border p-1">
            {(["driver", "owner", "staff"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => changeMode(choice)}
                aria-pressed={mode === choice}
                className={cn(
                  "flex h-12 items-center justify-center gap-1 rounded-xl text-xs font-bold transition-colors sm:gap-2 sm:text-sm",
                  mode === choice ? "bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                {choice === "driver" ? <UserRound className="size-4 sm:size-5" /> : choice === "owner" ? <ShieldCheck className="size-4 sm:size-5" /> : <LogIn className="size-4 sm:size-5" />}
                {choice === "driver" ? "Driver Login" : choice === "owner" ? "Owner Login" : "Staff Login"}
              </button>
            ))}
          </div>
        )}

        <div>
          <h1 className="text-4xl font-black tracking-tight">
            {mode === "setupAdmin"
              ? "Set Up First Platform Admin"
              : mode === "applyOwner"
              ? "Apply as a Parking Owner"
              : mode === "forgotPassword"
              ? "Request Password Reset"
              : mode === "staff"
              ? "Staff Login"
              : mode === "owner"
              ? "Owner Login"
              : "Driver Login"}
          </h1>
          {mode === "forgotPassword" && <p className="mt-2 text-sm text-muted-foreground">Enter your account email and desired new password. A verification request will be sent to the Admin for approval.</p>}
          {mode === "staff" && <p className="mt-2 text-sm text-muted-foreground">For existing Platform Admin and Guard accounts.</p>}
          {mode === "owner" && <p className="mt-2 text-sm text-muted-foreground">For owner accounts. Pending applications can sign in to check their status.</p>}
          {mode === "setupAdmin" && <p className="mt-2 text-sm text-muted-foreground">Set up the first Platform Admin account for this ParKING system.</p>}
          {mode === "applyOwner" && <p className="mt-2 text-sm text-muted-foreground">Create an owner account for review by a Platform Admin.</p>}
        </div>

        {err && <Notice kind="error">{err}</Notice>}
        {successMsg && <Notice kind="success">{successMsg}</Notice>}
        {mismatchPortal && (
          <Btn type="button" variant="secondary" onClick={() => changeMode(mismatchPortal)}>
            Go to {mismatchPortal === "staff" ? "Staff" : mismatchPortal === "owner" ? "Owner" : "Driver"} Login
          </Btn>
        )}

        {mode === "setupAdmin" && setupStatus.data?.available === false ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-center">
            <p className="text-sm font-bold">Platform Admin setup is complete</p>
            <p className="text-xs text-muted-foreground">Existing staff can sign in using Staff Login.</p>
            <Btn type="button" variant="secondary" onClick={() => changeMode("staff")}>Return to Staff Login</Btn>
          </div>
        ) : (
          <>
            {isCreatingAccount && (
              <Field label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} icon={<User className="size-5" />} />
            )}
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="size-5" />} />
            <Field
              label={mode === "forgotPassword" ? "Desired New Password" : "Password"}
              type="password"
              autoComplete={isCreatingAccount || mode === "forgotPassword" ? "new-password" : "current-password"}
              required
              minLength={isCreatingAccount || mode === "forgotPassword" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="size-5" />}
            />

            {!isBackMode && (
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => changeMode("forgotPassword")}
                  className="text-xs font-semibold text-muted-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Btn type="submit" loading={busy}>
              {mode === "forgotPassword" ? <KeyRound className="size-5" /> : isCreatingAccount ? <User className="size-5" /> : <LogIn className="size-5" />}
              {mode === "setupAdmin"
                ? "Set Up First Platform Admin"
                : mode === "applyOwner"
                ? "Submit Owner Application"
                : mode === "forgotPassword"
                ? "Send Reset Request to Admin"
                : "Sign in"}
            </Btn>
          </>
        )}

        {mode === "driver" && <p className="text-center text-base">New driver? <Link to="/register" className="font-bold underline underline-offset-4">Create Driver Account</Link></p>}
        {mode === "owner" && <p className="text-center text-base">Need an owner account? <button type="button" onClick={() => changeMode("applyOwner")} className="font-bold underline underline-offset-4">Apply as a Parking Owner</button></p>}
        {mode === "staff" && (
          <>
            {setupStatus.isFetching && <p className="animate-pulse text-center text-xs text-muted-foreground">Checking setup status...</p>}
            {!setupStatus.isFetching && setupStatus.data?.available === true && (
              <div className="rounded-2xl border-2 border-dashed border-border p-4 text-center">
                <p className="text-sm font-bold">No Platform Admin account found</p>
                <p className="mt-1 text-xs text-muted-foreground">Initial system setup is required to configure ParKING.</p>
                <Btn type="button" variant="secondary" className="mt-3 w-full" onClick={() => changeMode("setupAdmin")}><ShieldCheck className="size-5" />Set Up First Platform Admin</Btn>
              </div>
            )}
            {!setupStatus.isFetching && setupStatus.data?.available === false && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">Platform Admin setup is complete. Existing Platform Admin and Guard accounts can sign in above.</p>
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
