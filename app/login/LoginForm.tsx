"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Spec §8.1 — split-panel login.
 * Magic-link first; Google OAuth as a secondary option. Friendly copy.
 */
export default function LoginForm() {
  const search = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = search.get("next") ?? "/";

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[45%_1fr]">
      {/* Left panel: brand */}
      <div className="hidden flex-col justify-between bg-sls-dark-brown px-12 py-16 text-white md:flex">
        <div>
          <div className="font-slab text-4xl font-bold uppercase tracking-wide text-sls-gold">
            THE GRID
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
            by Southern Lighting Source
          </div>
        </div>

        <div>
          <p className="font-slab text-2xl uppercase leading-tight">
            On Time.
            <br />
            On Budget.
            <br />
            <span className="text-sls-gold">Beautiful.</span>
          </p>
          <p className="mt-4 max-w-md text-sm text-white/70">
            The private project portal for Southern Lighting Source teams and clients.
            One place for projects, submittals, documents, and decisions.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Powered by Taptico</span>
          <span>v1</span>
        </div>
      </div>

      {/* Right panel: sign in */}
      <div className="flex items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-slab text-3xl uppercase text-sls-dark-brown">
            Sign in to The Grid
          </h1>
          <p className="mt-2 text-sm text-sls-dark-brown/70">
            We will email you a one-click sign-in link. No password needed.
          </p>

          {sent ? (
            <div className="mt-8 rounded-md border border-sls-sand bg-sls-gold-pale/40 p-4 text-sm text-sls-dark-brown">
              Check <span className="font-semibold">{email}</span> for your sign-in link.
              <div className="mt-2 text-xs text-sls-dark-brown/60">
                It expires in about an hour. Did not arrive? Check spam, then try again.
              </div>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-3 text-xs uppercase tracking-widest text-sls-gold"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <form onSubmit={signInWithEmail} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-md border border-sls-sand px-3 py-2 text-sm focus:border-sls-gold focus:outline-none"
                />
                <Button
                  disabled={loading || !email}
                  type="submit"
                  variant="gold"
                  className="w-full"
                >
                  Email me a sign-in link
                </Button>
              </form>

              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-sls-dark-brown/40">
                <div className="h-px flex-1 bg-sls-sand" />
                or
                <div className="h-px flex-1 bg-sls-sand" />
              </div>

              <Button
                disabled={loading}
                onClick={signInWithGoogle}
                className="w-full"
                variant="solid"
              >
                Sign in with Google
              </Button>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          <div className="mt-10 text-xs text-sls-dark-brown/50">
            Trouble signing in? Email{" "}
            <a className="text-sls-gold" href="mailto:nick@taptico.com">
              nick@taptico.com
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
