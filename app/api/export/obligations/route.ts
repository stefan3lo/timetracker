import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const { supabase, user } = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("obligation_instances")
    .select("date, done, actual_value, obligation_templates(title, target_value)")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  const rows =
    data?.map((entry) => [
      entry.date,
      entry.obligation_templates?.title ?? "",
      entry.obligation_templates?.target_value ?? "",
      entry.actual_value ?? "",
      entry.done ?? false,
    ]) ?? [];

  const csv = toCsv(["date", "obligation", "target", "actual", "done"], rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=obligations.csv",
    },
  });
}
