import { createClient } from "@/lib/supabase/server";
import { daysSince, formatMoney } from "@/lib/sla";
import { setDealStage } from "@/lib/actions";
import { DEAL_STAGES, STAGE_LABELS } from "@/lib/types";
import type { Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = createClient();
  const [{ data: deals }, { data: orgs }] = await Promise.all([
    supabase.from("deals").select("*").order("created_at"),
    supabase.from("partner_orgs").select("id, name")
  ]);
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const allDeals = (deals ?? []) as Deal[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="mt-1 text-sm text-muted">
          Move a deal when the stage actually changes — time-in-stage is tracked.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {DEAL_STAGES.map((stage) => {
          const inStage = allDeals.filter((d) => d.stage === stage);
          const total = inStage.reduce((s, d) => s + (d.amount_cents ?? 0), 0);
          return (
            <div key={stage} className="card p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
                <span className="font-mono text-xs text-muted">
                  {formatMoney(total)}
                </span>
              </div>
              <ul className="space-y-2">
                {inStage.map((d) => {
                  const stuck = daysSince(d.stage_entered_at) >= 7;
                  return (
                    <li
                      key={d.id}
                      className={`rounded-md border p-2 ${
                        stuck ? "border-sla-amber/50 bg-sla-amber/5" : "border-line bg-paper"
                      }`}
                    >
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted">
                        {orgName.get(d.org_id)} ·{" "}
                        <span className="font-mono">
                          {formatMoney(d.amount_cents, d.currency)}
                        </span>{" "}
                        ·{" "}
                        <span className={`font-mono ${stuck ? "text-sla-amber" : ""}`}>
                          D+{daysSince(d.stage_entered_at)}
                        </span>
                      </p>
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          const next = formData.get("stage");
                          if (next)
                            await setDealStage(d.id, next as Deal["stage"]);
                        }}
                        className="mt-2 flex gap-1"
                      >
                        <select
                          name="stage"
                          defaultValue={d.stage}
                          className="field !py-1 text-xs"
                        >
                          {DEAL_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <button className="btn-ghost !px-2 !py-1 text-xs">
                          Move
                        </button>
                      </form>
                    </li>
                  );
                })}
                {inStage.length === 0 && (
                  <li className="py-2 text-center text-xs text-muted">Empty</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
