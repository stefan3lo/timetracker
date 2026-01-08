import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const { supabase, user } = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("daily_scores")
    .select("date, target_minutes, worked_minutes, checklist_ratio, win")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  const rows =
    data?.map((entry) => [
      entry.date,
      entry.target_minutes,
      entry.worked_minutes,
      entry.checklist_ratio,
      entry.win,
    ]) ?? [];

  const csv = toCsv(
    ["date", "target_minutes", "worked_minutes", "checklist_ratio", "win"],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=daily_summary.csv",
    },
  });
}
