import Link from "next/link";

const DEMOS = [
  { session: "Session 1 · Demo 1", title: "Guess the total", body: "Same tiers, 12 seats: volume vs graduated, priced by Stripe.", href: "/demo/tiers" },
  { session: "Session 1 · Demo 2", title: "One click, six objects", body: "Subscribe with Checkout, then walk the objects Stripe created.", href: "/pricing" },
  { session: "Session 2 · Demo 1", title: "Events arriving at our server", body: "Webhooks update our table; /premium locks and unlocks.", href: "/admin/live" },
  { session: "Session 2 · Demo 2", title: "Trial → renewal → failed card", body: "A test clock runs 44 days of billing in about 2 minutes.", href: "/admin/clock" },
];

export default function Home() {
  return (
    <div>
      <p className="label mb-4 text-accent!">Stripe Billing Learning Club</p>
      <h1 className="font-display text-6xl font-extrabold">Live demos</h1>
      <p className="mt-4 max-w-3xl text-xl text-muted">Pick the demo you&apos;re about to run. Use the switcher in the header to change who is &quot;logged in&quot;.</p>
      <div className="mt-10 grid grid-cols-2 gap-6">
        {DEMOS.map((d) => (
          <Link key={d.href} href={d.href} className="card p-8 transition hover:border-accent">
            <span className="label text-accent!">{d.session}</span>
            <h2 className="mt-2 font-display text-4xl font-extrabold">{d.title}</h2>
            <p className="mt-2 text-lg text-muted">{d.body}</p>
            <span className="mt-4 inline-block font-mono text-accent">{d.href} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
