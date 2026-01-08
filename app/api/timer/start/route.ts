import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/server";
import { calculateDurationSec } from "@/lib/timer";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const taskId = body?.task_id as string | undefined;
    if (!taskId) return NextResponse.json({ error: "Missing task_id" }, { status: 400 });

    const now = new Date();
    const { data: existing, error: activeError } = await supabase
      .from("active_timer")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    if (existing) {
      const durationSec = calculateDurationSec({
        accumulatedSec: existing.accumulated_sec ?? 0,
        lastStateChange: existing.last_state_change,
        isRunning: existing.is_running,
        now,
      });

      if (durationSec > 0 && existing.task_id) {
        const { error: insertError } = await supabase.from("time_entries").insert({
          user_id: user.id,
          task_id: existing.task_id,
          start_at: new Date(now.getTime() - durationSec * 1000).toISOString(),
          end_at: now.toISOString(),
          duration_sec: durationSec,
          source: "timer",
        });
        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }
    }

    const { error: upsertError } = await supabase.from("active_timer").upsert({
      user_id: user.id,
      task_id: taskId,
      started_at: now.toISOString(),
      is_running: true,
      is_paused: false,
      last_state_change: now.toISOString(),
      accumulated_sec: 0,
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
