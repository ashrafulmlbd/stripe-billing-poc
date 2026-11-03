"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Polls OUR database (not Stripe) until the webhook has stored a status with access. */
export function WaitForWebhook({ sessionId }: { sessionId?: string }) {
  const [state, setState] = useState<{ status: string | null; access: boolean }>({ status: null, access: false });
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (state.access) return;
    const t = setInterval(async () => {
      setSeconds((s) => s + 1.5);
      const r = await fetch("/api/premium/status", { cache: "no-store" });
      if (r.ok) setState(await r.json());
    }, 1500);
    return () => clearInterval(t);
  }, [state.access]);

  const chain = sessionId ? `/admin/chain?session_id=${sessionId}` : "/admin/chain";

  return (
    <div className="card max-w-4xl p-10">
      {state.access ? (
        <div className="slidein">
          <h1 className="font-display text-6xl font-extrabold">Welcome to Premium <span className="text-ok">✓</span></h1>
          <p className="mt-4 text-xl text-muted">The webhook arrived and our database now says <code className="f">{state.status}</code>.</p>
          <div className="mt-8 flex gap-4">
            <Link href="/premium" className="btn btn-primary text-lg">Open Premium</Link>
            <Link href={chain} className="btn btn-ghost text-lg">See what Stripe created →</Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-5">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-accent" />
            <h1 className="font-display text-4xl font-extrabold">Payment received by Stripe. Waiting for confirmation from our server…</h1>
          </div>
          <p className="mt-4 text-lg text-muted">{seconds.toFixed(0)} s · checking our database every 1.5 s</p>
          {seconds > 20 && <p className="mt-2 text-accent">Taking a while? Check that <code className="f">npm run listen</code> is running and the webhook secret matches.</p>}
        </div>
      )}
      <p className="mt-8 border-t-2 border-dashed border-line pt-4 text-muted">This page does not unlock anything. <b className="text-text">The webhook does.</b></p>
    </div>
  );
}
