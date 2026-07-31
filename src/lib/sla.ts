// The SLA clock: no open sponsor thread sits more than 3 days without our reply.

export const SLA_DAYS = 3;

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export type SlaState = "ok" | "warning" | "breached";

export function slaState(days: number): SlaState {
  if (days >= SLA_DAYS) return "breached";
  if (days >= SLA_DAYS - 1) return "warning";
  return "ok";
}

export function formatMoney(cents: number | null, currency = "CAD"): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric"
  });
}
