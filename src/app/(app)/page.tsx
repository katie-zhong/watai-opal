import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SlaBadge } from "@/components/sla-badge";
import { Stat } from "@/components/stat";
import { daysSince, formatDate, formatMoney } from "@/lib/sla";
import { completeTask } from "@/lib/actions";
import type { Deal, PartnerOrg, Task, Touchpoint } from "@/lib/types";

export const dynamic = "force-dynamic";

interface WaitingThread {
  org: Pick<PartnerOrg, "id" | "name">;
  touchpoint: Touchpoint;
  days: number;
}

export default async function Dashboard() {
  const supabase = createClient();

  const [{ data: touchpoints }, { data: orgs }, { data: tasks }, { data: deals }] =
    await Promise.all([
      supabase
        .from("touchpoints")
        .select("*")
        .order("occurred_at", { ascending: false }),
      supabase.from("partner_orgs").select("id, name"),
      supabase
        .from("tasks")
        .select("*")
        .eq("status", "open")
        .order("due_at", { ascending: true, nullsFirst: false }),
      supabase.from("deals").select("*")
    ]);

  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));

  // Latest touchpoint per org; if it's waiting on us, it's on the clock.
  const latestByOrg = new Map<string, Touchpoint>();
  for (const t of (touchpoints ?? []) as Touchpoint[]) {
    if (!latestByOrg.has(t.org_id)) latestByOrg.set(t.org_id, t);
  }
  const waiting: WaitingThread[] = [...latestByOrg.values()]
    .filter((t) => t.awaiting_reply_from === "us")
    .map((t) => ({
      org: orgById.get(t.org_id) ?? { id: t.org_id, name: "Unknown" },
      touchpoint: t,
      days: daysSince(t.occurred_at)
    }))
    .sort((a, b) => b.days - a.days);

  const openTasks = (tasks ?? []) as Task[];
  const allDeals = (deals ?? []) as Deal[];
  const activeDeals = allDeals.filter(
    (d) => !["paid", "renewal"].includes(d.stage)
  );
  const pipelineValue = activeDeals.reduce(
    (sum, d) => sum + (d.amount_cents ?? 0),
    0
  );
  const stuckDeals = activeDeals.filter(
    (d) => daysSince(d.stage_entered_at) >= 7
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Everything waiting on the team, worst first.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Waiting on us" value={String(waiting.length)} />
        <Stat
          label="SLA breaches"
          value={String(waiting.filter((w) => w.days >= 3).length)}
        />
        <Stat label="Open tasks" value={String(openTasks.length)} />
        <Stat label="Active pipeline" value={formatMoney(pipelineValue)} />
      </div>

      <section>
        <h2 className="eyebrow mb-3">Threads waiting on us</h2>
        {waiting.length === 0 ? (
          <p className="card p-4 text-sm text-muted">
            Nothing waiting on a reply. Log a touchpoint from a partner page
            when a thread starts.
          </p>
        ) : (
          <ul className="card divide-y divide-line">
            {waiting.map((w) => (
              <li key={w.touchpoint.id}>
                <Link
                  href={`/partners/${w.org.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-paper"
                >
                  <SlaBadge days={w.days} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.org.name}</p>
                    <p className="truncate text-xs text-muted">
                      {w.touchpoint.next_action ?? w.touchpoint.summary}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {formatDate(w.touchpoint.occurred_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="eyebrow mb-3">Tasks due soon</h2>
          {openTasks.length === 0 ? (
            <p className="card p-4 text-sm text-muted">
              No open tasks. Add one from the Tasks page.
            </p>
          ) : (
            <ul className="card divide-y divide-line">
              {openTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <form action={completeTask.bind(null, t.id)}>
                    <button
                      className="h-4 w-4 rounded border border-line hover:border-accent"
                      aria-label={`Mark done: ${t.title}`}
                    />
                  </form>
                  <p className="min-w-0 flex-1 truncate text-sm">{t.title}</p>
                  <span className="font-mono text-xs text-muted">
                    {formatDate(t.due_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="eyebrow mb-3">Deals stuck in stage (7d+)</h2>
          {stuckDeals.length === 0 ? (
            <p className="card p-4 text-sm text-muted">
              Nothing stuck. Pipeline is moving.
            </p>
          ) : (
            <ul className="card divide-y divide-line">
              {stuckDeals.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-sla-amber">
                    D+{daysSince(d.stage_entered_at)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted">
                      {orgById.get(d.org_id)?.name} · {d.stage.replace("_", " ")}
                    </p>
                  </div>
                  <span className="font-mono text-xs">
                    {formatMoney(d.amount_cents, d.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
