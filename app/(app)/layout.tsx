import Link from "next/link";
import { ReactNode } from "react";
import { UserBadge } from "@/components/user-badge";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/calendar", label: "Calendar" },
  { href: "/insights", label: "Insights" },
  { href: "/export", label: "Export" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(5,7,11,0.85)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-[var(--accent-2)]">Second Brain</p>
            <h1 className="text-lg font-semibold">Work Console</h1>
          </div>
          <UserBadge />
        </div>
        <nav className="mx-auto flex max-w-6xl items-center gap-3 px-6 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-transparent px-4 py-1 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] transition hover:border-[var(--border)] hover:text-[var(--text)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
