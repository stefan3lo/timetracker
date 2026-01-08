import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/server";

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

    if (!active || !active.is_paused) {
      return NextResponse.json({ error: "No paused timer" }, { status: 400 });
    }

    const now = new Date();
    const { error: updateError } = await supabase
      .from("active_timer")
      .update({
        is_running: true,
        is_paused: false,
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
