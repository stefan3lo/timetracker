import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/server";
import { getISODate } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const date = (body?.date as string | undefined) ?? getISODate();

    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("default_target_minutes, checklist_threshold")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    const defaultTarget = settings?.default_target_minutes ?? 720;
    const checklistThreshold = settings?.checklist_threshold ?? 0.9;

    const { data: plan, error: planError } = await supabase
      .from("daily_plans")
      .select("target_minutes")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    const targetMinutes = plan?.target_minutes ?? defaultTarget;

    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select("duration_sec")
      .gte("start_at", `${date}T00:00:00.000Z`)
      .lte("start_at", `${date}T23:59:59.999Z`)
      .eq("user_id", user.id);

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    const workedMinutes = Math.floor(
      (entries ?? []).reduce((sum, entry) => sum + (entry.duration_sec ?? 0), 0) / 60
    );

    const { data: obligations, error: obligationsError } = await supabase
      .from("obligation_instances")
      .select("done")
      .eq("user_id", user.id)
      .eq("date", date);

    if (obligationsError) {
      return NextResponse.json({ error: obligationsError.message }, { status: 500 });
    }

    const total = obligations?.length ?? 0;
    const done = (obligations ?? []).filter((item) => item.done).length;
    const checklistRatio = total === 0 ? 1 : done / total;

    const win = workedMinutes >= targetMinutes && checklistRatio >= checklistThreshold;

    const { error: scoreError } = await supabase.from("daily_scores").upsert({
      user_id: user.id,
      date,
      target_minutes: targetMinutes,
      worked_minutes: workedMinutes,
      checklist_ratio: checklistRatio,
      win,
      locked: true,
    });

    if (scoreError) {
      return NextResponse.json({ error: scoreError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, win, workedMinutes, checklistRatio });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
