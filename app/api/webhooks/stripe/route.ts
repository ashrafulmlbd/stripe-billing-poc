import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { eventExists, insertEvent, upsertSubscription, userByCustomer } from "@/lib/db";
import { money } from "@/lib/format";

export const runtime = "nodejs";

/**
 * The Session 2 webhook handler:
 * 1 verify  2 skip duplicates  3 don't trust order  4 save status  5 return 200 fast
 */
export async function POST(req: Request) {
  const body = await req.text(); // raw body: required for the signature check
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? ""); // 1
  } catch (e) {
    console.error("✕ webhook signature check failed:", e instanceof Error ? e.message : e);
    return new Response("bad signature", { status: 400 });
  }

  if (eventExists(event.id)) return new Response("duplicate", { status: 200 }); // 2

  const obj = event.data.object as unknown as Record<string, unknown>;
  const customerId = customerOf(event, obj);
  const user = userByCustomer(customerId);

  // Only track the demo's own customers (ignores `stripe trigger` noise and deleted clock customers).
  if (user && event.type.startsWith("customer.subscription.")) {
    try {
      const sub = await stripe().subscriptions.retrieve(obj.id as string); // 3 fetch the latest state
      upsertSubscription(sub, event.created); // 4 save
    } catch {
      upsertSubscription(obj as unknown as Stripe.Subscription, event.created);
    }
  }

  const summary = `${user?.name ?? customerId ?? "—"} · ${event.type}${amountOf(event, obj)}`;
  insertEvent({
    id: event.id,
    type: event.type,
    object_id: (obj.id as string) ?? null,
    customer_id: customerId,
    created: event.created,
    received_at: Math.floor(Date.now() / 1000),
    summary,
  });
  console.log(`${user ? "\x1b[33m●\x1b[0m" : "\x1b[90m○\x1b[0m"} ${summary}`);

  return new Response("ok", { status: 200 }); // 5
}

function customerOf(event: Stripe.Event, obj: Record<string, unknown>): string | null {
  if (event.type.startsWith("customer.") && !event.type.startsWith("customer.subscription.")) {
    return (obj.object === "customer" ? (obj.id as string) : (obj.customer as string)) ?? null;
  }
  const c = obj.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) return (c as { id: string }).id;
  return null;
}

function amountOf(event: Stripe.Event, obj: Record<string, unknown>) {
  if (event.type.startsWith("invoice.")) {
    const paid = event.type === "invoice.paid" ? obj.amount_paid : obj.amount_due;
    return ` · ${money(paid as number, obj.currency as string)}`;
  }
  return "";
}
