"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getISODate, getMonthGrid } from "@/lib/utils";

type DailyScore = {
  date: string;
  win: boolean;
  worked_minutes: number;
  checklist_ratio: number;
  target_minutes: number;
};

type TimeEntry = {
  duration_sec: number;
  tasks: unknown;
};

export default function CalendarPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [scores, setScores] = useState<DailyScore[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<TimeEntry[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState({ done: 0, total: 0 });

  const grid = getMonthGrid(currentMonth);

  const loadMonth = async () => {
    if (!supabase) return;
    const first = getISODate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const last = getISODate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
    const { data } = await supabase
      .from("daily_scores")
      .select("date,win,worked_minutes,checklist_ratio,target_minutes")
      .gte("date", first)
      .lte("date", last);
    setScores(data ?? []);
  };

  const loadDayDetails = async (date: string) => {
    if (!supabase) return;
    const [entriesResult, obligationsResult] = await Promise.all([
      supabase
        .from("time_entries")
        .select("duration_sec,tasks(title,projects(name,areas(name)))")
        .gte("start_at", `${date}T00:00:00.000Z`)
        .lte("start_at", `${date}T23:59:59.999Z`),
      supabase.from("obligation_instances").select("done").eq("date", date),
    ]);
    setSelectedEntries(entriesResult.data ?? []);
    const total = obligationsResult.data?.length ?? 0;
    const done = obligationsResult.data?.filter((item) => item.done).length ?? 0;
    setSelectedChecklist({ done, total });
  };

  useEffect(() => {
    loadMonth();
  }, [currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      loadDayDetails(selectedDate);
    }
  }, [selectedDate]);

  const scoreMap = useMemo(() => {
    return new Map(scores.map((score) => [score.date, score]));
  }, [scores]);

  const breakdown = useMemo(() => {
    const area: Record<string, number> = {};
    const project: Record<string, number> = {};
    const task: Record<string, number> = {};
    selectedEntries.forEach((entry) => {
      const minutes = Math.round((entry.duration_sec ?? 0) / 60);
      const taskRecord = Array.isArray(entry.tasks) ? entry.tasks[0] : (entry.tasks as any);
      const projectRecord = Array.isArray(taskRecord?.projects)
        ? taskRecord?.projects[0]
        : taskRecord?.projects;
      const areaRecord = Array.isArray(projectRecord?.areas)
        ? projectRecord?.areas[0]
        : projectRecord?.areas;
      const areaName = areaRecord?.name ?? "Unassigned";
      const projectName = projectRecord?.name ?? "Unassigned";
      const taskName = taskRecord?.title ?? "Untitled";
      area[areaName] = (area[areaName] ?? 0) + minutes;
      project[projectName] = (project[projectName] ?? 0) + minutes;
      task[taskName] = (task[taskName] ?? 0) + minutes;
    });
    return { area, project, task };
  }, [selectedEntries]);

  return (
    <div className="space-y-8">
      <Card className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Calendar</p>
            <h2 className="text-3xl font-semibold">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                )
              }
            >
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                )
              }
            >
              Next
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-xs text-[var(--text-muted)]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center uppercase tracking-[0.2em]">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {grid.map(({ date, isCurrentMonth }) => {
            const iso = getISODate(date);
            const score = scoreMap.get(iso);
            const status = score
              ? score.win
                ? "win"
                : score.worked_minutes > 0
                  ? "partial"
                  : "miss"
              : "nodata";
            const color =
              status === "win"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : status === "partial"
                  ? "border-[var(--accent-2)] text-[var(--accent-2)]"
                  : status === "miss"
                    ? "border-[var(--danger)] text-[var(--danger)]"
                    : "border-[var(--border)] text-[var(--text-muted)]";
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={`h-20 rounded-2xl border bg-[var(--surface-muted)] p-2 text-left text-sm transition hover:border-[var(--accent-2)] ${color} ${
                  isCurrentMonth ? "" : "opacity-40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{date.getDate()}</span>
                  {score ? <span className="text-[10px]">{score.worked_minutes}m</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDate ? (
        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Day</p>
              <h3 className="text-2xl font-semibold">{selectedDate}</h3>
            </div>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>
              Close
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Checklist completion</p>
              <p className="text-lg font-semibold">
                {selectedChecklist.total === 0
                  ? "100%"
                  : `${Math.round((selectedChecklist.done / selectedChecklist.total) * 100)}%`}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Top tasks</p>
              <p className="text-sm text-[var(--text-muted)]">
                {Object.keys(breakdown.task).slice(0, 3).join(", ") || "None"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Win reason</p>
              <p className="text-sm text-[var(--text-muted)]">
                {scoreMap.get(selectedDate)?.win ? "Hit target & checklist" : "Missed target or checklist"}
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { title: "Area", data: breakdown.area },
              { title: "Project", data: breakdown.project },
              { title: "Task", data: breakdown.task },
            ].map((block) => (
              <div key={block.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">{block.title}</p>
                <div className="mt-3 space-y-2 text-sm">
                  {Object.entries(block.data).length === 0 ? (
                    <p className="text-[var(--text-muted)]">No data</p>
                  ) : (
                    Object.entries(block.data).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-[var(--accent-2)]">{value}m</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
