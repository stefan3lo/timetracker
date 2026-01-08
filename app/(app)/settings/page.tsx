"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getISODate } from "@/lib/utils";

type Area = { id: string; name: string };
type Project = { id: string; name: string; area_id: string | null };
type Task = { id: string; title: string; project_id: string | null };
type Template = {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  weekdays: number[] | null;
  target_type: "checkbox" | "minutes" | "count";
  target_value: number;
};

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [areas, setAreas] = useState<Area[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newArea, setNewArea] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newTask, setNewTask] = useState("");
  const [settings, setSettings] = useState({ default_target_minutes: 720, checklist_threshold: 0.9 });
  const [unlockDate, setUnlockDate] = useState(getISODate());
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    action: () => void;
  } | null>(null);

  const [templateDraft, setTemplateDraft] = useState<Partial<Template>>({
    title: "",
    frequency: "daily",
    weekdays: [],
    target_type: "checkbox",
    target_value: 1,
  });
  const [userId, setUserId] = useState<string | null>(null);

  const requireSupabase = () => {
    if (!supabase) {
      setToast("Supabase is not configured.");
      return null;
    }
    return supabase;
  };

  const loadSettings = async () => {
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    const userResult = await supabase.auth.getUser();
    const [areasResult, projectsResult, tasksResult, templatesResult, settingsResult] = await Promise.all([
      supabase.from("areas").select("id,name").order("created_at", { ascending: true }),
      supabase.from("projects").select("id,name,area_id").order("created_at", { ascending: true }),
      supabase.from("tasks").select("id,title,project_id").order("created_at", { ascending: true }),
      supabase.from("obligation_templates").select("*").order("created_at", { ascending: true }),
      supabase.from("user_settings").select("*").maybeSingle(),
    ]);

    setUserId(userResult.data.user?.id ?? null);
    setAreas(areasResult.data ?? []);
    setProjects(projectsResult.data ?? []);
    setTasks(tasksResult.data ?? []);
    setTemplates(templatesResult.data ?? []);
    if (settingsResult.data) {
      setSettings({
        default_target_minutes: settingsResult.data.default_target_minutes ?? 720,
        checklist_threshold: settingsResult.data.checklist_threshold ?? 0.9,
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const addArea = async () => {
    if (!newArea) return;
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    await supabase.from("areas").insert({ name: newArea });
    setNewArea("");
    setToast("Area created.");
    loadSettings();
  };

  const addProject = async () => {
    if (!newProject) return;
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    await supabase.from("projects").insert({ name: newProject, area_id: areas[0]?.id ?? null });
    setNewProject("");
    setToast("Project created.");
    loadSettings();
  };

  const addTask = async () => {
    if (!newTask) return;
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    await supabase.from("tasks").insert({ title: newTask, project_id: projects[0]?.id ?? null });
    setNewTask("");
    setToast("Task created.");
    loadSettings();
  };

  const saveSettings = async () => {
    if (!userId) return;
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    await supabase.from("user_settings").upsert({ user_id: userId, ...settings });
    setToast("Settings saved.");
    loadSettings();
  };

  const createTemplate = async () => {
    if (!templateDraft.title) return;
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    await supabase.from("obligation_templates").insert({
      title: templateDraft.title,
      frequency: templateDraft.frequency,
      weekdays: templateDraft.frequency === "weekly" ? templateDraft.weekdays : null,
      target_type: templateDraft.target_type,
      target_value: templateDraft.target_value ?? 1,
    });
    setToast("Template created.");
    setTemplateDraft({
      title: "",
      frequency: "daily",
      weekdays: [],
      target_type: "checkbox",
      target_value: 1,
    });
    loadSettings();
  };

  const updateTemplateWeekday = (day: number) => {
    setTemplateDraft((prev) => {
      const current = new Set(prev.weekdays ?? []);
      if (current.has(day)) current.delete(day);
      else current.add(day);
      return { ...prev, weekdays: Array.from(current).sort() };
    });
  };

  const unlockDay = async () => {
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    await supabase.from("daily_scores").update({ locked: false }).eq("date", unlockDate);
    setToast("Day unlocked.");
  };

  return (
    <div className="space-y-8">
      <Card className="space-y-6">
        <h2 className="text-2xl font-semibold">Areas, Projects, Tasks</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Areas</h3>
            {areas.map((area) => (
              <div key={area.id} className="space-y-2 rounded-2xl border border-[rgba(95,230,255,0.2)] bg-[var(--surface-muted)] p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-[rgba(95,230,255,0.5)] px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-[var(--accent-2)]">
                    Area
                  </span>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        title: "Delete area?",
                        description: "Projects will be left unassigned.",
                        confirmLabel: "Delete",
                        action: async () => {
                          setConfirm(null);
                          const client = requireSupabase();
                          if (!client) return;
                          await client.from("areas").delete().eq("id", area.id);
                          setToast("Area deleted.");
                          loadSettings();
                        },
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
                <Input
                  value={area.name}
                  onChange={(event) =>
                    setAreas((prev) =>
                      prev.map((item) => (item.id === area.id ? { ...item, name: event.target.value } : item))
                    )
                  }
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    const client = requireSupabase();
                    if (!client) return;
                    await client.from("areas").update({ name: area.name }).eq("id", area.id);
                    setToast("Area updated.");
                  }}
                >
                  Save
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input value={newArea} onChange={(event) => setNewArea(event.target.value)} placeholder="New area" />
              <Button variant="primary" onClick={addArea}>
                Add
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Projects</h3>
            {projects.map((project) => (
              <div key={project.id} className="space-y-2 rounded-2xl border border-[rgba(20,241,197,0.2)] bg-[var(--surface-muted)] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgba(20,241,197,0.6)] px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
                      Project
                    </span>
                    {!project.area_id ? (
                      <span className="rounded-full border border-[var(--danger)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--danger)]">
                        Unassigned
                      </span>
                    ) : null}
                  </div>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        title: "Delete project?",
                        description: "Tasks will be left unassigned.",
                        confirmLabel: "Delete",
                        action: async () => {
                          setConfirm(null);
                          const client = requireSupabase();
                          if (!client) return;
                          await client.from("projects").delete().eq("id", project.id);
                          setToast("Project deleted.");
                          loadSettings();
                        },
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
                <Input
                  value={project.name}
                  onChange={(event) =>
                    setProjects((prev) =>
                      prev.map((item) =>
                        item.id === project.id ? { ...item, name: event.target.value } : item
                      )
                    )
                  }
                />
                <select
                  value={project.area_id ?? ""}
                  onChange={(event) =>
                    setProjects((prev) =>
                      prev.map((item) =>
                        item.id === project.id ? { ...item, area_id: event.target.value } : item
                      )
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm"
                >
                  <option value="">No area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const client = requireSupabase();
                    if (!client) return;
                    await client
                      .from("projects")
                      .update({ name: project.name, area_id: project.area_id })
                      .eq("id", project.id);
                    setToast("Project updated.");
                  }}
                >
                  Save
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                value={newProject}
                onChange={(event) => setNewProject(event.target.value)}
                placeholder="New project"
              />
              <Button variant="primary" onClick={addProject}>
                Add
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Tasks</h3>
            {tasks.map((task) => (
              <div key={task.id} className="space-y-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[var(--surface-muted)] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgba(138,162,185,0.6)] px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      Task
                    </span>
                    {!task.project_id ? (
                      <span className="rounded-full border border-[var(--danger)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--danger)]">
                        Unassigned
                      </span>
                    ) : null}
                  </div>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        title: "Delete task?",
                        description: "This cannot be undone.",
                        confirmLabel: "Delete",
                        action: async () => {
                          setConfirm(null);
                          const client = requireSupabase();
                          if (!client) return;
                          await client.from("tasks").delete().eq("id", task.id);
                          setToast("Task deleted.");
                          loadSettings();
                        },
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
                <Input
                  value={task.title}
                  onChange={(event) =>
                    setTasks((prev) =>
                      prev.map((item) =>
                        item.id === task.id ? { ...item, title: event.target.value } : item
                      )
                    )
                  }
                />
                <select
                  value={task.project_id ?? ""}
                  onChange={(event) =>
                    setTasks((prev) =>
                      prev.map((item) =>
                        item.id === task.id ? { ...item, project_id: event.target.value } : item
                      )
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const client = requireSupabase();
                    if (!client) return;
                    await client
                      .from("tasks")
                      .update({ title: task.title, project_id: task.project_id })
                      .eq("id", task.id);
                    setToast("Task updated.");
                  }}
                >
                  Save
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="New task" />
              <Button variant="primary" onClick={addTask}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-6">
        <h2 className="text-2xl font-semibold">Obligation templates</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">New template</p>
            <Input
              value={templateDraft.title ?? ""}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Template title"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={templateDraft.frequency}
                onChange={(event) =>
                  setTemplateDraft((prev) => ({
                    ...prev,
                    frequency: event.target.value as "daily" | "weekly",
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <select
                value={templateDraft.target_type}
                onChange={(event) =>
                  setTemplateDraft((prev) => ({
                    ...prev,
                    target_type: event.target.value as Template["target_type"],
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm"
              >
                <option value="checkbox">Checkbox</option>
                <option value="minutes">Minutes</option>
                <option value="count">Count</option>
              </select>
            </div>
            {templateDraft.frequency === "weekly" ? (
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Mon", value: 1 },
                  { label: "Tue", value: 2 },
                  { label: "Wed", value: 3 },
                  { label: "Thu", value: 4 },
                  { label: "Fri", value: 5 },
                  { label: "Sat", value: 6 },
                  { label: "Sun", value: 7 },
                ].map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => updateTemplateWeekday(day.value)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      templateDraft.weekdays?.includes(day.value)
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            ) : null}
            <Input
              type="number"
              value={templateDraft.target_value ?? 1}
              onChange={(event) =>
                setTemplateDraft((prev) => ({ ...prev, target_value: Number(event.target.value) }))
              }
              placeholder="Target value"
            />
            <Button variant="primary" onClick={createTemplate}>
              Create template
            </Button>
          </div>
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No templates created yet.</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-sm font-semibold">{template.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <span className="rounded-full border border-[var(--border)] px-2 py-1">
                      {template.frequency}
                    </span>
                    {template.weekdays?.length ? (
                      <span className="rounded-full border border-[var(--border)] px-2 py-1">
                        {template.weekdays.join(",")}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[var(--border)] px-2 py-1">
                      {template.target_type} {template.target_value}
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    className="mt-3"
                    onClick={() =>
                      setConfirm({
                        title: "Delete template?",
                        description: "This will remove future instances.",
                        confirmLabel: "Delete",
                        action: async () => {
                          setConfirm(null);
                          const client = requireSupabase();
                          if (!client) return;
                          await client.from("obligation_templates").delete().eq("id", template.id);
                          setToast("Template deleted.");
                          loadSettings();
                        },
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-6">
        <h2 className="text-2xl font-semibold">Success settings</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Default target minutes
            </label>
            <Input
              type="number"
              value={settings.default_target_minutes}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  default_target_minutes: Number(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Checklist threshold
            </label>
            <Input
              type="number"
              step="0.01"
              value={settings.checklist_threshold}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  checklist_threshold: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button variant="primary" onClick={saveSettings}>
              Save settings
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Unlock day (admin)
            </label>
            <Input type="date" value={unlockDate} onChange={(event) => setUnlockDate(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() =>
                setConfirm({
                  title: "Unlock day?",
                  description: "This allows edits on the selected date.",
                  confirmLabel: "Unlock",
                  action: async () => {
                    setConfirm(null);
                    await unlockDay();
                  },
                })
              }
            >
              Unlock
            </Button>
          </div>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
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
