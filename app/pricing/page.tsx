import Link from "next/link";
import { createCheckout } from "./actions";
import { currentUser } from "@/lib/users";
import { subscriptionForCustomer } from "@/lib/db";
import { hasAccess } from "@/lib/access";
import { LOOKUP } from "@/lib/catalog";
import { StatusPill } from "@/components/StatusPill";
import { DemoHeader } from "@/components/DemoHeader";

export const dynamic = "force-dynamic";

const PLANS = [
  { key: LOOKUP.premiumMonthly, name: "Premium Monthly", price: "$29", per: "/ month", note: "All HSC & SSC courses, live classes, model tests." },
  { key: LOOKUP.premiumYearly, name: "Premium Yearly", price: "$290", per: "/ year", note: "Two months free. Same access." },
];

export default async function PricingPage() {
  const user = await currentUser();
  const sub = subscriptionForCustomer(user?.stripe_customer_id);
  const subscribed = hasAccess(sub?.status);

  return (
    <>
      <DemoHeader tag="Session 1 · Demo 2" path="/pricing" title={<>Go <span className="text-accent">Premium.</span></>}>
        Logged in as <b className="text-text">{user?.name ?? "nobody"}</b>. Clicking a plan creates a Checkout Session in <code className="f">mode: subscription</code> for this customer.
      </DemoHeader>

      {!user?.stripe_customer_id && <div className="card mb-6 border-bad! p-6 text-bad">This user has no Stripe customer. Run <code className="f">npm run seed</code>.</div>}

      {subscribed ? (
        <div className="card card-hot max-w-3xl p-8">
          <h2 className="font-display text-4xl font-extrabold">You&apos;re already Premium</h2>
          <p className="mt-3 text-lg text-muted">Status <StatusPill status={sub?.status} />. Cancel it in <Link href="/admin/live" className="text-accent underline">/admin/live</Link> to run the demo again.</p>
        </div>
      ) : (
        <div className="grid max-w-5xl grid-cols-2 gap-6">
          {PLANS.map((p, i) => (
            <form key={p.key} action={createCheckout} className={`card flex flex-col p-8 ${i === 0 ? "card-hot" : ""}`}>
              <input type="hidden" name="lookup_key" value={p.key} />
              <span className="label text-accent!">10MS Premium</span>
              <h2 className="mt-2 font-display text-4xl font-extrabold">{p.name}</h2>
              <div className="mt-4"><span className="font-display text-7xl font-extrabold">{p.price}</span><span className="ml-2 text-xl text-muted">{p.per}</span></div>
              <p className="mt-3 text-lg text-muted">{p.note}</p>
              <p className="mt-2 font-mono text-sm text-muted">lookup_key: {p.key}</p>
              <button type="submit" disabled={!user?.stripe_customer_id} className="btn btn-primary mt-6 justify-center text-xl">Go Premium</button>
            </form>
          ))}
        </div>
      )}
      <p className="mt-6 text-muted">Test card: <code className="f">4242 4242 4242 4242</code>, any future date, any CVC.</p>
    </>
  );
}
