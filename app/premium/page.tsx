import Link from "next/link";
import { currentUser } from "@/lib/users";
import { subscriptionForCustomer } from "@/lib/db";
import { hasAccess } from "@/lib/access";
import { fmtDate } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

const COURSES = ["HSC Physics · Live class", "SSC Math · Model test 4", "IELTS Speaking · Mock", "Admission prep · Chemistry"];

/** Reads OUR database only. It never calls Stripe on page load: that's the Session 2 lesson. */
export default async function PremiumPage() {
  const user = await currentUser();
  const sub = subscriptionForCustomer(user?.stripe_customer_id);
  const access = hasAccess(sub?.status);

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <span className="label">Logged in as</span><b className="text-xl">{user?.name ?? "nobody"}</b>
        <span className="label ml-6">Our DB says</span><StatusPill status={sub?.status} big />
      </div>

      {sub?.status === "past_due" && (
        <div className="mb-8 rounded-2xl border-2 border-accent bg-accent/10 p-6 text-xl">
          <b className="text-accent">Your last payment failed.</b> Update your card to keep Premium. Stripe is retrying the charge.
        </div>
      )}

      {access ? (
        <>
          <h1 className="font-display text-6xl font-extrabold">10MS <span className="text-accent">Premium</span></h1>
          <p className="mt-3 text-xl text-muted">
            {sub?.status === "trialing" ? `Free trial until ${fmtDate(sub.trial_end)}.` : "All courses unlocked."}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6">
            {COURSES.map((c) => <div key={c} className="card p-8 text-2xl font-semibold">▶ {c}</div>)}
          </div>
        </>
      ) : (
        <div className="card max-w-3xl p-12 text-center">
          <div className="text-8xl">🔒</div>
          <h1 className="mt-4 font-display text-5xl font-extrabold">Premium is locked</h1>
          <p className="mt-3 text-xl text-muted">
            {sub ? <>Subscription status is <StatusPill status={sub.status} />, which doesn&apos;t grant access.</> : "No subscription yet."}
          </p>
          <Link href="/pricing" className="btn btn-primary mt-8 text-xl">See plans</Link>
        </div>
      )}
    </div>
  );
}
