import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/server";
import { calculateDurationSec } from "@/lib/timer";

export async function POST() {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: active, error: activeError } = await supabase
      .from("active_timer")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    if (!active) {
      return NextResponse.json({ error: "No active timer" }, { status: 400 });
    }

    const now = new Date();
    const durationSec = calculateDurationSec({
      accumulatedSec: active.accumulated_sec ?? 0,
      lastStateChange: active.last_state_change,
      isRunning: active.is_running,
      now,
    });

    if (durationSec > 0 && active.task_id) {
      const { error: insertError } = await supabase.from("time_entries").insert({
        user_id: user.id,
        task_id: active.task_id,
        start_at: new Date(now.getTime() - durationSec * 1000).toISOString(),
        end_at: now.toISOString(),
        duration_sec: durationSec,
        source: "timer",
      });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { error: deleteError } = await supabase
      .from("active_timer")
      .delete()
      .eq("user_id", user.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
