"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

/** Spec §8.1 — split-panel login page. */
export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    const next = search.get("next") ?? "/";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const next = search.get("next") ?? "/";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (!error) setSent(true);
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[45%_1fr]">
      {/* Left panel */}
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
            The private project portal for Southern Lighting Source clients and
            internal teams.
          </p>
        </div>
        <div className="text-xs text-white/40">Powered by Taptico</div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-slab text-3xl uppercase text-sls-dark-brown">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-sls-dark-brown/70">
            Sign in to The GRID.
          </p>

          {sent ? (
            <div className="mt-8 rounded-md border border-sls-sand bg-sls-gold-pale/40 p-4 text-sm text-sls-dark-brown">
              Check <span className="font-semibold">{email}</span> for your sign-in link.
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <Button
                disabled={loading}
                onClick={signInWithGoogle}
                className="w-full"
                variant="gold"
              >
                <Sparkles size={16} /> Sign In with Google
              </Button>

              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-sls-dark-brown/40">
                <div className="h-px flex-1 bg-sls-sand" />
                or
                <div className="h-px flex-1 bg-sls-sand" />
              </div>

              <form onSubmit={signInWithEmail} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-md border border-sls-sand px-3 py-2 text-sm focus:border-sls-gold focus:outline-none"
                />
                <Button disabled={loading || !email} type="submit" variant="solid" className="w-full">
                  Email me a sign-in link
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
