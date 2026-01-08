"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (mode: "signin" | "signup") => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      if (mode === "signin") {
        setMessage("Signed in. Redirecting...");
        window.location.href = "/today";
      } else {
        setMessage("Account created. You can sign in.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-md space-y-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 shadow-2xl">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Second Brain</p>
          <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Minimal steps to start your day. Single-user auth.
          </p>
        </div>
        <div className="space-y-4">
          <label className="text-sm text-[var(--text-muted)]">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm focus:border-[var(--accent-2)] focus:outline-none"
              placeholder="you@company.com"
            />
          </label>
          <label className="text-sm text-[var(--text-muted)]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm focus:border-[var(--accent-2)] focus:outline-none"
              placeholder="••••••••"
            />
          </label>
        </div>
        {message ? <p className="text-sm text-[var(--accent-2)]">{message}</p> : null}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleAuth("signin")}
            disabled={loading}
            className="rounded-2xl border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:shadow-[0_0_24px_var(--glow)] disabled:opacity-60"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => handleAuth("signup")}
            disabled={loading}
            className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--accent-2)] transition hover:border-[var(--accent-2)] disabled:opacity-60"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
