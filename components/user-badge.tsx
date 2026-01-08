"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function UserBadge() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setEmail(null);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
      <span>{email ?? (supabase ? "Loading..." : "Supabase not set")}</span>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--accent-2)] hover:border-[var(--accent-2)]"
      >
        Sign out
      </button>
    </div>
  );
}
