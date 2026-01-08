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
    data?.map((entry) => [
      entry.start_at,
      entry.end_at,
      entry.duration_sec,
      entry.tasks?.title ?? "",
      entry.tasks?.projects?.name ?? "",
      entry.tasks?.projects?.areas?.name ?? "",
      entry.note ?? "",
      entry.source ?? "",
    ]) ?? [];

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
