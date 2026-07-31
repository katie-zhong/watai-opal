import { slaState, type SlaState } from "@/lib/sla";

const styles: Record<SlaState, string> = {
  ok: "bg-sla-green/10 text-sla-green",
  warning: "bg-sla-amber/10 text-sla-amber",
  breached: "bg-sla-red/10 text-sla-red"
};

// The signature element: a mono day-counter that makes waiting time visible.
export function SlaBadge({ days }: { days: number }) {
  const state = slaState(days);
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${styles[state]}`}
      title={
        state === "breached"
          ? "Past the 3-day reply SLA"
          : state === "warning"
            ? "Approaching the 3-day reply SLA"
            : "Within SLA"
      }
    >
      D+{days}
    </span>
  );
}
