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

    if (!active || !active.is_running) {
      return NextResponse.json({ error: "No running timer" }, { status: 400 });
    }

    const now = new Date();
    const accumulated = calculateDurationSec({
      accumulatedSec: active.accumulated_sec ?? 0,
      lastStateChange: active.last_state_change,
      isRunning: true,
      now,
    });

    const { error: updateError } = await supabase
      .from("active_timer")
      .update({
        is_running: false,
        is_paused: true,
        accumulated_sec: accumulated,
        last_state_change: now.toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
