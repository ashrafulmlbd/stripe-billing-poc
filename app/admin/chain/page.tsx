import type Stripe from "stripe";
import { stripe, dashboardUrl } from "@/lib/stripe";
import { currentUser } from "@/lib/users";
import { subscriptionForCustomer, eventsForCustomer } from "@/lib/db";
import { money, fmtDate, fmtDateTime } from "@/lib/format";
import { DemoHeader } from "@/components/DemoHeader";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

type Card = { kind: string; title: string; id: string; link: string; status?: string; lines: string[] };

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : x?.id ?? null);

/** Finds the subscription to show: from the Checkout Session, an explicit id, or the current user's latest. */
async function resolveSubscription(sessionId?: string, subscriptionId?: string) {
  const s = stripe();
  if (sessionId) {
    const cs = await s.checkout.sessions.retrieve(sessionId);
    const id = idOf(cs.subscription);
    if (id) return id;
  }
  if (subscriptionId) return subscriptionId;
  const user = await currentUser();
  return subscriptionForCustomer(user?.stripe_customer_id)?.id ?? null;
}

/** Invoice → PaymentIntent: on recent API versions this goes through Invoice Payments, not invoice.payment_intent. */
async function paymentIntentForInvoice(invoiceId: string) {
  const { data } = await stripe().invoicePayments.list({ invoice: invoiceId, limit: 1 });
  return idOf(data[0]?.payment?.payment_intent as string | Stripe.PaymentIntent | undefined);
}

async function buildChain(subId: string) {
  const s = stripe();
  const sub = await s.subscriptions.retrieve(subId);
  const customer = await s.customers.retrieve(idOf(sub.customer)!);
  const item = sub.items.data[0];
  const cards: Card[] = [];

  cards.push({
    kind: "Customer", title: customer.deleted ? "(deleted)" : customer.name ?? "—", id: customer.id, link: dashboardUrl(`customers/${customer.id}`),
    lines: customer.deleted ? [] : [customer.email ?? ""],
  });
  cards.push({
    kind: "Subscription", title: "10MS Premium", id: sub.id, link: dashboardUrl(`subscriptions/${sub.id}`), status: sub.status,
    lines: [`created ${fmtDate(sub.created)}`],
  });
  if (item) {
    cards.push({
      kind: "Subscription Item", title: `× ${item.quantity ?? 1}`, id: item.id, link: dashboardUrl(`subscriptions/${sub.id}`),
      lines: [item.price.lookup_key ?? item.price.id, `${money(item.price.unit_amount)} / ${item.price.recurring?.interval}`, `${fmtDate(item.current_period_start)} → ${fmtDate(item.current_period_end)}`],
    });
  }

  const invoiceId = idOf(sub.latest_invoice);
  if (invoiceId) {
    const inv = await s.invoices.retrieve(invoiceId);
    cards.push({
      kind: "Invoice", title: money(inv.total, inv.currency), id: inv.id!, link: dashboardUrl(`invoices/${inv.id}`), status: inv.status ?? undefined,
      lines: [`paid ${money(inv.amount_paid, inv.currency)}`, inv.billing_reason ?? ""],
    });

    const piId = await paymentIntentForInvoice(inv.id!);
    if (piId) {
      const pi = await s.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      cards.push({
        kind: "PaymentIntent", title: money(pi.amount, pi.currency), id: pi.id, link: dashboardUrl(`payments/${pi.id}`), status: pi.status,
        lines: [],
      });
      const ch = pi.latest_charge as Stripe.Charge | null;
      if (ch && typeof ch === "object") {
        const card = ch.payment_method_details?.card;
        cards.push({
          kind: "Charge", title: card ? `${card.brand?.toUpperCase()} ${card.last4}` : "Charge", id: ch.id, link: dashboardUrl(`payments/${pi.id}`),
          status: ch.paid ? "paid" : ch.status, lines: [money(ch.amount, ch.currency)],
        });
      }
    } else {
      cards.push({ kind: "PaymentIntent", title: "none yet", id: "—", link: "#", lines: [inv.total === 0 ? "$0 invoice (e.g. a trial): nothing to charge" : "not created yet"] });
    }
  }
  return { cards, customerId: customer.id };
}

export default async function ChainPage({ searchParams }: { searchParams: Promise<{ session_id?: string; subscription_id?: string }> }) {
  const { session_id, subscription_id } = await searchParams;
  let error: string | null = null;
  let data: Awaited<ReturnType<typeof buildChain>> | null = null;
  try {
    const subId = await resolveSubscription(session_id, subscription_id);
    if (subId) data = await buildChain(subId);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const events = data ? eventsForCustomer(data.customerId) : [];

  return (
    <>
      <DemoHeader tag="Session 1 · Demo 2" path="/admin/chain" title={<>One click, <span className="text-accent">six objects.</span></>}>
        Everything below was created by Stripe from a single Checkout Session. Click any card to open it in the Dashboard.
      </DemoHeader>

      {error && <div className="card mb-6 border-bad! p-6 text-bad">{error}</div>}
      {!data && !error && <div className="card p-8 text-xl text-muted">No subscription for this user yet. Subscribe at <a className="text-accent underline" href="/pricing">/pricing</a> first.</div>}

      {data && (
        <>
          <div className="grid grid-cols-6 gap-8">
            {data.cards.map((c, i) => (
              <a key={c.kind} href={c.link} target="_blank" rel="noreferrer" className="card relative block p-5 transition hover:border-accent">
                {i < data!.cards.length - 1 && <span className="absolute -right-7 top-1/2 -translate-y-1/2 text-2xl font-bold text-accent">→</span>}
                <span className="label text-xs!">{c.kind}</span>
                <div className="mt-1 font-display text-2xl font-extrabold">{c.title}</div>
                <div className="mt-1 break-all font-mono text-sm text-accent">{c.id}</div>
                {c.status && <div className="mt-2"><StatusPill status={c.status} /></div>}
                {c.lines.filter(Boolean).map((l) => <div key={l} className="mt-1 text-sm text-muted">{l}</div>)}
              </a>
            ))}
          </div>

          <h2 className="label mb-4 mt-12">Events received by our webhook for this customer · in order</h2>
          {events.length === 0 ? (
            <p className="text-muted">No webhook events yet. Is <code className="f">npm run listen</code> running?</p>
          ) : (
            <ol className="flex flex-wrap gap-3">
              {events.map((e, i) => (
                <li key={e.id} className="card px-4 py-2 font-mono text-base">
                  <span className="mr-2 text-accent">{i + 1}</span>{e.type}
                  <span className="ml-3 text-sm text-muted">{fmtDateTime(e.created)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}
