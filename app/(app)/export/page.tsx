import { Card } from "@/components/ui/card";

export default function ExportPage() {
  return (
    <div className="space-y-8">
      <Card className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Export</p>
          <h2 className="text-3xl font-semibold">Download CSV</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Pull the latest data dumps for integrations and backups.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { href: "/api/export/time-entries", label: "time_entries.csv" },
            { href: "/api/export/daily-summary", label: "daily_summary.csv" },
            { href: "/api/export/obligations", label: "obligations.csv" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-sm transition hover:border-[var(--accent-2)]"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">CSV Export</p>
              <p className="mt-3 text-lg font-semibold">{item.label}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Download now</p>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
