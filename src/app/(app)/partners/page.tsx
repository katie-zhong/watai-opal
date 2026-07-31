import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SlaBadge } from "@/components/sla-badge";
import { daysSince } from "@/lib/sla";
import type { PartnerOrg, Touchpoint } from "@/lib/types";

export const dynamic = "force-dynamic";

const typeLabels: Record<PartnerOrg["relationship_type"], string> = {
  sponsor: "Sponsor",
  event_partner: "Event partner",
  social_partner: "Social partner"
};

export default async function PartnersPage() {
  const supabase = createClient();
  const [{ data: orgs }, { data: touchpoints }] = await Promise.all([
    supabase.from("partner_orgs").select("*").order("name"),
    supabase
      .from("touchpoints")
      .select("org_id, occurred_at, awaiting_reply_from")
      .order("occurred_at", { ascending: false })
  ]);

  const latest = new Map<string, Pick<Touchpoint, "occurred_at" | "awaiting_reply_from">>();
  for (const t of touchpoints ?? []) {
    if (!latest.has(t.org_id)) latest.set(t.org_id, t);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partners</h1>
          <p className="mt-1 text-sm text-muted">
            Sponsors, event partners, and low-touch relationships.
          </p>
        </div>
        <Link href="/partners/new" className="btn-primary">
          Add partner
        </Link>
      </header>

      <ul className="card divide-y divide-line">
        {(orgs ?? []).map((org: PartnerOrg) => {
          const last = latest.get(org.id);
          const waitingOnUs = last?.awaiting_reply_from === "us";
          return (
            <li key={org.id}>
              <Link
                href={`/partners/${org.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted">
                    {typeLabels[org.relationship_type]}
                    {org.industry ? ` · ${org.industry}` : ""}
                  </p>
                </div>
                {waitingOnUs && last && (
                  <SlaBadge days={daysSince(last.occurred_at)} />
                )}
              </Link>
            </li>
          );
        })}
        {(orgs ?? []).length === 0 && (
          <li className="p-4 text-sm text-muted">
            No partners yet. Add the first one to start the timeline.
          </li>
        )}
      </ul>
    </div>
  );
}
