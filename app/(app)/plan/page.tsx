"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getISODate } from "@/lib/utils";

type Task = { id: string; title: string };
type ObligationTemplate = {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  weekdays: number[] | null;
  target_type: string;
  target_value: number;
};

export default function PlanPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getISODate(tomorrow);
  });
  const [targetMinutes, setTargetMinutes] = useState(720);
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [topTasks, setTopTasks] = useState<Array<string>>(["", "", "", "", ""]);
  const [highlightCount, setHighlightCount] = useState(5);
  const [toast, setToast] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ObligationTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});

  const weekday = new Date(date).getDay() === 0 ? 7 : new Date(date).getDay();

  const selectedHighlightIds = useMemo(() => {
    return new Set(topTasks.filter(Boolean));
  }, [topTasks]);

  const loadPlan = async () => {
    const [tasksResult, planResult, topResult, templateResult, obligationsResult] = await Promise.all([
      supabase.from("tasks").select("id,title").order("created_at", { ascending: true }),
      supabase.from("daily_plans").select("target_minutes,notes").eq("date", date).maybeSingle(),
      supabase
        .from("daily_plan_top_tasks")
        .select("task_id,rank")
        .eq("date", date)
        .order("rank", { ascending: true }),
      supabase.from("obligation_templates").select("*").order("created_at", { ascending: true }),
      supabase.from("obligation_instances").select("template_id").eq("date", date),
    ]);

    setTasks(tasksResult.data ?? []);
    setTargetMinutes(planResult.data?.target_minutes ?? 720);
    setNotes(planResult.data?.notes ?? "");
    const maxRank = (topResult.data ?? []).reduce((max, item) => Math.max(max, item.rank), 0);
    const slots = Math.max(5, maxRank);
    setHighlightCount(slots);
    const sortedTop = Array.from({ length: slots }, (_, index) => {
      const rank = index + 1;
      return topResult.data?.find((item) => item.rank === rank)?.task_id ?? "";
    });
    setTopTasks(sortedTop);
    setTemplates(templateResult.data ?? []);
    const selected: Record<string, boolean> = {};
    obligationsResult.data?.forEach((item) => {
      selected[item.template_id] = true;
    });
    setSelectedTemplates(selected);
  };

  useEffect(() => {
    loadPlan();
  }, [date]);

  useEffect(() => {
    setTopTasks((prev) => {
      if (prev.length >= highlightCount) return prev;
      const next = [...prev];
      while (next.length < highlightCount) {
        next.push("");
      }
      return next;
    });
  }, [highlightCount]);

  const isTemplateAvailable = (template: ObligationTemplate) => {
    if (template.frequency === "daily") return true;
    if (!template.weekdays) return false;
    return template.weekdays.includes(weekday);
  };

  const savePlan = async () => {
    await supabase.from("daily_plans").delete().eq("date", date);
    await supabase.from("daily_plans").insert({
      date,
      target_minutes: targetMinutes,
      notes,
    });
    await supabase.from("daily_plan_top_tasks").delete().eq("date", date);
    const inserts = topTasks
      .slice(0, highlightCount)
      .map((taskId, index) => ({ date, task_id: taskId, rank: index + 1 }))
      .filter((item) => item.task_id);
    if (inserts.length > 0) {
      await supabase.from("daily_plan_top_tasks").insert(inserts);
    }

    const instances = templates
      .filter((template) => isTemplateAvailable(template))
      .filter((template) =>
        template.frequency === "daily" ? true : selectedTemplates[template.id]
      )
      .map((template) => ({
        date,
        template_id: template.id,
      }));

    await supabase.from("obligation_instances").delete().eq("date", date);
    if (instances.length > 0) {
      await supabase.from("obligation_instances").insert(instances);
    }
    setToast("Plan saved.");
  };

  const applyToToday = async () => {
    const today = getISODate();
    if (date !== today) return;
    await savePlan();
    setToast("Plan applied to today.");
  };

  return (
    <div className="space-y-8">
      <Card className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Plan</p>
          <h2 className="text-3xl font-semibold">Plan for tomorrow</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Define the target and highlighted focus items.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Date
            </label>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Target minutes
            </label>
            <Input
              type="number"
              value={targetMinutes}
              onChange={(event) => setTargetMinutes(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Highlighted tasks</h3>
            <Button variant="outline" onClick={() => setHighlightCount((count) => count + 1)}>
              Add more
            </Button>
          </div>
          {topTasks.slice(0, highlightCount).map((taskId, index) => (
            <select
              key={`top-${index}`}
              value={taskId}
              onChange={(event) => {
                const next = [...topTasks];
                const nextValue = event.target.value;
                if (nextValue && selectedHighlightIds.has(nextValue) && nextValue !== taskId) {
                  setToast("Task is already highlighted.");
                  return;
                }
                next[index] = nextValue;
                setTopTasks(next);
              }}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm focus:border-[var(--accent-2)] focus:outline-none"
            >
              <option value="">Select task</option>
              {tasks.map((task) => (
                <option
                  key={task.id}
                  value={task.id}
                  disabled={selectedHighlightIds.has(task.id) && task.id !== taskId}
                >
                  {task.title}
                </option>
              ))}
            </select>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Obligations</h3>
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No obligation templates yet.</p>
            ) : (
              templates.map((template) => {
                const available = isTemplateAvailable(template);
                return (
                  <label
                    key={template.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
                  >
                    <span>
                      {template.title}
                      <span className="ml-2 text-xs text-[var(--text-muted)]">
                        {template.frequency} • {template.target_type} {template.target_value}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!available || template.frequency === "daily"}
                      checked={template.frequency === "daily" ? true : selectedTemplates[template.id] ?? false}
                      onChange={(event) =>
                        setSelectedTemplates((prev) => ({
                          ...prev,
                          [template.id]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm focus:border-[var(--accent-2)] focus:outline-none"
            rows={4}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={savePlan} variant="primary">
            Save plan
          </Button>
          <Button onClick={applyToToday} variant="outline" disabled={date !== getISODate()}>
            Apply plan to today
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
