import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { postToDiscord } from "@/lib/discord";
import { SLA_DAYS, daysSince } from "@/lib/sla";

// Runs on a schedule (vercel.json). Posts SLA breaches and due tasks to Discord.
// Uses the anon key with no user session, so this route needs its own data
// access: for MVP simplicity it reads via a service-role key if provided,
// otherwise it no-ops. Set SUPABASE_SERVICE_ROLE_KEY in Vercel env (never in
// client code) to enable.

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ skipped: "no service key configured" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const lines: string[] = [];

  // SLA breaches: latest touchpoint per org waiting on us for >= SLA_DAYS.
  const { data: touchpoints } = await supabase
    .from("touchpoints")
    .select("org_id, occurred_at, awaiting_reply_from, partner_orgs(name)")
    .order("occurred_at", { ascending: false });

  const seen = new Set<string>();
  for (const t of touchpoints ?? []) {
    if (seen.has(t.org_id)) continue;
    seen.add(t.org_id);
    if (t.awaiting_reply_from !== "us") continue;
    const days = daysSince(t.occurred_at);
    if (days >= SLA_DAYS) {
      const org = t.partner_orgs as unknown as { name: string } | null;
      lines.push(`🔴 **${org?.name ?? "Unknown partner"}** — waiting on our reply for ${days} days`);
    }
  }

  // Tasks due within 24h (with reminders on).
  const soon = new Date(Date.now() + 86_400_000).toISOString();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, due_at, remind, members:assignee_member_id(discord_username)")
    .eq("status", "open")
    .eq("remind", true)
    .lte("due_at", soon);

  for (const t of tasks ?? []) {
    const assignee = t.members as unknown as { discord_username: string | null } | null;
    const who = assignee?.discord_username ? ` (@${assignee.discord_username})` : "";
    lines.push(`⏰ Task due: **${t.title}**${who}`);
  }

  if (lines.length > 0) {
    await postToDiscord(["**WAT.ai Ops — daily check**", ...lines].join("\n"));
  }
  return NextResponse.json({ posted: lines.length });
}
