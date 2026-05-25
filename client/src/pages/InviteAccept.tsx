import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  sls_admin: "SLS Admin",
  sls_rep: "SLS Sales Rep",
  sls_pm: "Project Manager",
  client_architect: "Architect",
  client_gc: "General Contractor",
  user: "Portal User",
};

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [inviteCode, setInviteCode] = useState("");
  const [step, setStep] = useState<"loading" | "code-gate" | "redeeming" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [assignedRole, setAssignedRole] = useState("");

  // Validate the token (public check — no code needed yet)
  const validateQuery = trpc.invites.validate.useQuery(
    { token: token ?? "" },
    { enabled: !!token && isAuthenticated }
  );

  const redeemMutation = trpc.invites.redeem.useMutation({
    onSuccess: (data) => {
      setAssignedRole(data.role);
      setStep("done");
      // Redirect to dashboard after 2.5 seconds
      setTimeout(() => navigate("/"), 2500);
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setStep("error");
    },
  });

  // Once auth is resolved, decide what to show
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Not signed in — send them through OAuth with a return path
      // Encode the invite token in the OAuth state so the callback redirects back here
      window.location.href = getLoginUrl(token);
      return;
    }

    if (validateQuery.isLoading) return;

    if (validateQuery.data?.valid === false) {
      setErrorMsg("This invite link is invalid, expired, or has already been used.");
      setStep("error");
      return;
    }

    if (validateQuery.data?.valid) {
      // Check if this user already has a non-default role (already redeemed elsewhere)
      if (user && user.role !== "user") {
        // Already has a role — just go to dashboard
        navigate("/");
        return;
      }
      setStep("code-gate");
    }
  }, [authLoading, isAuthenticated, validateQuery.isLoading, validateQuery.data, user]);

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setStep("redeeming");
    redeemMutation.mutate({ token: token ?? "", inviteCode: inviteCode.trim() });
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === "loading" || authLoading || (isAuthenticated && validateQuery.isLoading)) {
    return (
      <div className="min-h-screen sls-watermark-bg flex items-center justify-center" style={{ background: "#1b110b" }}>
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#d29c3c" }} />
          <p className="text-sm opacity-70 font-['Inter']">Validating invite link…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if ((step as string) === "error") {
    return (
      <div className="min-h-screen sls-watermark-bg flex items-center justify-center" style={{ background: "#1b110b" }}>
        <div className="bg-white rounded-xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="font-['Roboto_Slab'] text-xl font-semibold text-[#1b110b] mb-2">Invite Unavailable</h2>
          <p className="text-sm text-gray-600 mb-6">{errorMsg}</p>
          <Button
            variant="outline"
            className="border-[#d29c3c] text-[#d29c3c] hover:bg-[#d29c3c] hover:text-white"
            onClick={() => navigate("/")}
          >
            Go to Portal
          </Button>
        </div>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen sls-watermark-bg flex items-center justify-center" style={{ background: "#1b110b" }}>
        <div className="bg-white rounded-xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
          <h2 className="font-['Roboto_Slab'] text-xl font-semibold text-[#1b110b] mb-2">Welcome to The GRID</h2>
          <p className="text-sm text-gray-600 mb-1">
            You've been granted access as{" "}
            <span className="font-semibold text-[#d29c3c]">{ROLE_LABELS[assignedRole] ?? assignedRole}</span>.
          </p>
          <p className="text-xs text-gray-400 mt-4">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Invite Code Gate ───────────────────────────────────────────────────────
  const roleLabel = ROLE_LABELS[validateQuery.data?.role ?? "user"] ?? "Portal User";
  const inviteLabel = validateQuery.data?.label;

  return (
    <div className="min-h-screen sls-watermark-bg flex items-center justify-center" style={{ background: "#1b110b" }}>
      <div className="bg-white rounded-xl shadow-xl p-10 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: "#d29c3c" }} />
          <h1 className="font-['Roboto_Slab'] text-2xl font-semibold text-[#1b110b] uppercase tracking-wide mb-1">
            Portal Invite
          </h1>
          {inviteLabel && (
            <p className="text-sm text-gray-500 mb-1">{inviteLabel}</p>
          )}
          <p className="text-sm text-gray-500">
            You've been invited to join as{" "}
            <span className="font-semibold text-[#d29c3c]">{roleLabel}</span>.
          </p>
        </div>

        {/* Code form */}
        <form onSubmit={handleRedeem} className="space-y-5">
          <div>
            <Label htmlFor="inviteCode" className="text-sm font-medium text-[#1b110b] mb-1.5 block">
              Invite Code
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="inviteCode"
                type="password"
                placeholder="Enter the invite code you received"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="pl-10 border-[#e6dec2] focus:border-[#d29c3c] focus:ring-[#d29c3c]"
                autoFocus
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              This code was provided by your SLS representative.
            </p>
          </div>

          {step === "error" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
          )}

          <Button
            type="submit"
            disabled={step === "redeeming" || !inviteCode.trim()}
            className="w-full font-semibold uppercase tracking-wide"
            style={{ background: "#d29c3c", color: "#fff" }}
          >
            {step === "redeeming" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</>
            ) : (
              "Accept Invite"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Signed in as <span className="font-medium">{user?.name ?? user?.email}</span>
          {" · "}
          <button
            className="underline hover:text-[#d29c3c] transition-colors"
            onClick={() => {
              window.location.href = getLoginUrl(token);
            }}
          >
            Sign in with a different account
          </button>
        </p>
      </div>
    </div>
  );
}
