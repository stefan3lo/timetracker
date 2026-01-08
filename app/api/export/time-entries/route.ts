import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const { supabase, user } = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("time_entries")
    .select("start_at, end_at, duration_sec, note, source, tasks(title, projects(name, areas(name)))")
    .eq("user_id", user.id)
    .order("start_at", { ascending: true });

  const rows =
    data?.map((entry) => {
      const task = Array.isArray(entry.tasks) ? entry.tasks[0] : (entry.tasks as any);
      const project = Array.isArray(task?.projects) ? task?.projects[0] : task?.projects;
      const area = Array.isArray(project?.areas) ? project?.areas[0] : project?.areas;
      return [
        entry.start_at,
        entry.end_at,
        entry.duration_sec,
        task?.title ?? "",
        project?.name ?? "",
        area?.name ?? "",
        entry.note ?? "",
        entry.source ?? "",
      ];
    }) ?? [];

  const csv = toCsv(
    ["start_at", "end_at", "duration_sec", "task", "project", "area", "note", "source"],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=time_entries.csv",
    },
  });
}
