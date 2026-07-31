import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SlaBadge } from "@/components/sla-badge";
import { daysSince, formatDate, formatMoney } from "@/lib/sla";
import { addContact, addTouchpoint, createDeal } from "@/lib/actions";
import { STAGE_LABELS } from "@/lib/types";
import type { Contact, Deal, PartnerOrg, Touchpoint } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PartnerPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [{ data: org }, { data: touchpoints }, { data: contacts }, { data: deals }] =
    await Promise.all([
      supabase.from("partner_orgs").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("touchpoints")
        .select("*")
        .eq("org_id", params.id)
        .order("occurred_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("org_id", params.id).order("name"),
      supabase
        .from("deals")
        .select("*")
        .eq("org_id", params.id)
        .order("created_at", { ascending: false })
    ]);

  if (!org) notFound();
  const partner = org as PartnerOrg;
  const timeline = (touchpoints ?? []) as Touchpoint[];
  const latest = timeline[0];
  const waitingOnUs = latest?.awaiting_reply_from === "us";

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{partner.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {partner.relationship_type.replace("_", " ")}
            {partner.industry ? ` · ${partner.industry}` : ""}
            {partner.source ? ` · via ${partner.source}` : ""}
          </p>
        </div>
        {waitingOnUs && latest && <SlaBadge days={daysSince(latest.occurred_at)} />}
      </header>

      {/* Most urgent thing on top; everything else below. */}
      {waitingOnUs && latest && (
        <div className="card border-l-4 border-l-sla-red p-4">
          <p className="text-sm font-medium">Waiting on our reply</p>
          <p className="mt-1 text-sm text-muted">
            {latest.next_action ?? latest.summary}
          </p>
        </div>
      )}

      <section>
        <h2 className="eyebrow mb-3">Log a touchpoint</h2>
        <form action={addTouchpoint} className="card space-y-3 p-4">
          <input type="hidden" name="org_id" value={partner.id} />
          <textarea
            name="summary"
            required
            rows={2}
            className="field"
            placeholder="What happened? (call summary, email sent, met at event…)"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select name="kind" className="field">
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="event">Event</option>
              <option value="discord">Discord</option>
              <option value="other">Other</option>
            </select>
            <select name="awaiting_reply_from" className="field" defaultValue="none">
              <option value="none">No reply needed</option>
              <option value="us">Waiting on us — start the clock</option>
              <option value="them">Waiting on them</option>
            </select>
            <input
              name="next_action"
              className="field"
              placeholder="Next action (optional)"
            />
          </div>
          <button type="submit" className="btn-primary">Log touchpoint</button>
        </form>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="card p-4 text-sm text-muted">
            No touchpoints yet. The first one starts this partner&apos;s history.
          </p>
        ) : (
          <ol className="card divide-y divide-line">
            {timeline.map((t) => (
              <li key={t.id} className="flex gap-3 px-4 py-3">
                <span className="w-16 shrink-0 pt-0.5 font-mono text-xs text-muted">
                  {formatDate(t.occurred_at)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="mr-2 rounded bg-paper px-1.5 py-0.5 text-xs capitalize text-muted">
                      {t.kind}
                    </span>
                    {t.summary}
                  </p>
                  {t.next_action && (
                    <p className="mt-1 text-xs text-muted">→ {t.next_action}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="eyebrow mb-3">Contacts</h2>
          <ul className="card divide-y divide-line">
            {(contacts ?? []).map((c: Contact) => (
              <li key={c.id} className="px-4 py-3">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.role_title ?? "—"}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
              </li>
            ))}
            <li className="p-3">
              <form action={addContact} className="flex flex-wrap gap-2">
                <input type="hidden" name="org_id" value={partner.id} />
                <input name="name" required placeholder="Name" className="field flex-1" />
                <input name="email" placeholder="Email" className="field flex-1" />
                <input name="role_title" placeholder="Role" className="field flex-1" />
                <button type="submit" className="btn-ghost">Add</button>
              </form>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="eyebrow mb-3">Deals</h2>
          <ul className="card divide-y divide-line">
            {(deals ?? []).map((d: Deal) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted">
                    {STAGE_LABELS[d.stage]}
                    {d.round ? ` · ${d.round}` : ""}
                  </p>
                </div>
                <span className="font-mono text-sm">
                  {formatMoney(d.amount_cents, d.currency)}
                </span>
              </li>
            ))}
            <li className="p-3">
              <form action={createDeal} className="flex flex-wrap gap-2">
                <input type="hidden" name="org_id" value={partner.id} />
                <input name="name" required placeholder="Deal name" className="field flex-1" />
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Amount"
                  className="field w-28"
                />
                <select name="currency" className="field w-24">
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
                <input name="round" placeholder="Round" className="field w-28" />
                <button type="submit" className="btn-ghost">Add</button>
              </form>
            </li>
          </ul>
        </section>
      </div>

      {partner.notes && (
        <section>
          <h2 className="eyebrow mb-3">Notes</h2>
          <p className="card whitespace-pre-wrap p-4 text-sm">{partner.notes}</p>
        </section>
      )}
    </div>
  );
}
