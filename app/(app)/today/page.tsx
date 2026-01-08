"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cx, formatDuration, formatMinutes, getISODate } from "@/lib/utils";

type Task = { id: string; title: string; project_id: string | null };
type Project = { id: string; name: string };
type ActiveTimer = {
  task_id: string | null;
  is_running: boolean;
  is_paused: boolean;
  last_state_change: string | null;
  accumulated_sec: number;
};

type TopTask = { id: string; task_id: string | null; rank: number };

type ObligationInstance = {
  id: string;
  done: boolean;
  obligation_templates: { title: string; target_type: string; target_value: number } | null;
};

type TimeEntry = {
  id: string;
  task_id: string | null;
  start_at: string;
  end_at: string;
  duration_sec: number;
  tasks: { title: string } | null;
};

export default function TodayPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [tick, setTick] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [topTasks, setTopTasks] = useState<TopTask[]>([]);
  const [checklist, setChecklist] = useState<ObligationInstance[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [targetMinutes, setTargetMinutes] = useState(720);
  const [workedMinutes, setWorkedMinutes] = useState(0);
  const [locked, setLocked] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(
    null
  );
  const [editTitle, setEditTitle] = useState("");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editEntryDuration, setEditEntryDuration] = useState(0);
  const [editEntryTaskId, setEditEntryTaskId] = useState<string>("");
  const [highlightCount, setHighlightCount] = useState(5);
  const [confirm, setConfirm] = useState<{
    title: string;
    description?: string;
    action: () => void;
    confirmLabel?: string;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = getISODate();

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const filteredTasks =
    selectedProjectId === "all"
      ? tasks
      : tasks.filter((task) => task.project_id === selectedProjectId);

  const loadData = useCallback(async () => {
    const [
      tasksResult,
      projectsResult,
      timerResult,
      topTasksResult,
      obligationsResult,
      planResult,
      settingsResult,
      scoreResult,
      entriesResult,
    ] = await Promise.all([
      supabase.from("tasks").select("id,title,project_id").order("created_at", { ascending: true }),
      supabase.from("projects").select("id,name").order("created_at", { ascending: true }),
      supabase.from("active_timer").select("*").maybeSingle(),
      supabase
        .from("daily_plan_top_tasks")
        .select("id,task_id,rank")
        .eq("date", today)
        .order("rank", { ascending: true }),
      supabase
        .from("obligation_instances")
        .select("id,done,obligation_templates(title,target_type,target_value)")
        .eq("date", today),
      supabase.from("daily_plans").select("target_minutes").eq("date", today).maybeSingle(),
      supabase.from("user_settings").select("default_target_minutes").maybeSingle(),
      supabase.from("daily_scores").select("locked").eq("date", today).maybeSingle(),
      supabase
        .from("time_entries")
        .select("id,task_id,start_at,end_at,duration_sec,tasks(title)")
        .gte("start_at", `${today}T00:00:00.000Z`)
        .lte("start_at", `${today}T23:59:59.999Z`)
        .order("start_at", { ascending: false }),
    ]);

    setTasks(tasksResult.data ?? []);
    setProjects(projectsResult.data ?? []);
    setActiveTimer(timerResult.data ?? null);
    setTopTasks(topTasksResult.data ?? []);
    setChecklist(obligationsResult.data ?? []);
    setTimeEntries(entriesResult.data ?? []);
    setTargetMinutes(planResult.data?.target_minutes ?? settingsResult.data?.default_target_minutes ?? 720);
    setLocked(scoreResult.data?.locked ?? false);
    const totalSeconds = (entriesResult.data ?? []).reduce(
      (sum, entry) => sum + (entry.duration_sec ?? 0),
      0
    );
    setWorkedMinutes(Math.floor(totalSeconds / 60));

    const stored = typeof window !== "undefined" ? localStorage.getItem("lastTaskId") : null;
    if (stored && !selectedTaskId) {
      setSelectedTaskId(stored);
    }
  }, [selectedTaskId, supabase, today]);

  useEffect(() => {
    if (selectedTaskId) {
      const match = tasks.find((task) => task.id === selectedTaskId);
      if (match) {
        setEditTitle(match.title);
      }
    }
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    const maxRank = topTasks.reduce((max, item) => Math.max(max, item.rank), 0);
    setHighlightCount(Math.max(5, maxRank));
  }, [topTasks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      localStorage.setItem("lastTaskId", selectedTaskId);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (!activeTimer || (!activeTimer.is_running && !activeTimer.is_paused)) {
          handleStart();
        } else if (activeTimer.is_running) {
          handlePause();
        } else if (activeTimer.is_paused) {
          handleResume();
        }
      }
      if (event.ctrlKey && event.code === "Enter") {
        event.preventDefault();
        handleEndDay();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const currentDuration = useMemo(() => {
    if (!activeTimer) return 0;
    const base = activeTimer.accumulated_sec ?? 0;
    if (!activeTimer.is_running || !activeTimer.last_state_change) return base;
    const delta = Math.floor(
      (Date.now() - new Date(activeTimer.last_state_change).getTime()) / 1000
    );
    return base + Math.max(0, delta);
  }, [activeTimer, tick]);

  const selectedHighlightIds = useMemo(() => {
    return new Set(topTasks.map((item) => item.task_id).filter(Boolean));
  }, [topTasks]);

  const handleStart = async () => {
    if (!selectedTaskId || locked) return;
    const response = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: selectedTaskId }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload?.error ?? "Failed to start timer.");
      return;
    }
    setActionError(null);
    setToast({ message: "Timer started." });
    await loadData();
  };

  const handlePause = async () => {
    if (locked) return;
    const response = await fetch("/api/timer/pause", { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload?.error ?? "Failed to pause timer.");
      return;
    }
    setActionError(null);
    setToast({ message: "Timer paused." });
    await loadData();
  };

  const handleResume = async () => {
    if (locked) return;
    const response = await fetch("/api/timer/resume", { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload?.error ?? "Failed to resume timer.");
      return;
    }
    setActionError(null);
    setToast({ message: "Timer resumed." });
    await loadData();
  };

  const handleStop = async () => {
    if (locked) return;
    const response = await fetch("/api/timer/stop", { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload?.error ?? "Failed to stop timer.");
      return;
    }
    setActionError(null);
    setToast({ message: "Timer stopped." });
    await loadData();
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle) return;
    let projectId = selectedProjectId === "all" ? null : selectedProjectId;
    if (!projectId && newProjectName) {
      const { data: project } = await supabase
        .from("projects")
        .insert({ name: newProjectName })
        .select("id")
        .single();
      projectId = project?.id ?? null;
      setNewProjectName("");
    }
    const { data } = await supabase
      .from("tasks")
      .insert({ title: newTaskTitle, project_id: projectId })
      .select("id")
      .single();
    if (data?.id) setSelectedTaskId(data.id);
    setNewTaskTitle("");
    setToast({ message: "Task created." });
    await loadData();
  };

  const updateChecklist = async (id: string, done: boolean) => {
    await supabase.from("obligation_instances").update({ done }).eq("id", id);
    setToast({ message: "Checklist updated." });
    await loadData();
  };

  const setTopTask = async (rank: number, taskId: string) => {
    if (locked) return;
    if (taskId && selectedHighlightIds.has(taskId)) {
      setToast({ message: "Task is already highlighted.", type: "error" });
      return;
    }
    await supabase.from("daily_plan_top_tasks").delete().eq("date", today).eq("rank", rank);
    if (taskId) {
      await supabase.from("daily_plan_top_tasks").insert({ date: today, task_id: taskId, rank });
    }
    setToast({ message: "Highlighted task saved." });
    await loadData();
  };

  const swapTopTasks = async (fromRank: number, toRank: number) => {
    if (locked) return;
    if (fromRank === toRank) return;
    const fromTask = topTasks.find((item) => item.rank === fromRank);
    const toTask = topTasks.find((item) => item.rank === toRank);
    await supabase
      .from("daily_plan_top_tasks")
      .delete()
      .eq("date", today)
      .in("rank", [fromRank, toRank]);
    const inserts = [
      { date: today, rank: fromRank, task_id: toTask?.task_id ?? fromTask?.task_id },
      { date: today, rank: toRank, task_id: fromTask?.task_id ?? toTask?.task_id },
    ].filter((item) => item.task_id);
    if (inserts.length > 0) {
      await supabase.from("daily_plan_top_tasks").insert(inserts);
    }
    setToast({ message: "Highlights reordered." });
    await loadData();
  };

  const checklistRatio =
    checklist.length === 0 ? 1 : checklist.filter((item) => item.done).length / checklist.length;

  const handleEndDay = async () => {
    if (locked) return;
    const response = await fetch("/api/day/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload?.error ?? "Failed to end day.");
      return;
    }
    setActionError(null);
    setToast({ message: "Day locked. Score computed." });
    await loadData();
  };

  const addHighlightSlot = async () => {
    if (locked) return;
    const nextRank = highlightCount + 1;
    await supabase.from("daily_plan_top_tasks").insert({ date: today, rank: nextRank, task_id: null });
    setHighlightCount(nextRank);
    await loadData();
  };

  const handleUnlockDay = async () => {
    if (!locked) return;
    await supabase.from("daily_scores").update({ locked: false }).eq("date", today);
    setToast({ message: "Day unlocked." });
    await loadData();
  };

  const handleRenameTask = async () => {
    if (!selectedTaskId || !editTitle.trim()) return;
    await supabase.from("tasks").update({ title: editTitle.trim() }).eq("id", selectedTaskId);
    setToast({ message: "Task renamed." });
    await loadData();
  };

  const startEditingEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditEntryDate(entry.start_at.slice(0, 10));
    setEditEntryDuration(Math.max(1, Math.round(entry.duration_sec / 60)));
    setEditEntryTaskId(entry.task_id ?? "");
  };

  const saveEntryEdits = async () => {
    if (!editingEntry) return;
    const start = new Date(editingEntry.start_at);
    const [year, month, day] = editEntryDate.split("-").map(Number);
    if (!year || !month || !day) return;
    start.setFullYear(year, month - 1, day);
    const end = new Date(start.getTime() + editEntryDuration * 60000);
    await supabase
      .from("time_entries")
      .update({
        task_id: editEntryTaskId || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        duration_sec: editEntryDuration * 60,
      })
      .eq("id", editingEntry.id);
    setToast({ message: "Entry updated." });
    setEditingEntry(null);
    await loadData();
  };

  const deleteEntry = async (entryId: string) => {
    await supabase.from("time_entries").delete().eq("id", entryId);
    setToast({ message: "Entry deleted." });
    await loadData();
  };

  const highlightSlots = useMemo(() => {
    return Array.from({ length: highlightCount }, (_, index) => index + 1);
  }, [highlightCount]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Focus</p>
              <h2 className="text-3xl font-semibold">Today</h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePause} variant="ghost" disabled={!activeTimer?.is_running || locked}>
                Pause
              </Button>
              <Button onClick={handleResume} variant="ghost" disabled={!activeTimer?.is_paused || locked}>
                Resume
              </Button>
              <Button onClick={handleStop} variant="outline" disabled={!activeTimer || locked}>
                Stop
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Timer</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[3.5rem] font-semibold leading-none text-[var(--accent)]">
                  {formatDuration(currentDuration)}
                </p>
              </div>
              <Button onClick={handleStart} variant="primary" disabled={!selectedTaskId || locked}>
                {activeTimer?.is_running || activeTimer?.is_paused ? "Restart" : "Start"}
              </Button>
            </div>
          </div>
          {actionError ? (
            <div className="rounded-2xl border border-[var(--danger)] bg-[rgba(255,111,145,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
              {actionError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Active task
              </label>
              <div className="flex items-center gap-2">
                <Input
                  ref={searchRef}
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  placeholder="Search or rename task"
                />
                <Button variant="outline" onClick={handleRenameTask} disabled={!selectedTaskId}>
                  Save
                </Button>
              </div>
              {editTitle && editTitle !== (selectedTask?.title ?? "") ? (
                <div className="mt-2 max-h-40 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                  {tasks
                    .filter((task) => task.title.toLowerCase().includes(editTitle.toLowerCase()))
                    .slice(0, 8)
                    .map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setEditTitle(task.title);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-[var(--surface)]"
                      >
                        <span>{task.title}</span>
                        <span className="text-xs text-[var(--text-muted)]">{task.id.slice(0, 6)}</span>
                      </button>
                    ))}
                </div>
              ) : null}
              <p className="text-xs text-[var(--text-muted)]">Ctrl+K focuses search</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Project filter
              </label>
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm focus:border-[var(--accent-2)] focus:outline-none"
              >
                <option value="all">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {filteredTasks.slice(0, 5).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className={cx(
                      "rounded-full border px-3 py-1 text-xs",
                      selectedTaskId === task.id
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-muted)]"
                    )}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Quick add task</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Task title"
              />
              <Button onClick={handleCreateTask} variant="primary">
                Add
              </Button>
            </div>
            {selectedProjectId === "all" ? (
              <div className="mt-3">
                <Input
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="Project name (optional)"
                />
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Today Checklist</h3>
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--accent-2)]">
              {(checklistRatio * 100).toFixed(0)}%
            </span>
          </div>
          <div className="space-y-3">
            {checklist.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No obligations for today.</p>
            ) : (
              checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
                >
                  <span>
                    {item.obligation_templates?.title ?? "Untitled obligation"}
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {item.obligation_templates?.target_type ?? "checkbox"}{" "}
                      {item.obligation_templates?.target_value ?? ""}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(event) => updateChecklist(item.id, event.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
              ))
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Highlighted tasks</h3>
              <Button
                variant="outline"
                onClick={addHighlightSlot}
                disabled={locked}
              >
                Add more
              </Button>
            </div>
            {highlightSlots.map((rank) => {
              const slot = topTasks.find((item) => item.rank === rank);
              return (
                <div key={rank} className="flex items-center gap-3">
                  <select
                    value={slot?.task_id ?? ""}
                    onChange={(event) => setTopTask(rank, event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm focus:border-[var(--accent-2)] focus:outline-none"
                  >
                    <option value="">Select task</option>
                    {tasks.map((task) => (
                      <option
                        key={task.id}
                        value={task.id}
                        disabled={selectedHighlightIds.has(task.id) && task.id !== slot?.task_id}
                      >
                        {task.title}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-col gap-1">
                    <button
                      className="rounded-full border border-[var(--border)] px-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-2)]"
                      type="button"
                      onClick={() => swapTopTasks(rank, rank - 1)}
                      disabled={rank === 1}
                    >
                      ↑
                    </button>
                    <button
                      className="rounded-full border border-[var(--border)] px-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-2)]"
                      type="button"
                      onClick={() => swapTopTasks(rank, rank + 1)}
                      disabled={rank === highlightSlots.length}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border)] px-2 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
                    onClick={() =>
                      setConfirm({
                        title: "Remove highlight?",
                        description: "This removes the task highlight slot.",
                        confirmLabel: "Remove",
                        action: async () => {
                          await supabase
                            .from("daily_plan_top_tasks")
                            .delete()
                            .eq("date", today)
                            .eq("rank", rank);
                          if (!slot?.task_id && rank === highlightCount && highlightCount > 5) {
                            setHighlightCount((count) => count - 1);
                          }
                          setConfirm(null);
                          setToast({ message: "Highlight removed." });
                          await loadData();
                        },
                      })
                    }
                    disabled={highlightCount <= 5 && !slot?.task_id}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs">
              <p className="text-[var(--text-muted)]">Worked</p>
              <p className="text-lg font-semibold">{formatMinutes(workedMinutes)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs">
              <p className="text-[var(--text-muted)]">Target</p>
              <p className="text-lg font-semibold">{formatMinutes(targetMinutes)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs">
              <p className="text-[var(--text-muted)]">Checklist</p>
              <p className="text-lg font-semibold">{(checklistRatio * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleEndDay} variant="primary" disabled={locked}>
              {locked ? "Day locked" : "End day"}
            </Button>
            {locked ? (
              <Button
                onClick={() =>
                  setConfirm({
                    title: "Unlock this day?",
                    description: "Unlocking allows edits and time adjustments for today.",
                    confirmLabel: "Unlock",
                    action: async () => {
                      setConfirm(null);
                      await handleUnlockDay();
                    },
                  })
                }
                variant="outline"
              >
                Unlock day
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Ctrl+Enter to end the day</p>
        </Card>
      </section>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">Time log</p>
            <h3 className="text-xl font-semibold">Entries</h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {locked ? "Day locked (unlock to edit)" : "Edit duration, date, task"}
          </span>
        </div>
        {timeEntries.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No entries logged yet.</p>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => {
              const isEditing = editingEntry?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
                >
                  {isEditing ? (
                    <>
                      <Input
                        type="date"
                        value={editEntryDate}
                        onChange={(event) => setEditEntryDate(event.target.value)}
                        className="max-w-[150px]"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={editEntryDuration}
                        onChange={(event) => setEditEntryDuration(Number(event.target.value))}
                        className="max-w-[120px]"
                      />
                      <select
                        value={editEntryTaskId}
                        onChange={(event) => setEditEntryTaskId(event.target.value)}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm"
                      >
                        <option value="">No task</option>
                        {tasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                      <Button variant="primary" onClick={saveEntryEdits} disabled={locked}>
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingEntry(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-[var(--text-muted)]">
                        {entry.start_at.slice(0, 10)}
                      </span>
                      <span className="text-xs text-[var(--accent-2)]">
                        {Math.round(entry.duration_sec / 60)}m
                      </span>
                      <span className="flex-1">{entry.tasks?.title ?? "Unassigned task"}</span>
                      <Button
                        variant="outline"
                        onClick={() => startEditingEntry(entry)}
                        disabled={locked}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setConfirm({
                            title: "Delete time entry?",
                            description: "This cannot be undone.",
                            confirmLabel: "Delete",
                            action: async () => {
                              setConfirm(null);
                              await deleteEntry(entry.id);
                            },
                          })
                        }
                        disabled={locked}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action()}
      />
    </div>
  );
}
