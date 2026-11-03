import { statusGroup, type StatusGroup } from "@/lib/access";

const COLORS = { good: "border-ok text-ok", problem: "border-accent text-accent", ended: "border-bad text-bad" };

// Invoice / PaymentIntent / Charge statuses also appear on the chain page.
const OTHER: Record<string, StatusGroup> = {
  paid: "good", succeeded: "good", draft: "problem", open: "problem", processing: "problem",
  requires_payment_method: "problem", requires_action: "problem", requires_confirmation: "problem",
  void: "ended", uncollectible: "ended", failed: "ended",
};

export function StatusPill({ status, big = false }: { status?: string | null; big?: boolean }) {
  if (!status) return <span className="font-mono text-muted">none</span>;
  const group = OTHER[status] ?? statusGroup(status);
  return (
    <span className={`inline-block rounded-full border-2 font-mono ${big ? "px-5 py-1 text-xl" : "px-3 text-sm"} ${COLORS[group]}`}>
      {status}
    </span>
  );
}
