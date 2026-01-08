"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getISODate } from "@/lib/utils";

type DailyScore = { date: string; worked_minutes: number };
type TimeEntry = {
  duration_sec: number;
  tasks: { title: string; projects: { name: string; areas: { name: string } | null } | null } | null;
};

export default function InsightsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rangeDays, setRangeDays] = useState(30);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  const resolveRange = () => {
    if (customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - rangeDays + 1);
    return { start: getISODate(start), end: getISODate(end) };
  };

  const loadInsights = async () => {
    const { start, end } = resolveRange();
    const [scoresResult, entriesResult] = await Promise.all([
      supabase
        .from("daily_scores")
        .select("date,worked_minutes")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true }),
      supabase
        .from("time_entries")
        .select("duration_sec,tasks(title,projects(name,areas(name)))")
        .gte("start_at", `${start}T00:00:00.000Z`)
        .lte("start_at", `${end}T23:59:59.999Z`),
    ]);

    setDailyScores(scoresResult.data ?? []);
    setTimeEntries(entriesResult.data ?? []);
  };

  useEffect(() => {
    loadInsights();
  }, [rangeDays, customStart, customEnd]);

  const dailyTrend = dailyScores.map((item) => ({ date: item.date.slice(5), minutes: item.worked_minutes }));

  const groupBy = (key: "area" | "project" | "task") => {
    const totals: Record<string, number> = {};
    timeEntries.forEach((entry) => {
      const minutes = Math.round((entry.duration_sec ?? 0) / 60);
      const label =
        key === "area"
          ? entry.tasks?.projects?.areas?.name ?? "Unassigned"
          : key === "project"
            ? entry.tasks?.projects?.name ?? "Unassigned"
            : entry.tasks?.title ?? "Untitled";
      totals[label] = (totals[label] ?? 0) + minutes;
    });
    return Object.entries(totals)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  const areaData = groupBy("area");
  const projectData = groupBy("project");
  const taskData = groupBy("task");

  return (
    <div className="space-y-8">
      <Card className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Insights</p>
            <h2 className="text-3xl font-semibold">Momentum breakdown</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={rangeDays === days && !customStart ? "primary" : "outline"}
                onClick={() => {
                  setRangeDays(days);
                  setCustomStart("");
                  setCustomEnd("");
                }}
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Start</label>
            <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">End</label>
            <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={loadInsights}>
              Apply
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-80 space-y-4">
          <h3 className="text-xl font-semibold">Daily minutes trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <XAxis dataKey="date" stroke="#8aa2b9" />
                <YAxis stroke="#8aa2b9" />
                <Tooltip contentStyle={{ background: "#0b1117", border: "1px solid #1f2a35" }} />
                <Line type="monotone" dataKey="minutes" stroke="#14f1c5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="h-80 space-y-4">
          <h3 className="text-xl font-semibold">Time by area</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData}>
                <XAxis dataKey="label" hide />
                <YAxis stroke="#8aa2b9" />
                <Tooltip contentStyle={{ background: "#0b1117", border: "1px solid #1f2a35" }} />
                <Bar dataKey="value" fill="#5fe6ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="h-80 space-y-4">
          <h3 className="text-xl font-semibold">Time by project</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData}>
                <XAxis dataKey="label" hide />
                <YAxis stroke="#8aa2b9" />
                <Tooltip contentStyle={{ background: "#0b1117", border: "1px solid #1f2a35" }} />
                <Bar dataKey="value" fill="#14f1c5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="space-y-4">
          <h3 className="text-xl font-semibold">Top tasks</h3>
          <div className="space-y-2 text-sm">
            {taskData.length === 0 ? (
              <p className="text-[var(--text-muted)]">No task data in this range.</p>
            ) : (
              taskData.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2"
                >
                  <span>{item.label}</span>
                  <span className="text-[var(--accent-2)]">{item.value}m</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
