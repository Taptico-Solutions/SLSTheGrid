"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Hybrid auth callback. Supabase delivers session tokens two different ways:
 *   - PKCE / OAuth code flow: ?code=...
 *   - Magic-link implicit flow: #access_token=...&refresh_token=...
 *
 * The server cannot read the hash fragment, so this page runs on the client.
 * The Supabase browser client auto-handles BOTH flows on init (it inspects
 * window.location for #access_token tokens and exchanges ?code= if present).
 *
 * We just wait for the session to land in cookies, then redirect to `next`.
 */
function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<"signing-in" | "error">("signing-in");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const next = search.get("next") ?? "/";
    const supabase = createSupabaseBrowserClient();

    (async () => {
      try {
        // If the URL has a PKCE code, exchange it explicitly.
        const code = search.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          // Implicit flow: tokens are in the hash. Parse and call setSession so the
          // SSR cookies get written. supabase-js v2 also auto-picks these up on init
          // via detectSessionInUrl, but we set them explicitly so we know they
          // are persisted before we redirect.
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const access_token = hashParams.get("access_token");
          const refresh_token = hashParams.get("refresh_token");
          if (!access_token || !refresh_token) throw new Error("Missing tokens in URL.");
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          // Clean the hash so refresh doesn't re-trigger.
          history.replaceState(null, "", window.location.pathname + window.location.search);
        } else {
          // No code and no hash tokens. The user landed here without auth params.
          throw new Error("No auth tokens in URL. Click the magic link again or request a new one.");
        }

        // Confirm a session exists, then redirect.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sign-in did not complete. Please try the link again.");

        router.replace(next);
      } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Sign-in failed.";
        setErrorMsg(msg);
        setStatus("error");
      }
    })();
  }, [router, search]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
          <h1 className="font-slab text-2xl uppercase text-sls-dark-brown">
            Sign-in did not work
          </h1>
          <p className="mt-3 text-sm text-sls-dark-brown/70">
            {errorMsg}
          </p>
          <a
            href="/login"
            className="mt-6 rounded-md border border-sls-gold px-4 py-2 text-sm text-sls-dark-brown hover:bg-sls-gold-pale/40"
          >
            Back to sign in
          </a>
          <p className="mt-6 text-xs text-sls-dark-brown/50">
            Stuck? Email <a className="text-sls-gold" href="mailto:nick@taptico.com">nick@taptico.com</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sls-gold border-t-transparent" />
        <h1 className="mt-6 font-slab text-2xl uppercase text-sls-dark-brown">
          Signing you in
        </h1>
        <p className="mt-3 text-sm text-sls-dark-brown/70">
          Hold on. Sending you to The Grid.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CallbackInner />
    </Suspense>
  );
}
