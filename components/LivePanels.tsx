"use client";

import { useEffect, useRef, useState } from "react";
import { StatusPill } from "./StatusPill";
import { fmtDate, fmtTime } from "@/lib/format";
import { cancelSubscription } from "@/app/admin/live/actions";
import type { EventRow, SubWithName } from "@/lib/db";

type Feed = { subscriptions: SubWithName[]; events: EventRow[] };

/** Our subscriptions table + the webhook event feed, refreshed every 1.5 s. */
export function LivePanels({ scope, showCancel = true }: { scope?: "clock"; showCancel?: boolean }) {
  const [feed, setFeed] = useState<Feed>({ subscriptions: [], events: [] });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const prev = useRef<Record<string, string>>({});
  const [flash, setFlash] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/admin/feed${scope ? `?scope=${scope}` : ""}`, { cache: "no-store" });
        const data: Feed = await r.json();
        if (!alive) return;
        const changed: Record<string, number> = {};
        for (const s of data.subscriptions) {
          const key = `${s.status}|${s.updated_at}`;
          if (prev.current[s.id] && prev.current[s.id] !== key) changed[s.id] = Date.now();
          prev.current[s.id] = key;
        }
        if (Object.keys(changed).length) setFlash((f) => ({ ...f, ...changed }));
        setFeed(data);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    };
    load();
    const t = setInterval(load, 1500);
    return () => { alive = false; clearInterval(t); };
  }, [scope]);

  const cols = [
    { h: "Customer", w: "26%" }, { h: "Subscription", w: "24%" }, { h: "Status", w: "18%" }, { h: "Plan", w: "17%" },
    showCancel ? { h: "", w: "15%" } : { h: "Trial end", w: "15%" },
  ];

  const cancel = async (id: string) => {
    setBusy(id);
    const r = await cancelSubscription(id);
    if (!r.ok) setError(r.error);
    setBusy(null);
  };

  return (
    <div className="grid grid-cols-[7fr_5fr] gap-6">
      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b-2 border-line px-5 py-3 font-mono text-muted">
          <i className="h-3 w-3 rounded-full bg-line" /><i className="h-3 w-3 rounded-full bg-line" /><i className="h-3 w-3 rounded-full bg-line" />
          <span className="ml-2">our subscriptions table · data/demo.db</span>
        </div>
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-line text-left">
              {cols.map((c) => <th key={c.h} style={{ width: c.w }} className="label px-4 py-3">{c.h}</th>)}
            </tr>
          </thead>
          <tbody>
            {feed.subscriptions.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-muted">No rows yet. Subscriptions appear here when the webhook saves them.</td></tr>}
            {feed.subscriptions.map((s) => (
              <tr key={`${s.id}-${flash[s.id] ?? 0}`} className={`border-b border-line font-mono ${flash[s.id] ? "flash" : ""}`}>
                <td className="truncate px-4 py-3 font-sans font-semibold">{s.name}</td>
                <td className="truncate px-4 py-3 text-sm text-muted">{s.id}</td>
                <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                <td className="truncate px-4 py-3 text-sm">{s.price_lookup_key}</td>
                {!showCancel && <td className="px-4 py-3 text-sm text-muted">{fmtDate(s.trial_end)}</td>}
                {showCancel && (
                  <td className="px-4 py-3 text-right">
                    {!["canceled", "incomplete_expired"].includes(s.status) && (
                      <button onClick={() => cancel(s.id)} disabled={busy === s.id} className="btn btn-danger px-3! py-1! text-sm">{busy === s.id ? "…" : "Cancel now"}</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b-2 border-line px-5 py-3 font-mono text-muted">
          <span className="h-3 w-3 animate-pulse rounded-full bg-bad" /><span className="ml-2">event feed · newest first</span>
        </div>
        <div className="max-h-[560px] overflow-y-auto px-5 py-2">
          {feed.events.length === 0 && <p className="py-4 text-muted">Waiting for webhooks…</p>}
          {feed.events.map((e, i) => (
            <div key={e.id} className={`border-b border-dashed border-line py-2.5 font-mono ${i === 0 ? "slidein" : ""}`}>
              <div className={e.type.includes("failed") || e.type.endsWith(".deleted") ? "text-bad" : e.type.includes("paid") || e.type.endsWith(".created") ? "text-ok" : "text-text"}>{e.type}</div>
              <div className="text-sm text-muted">{e.summary?.split(" · ").filter((x, j) => j !== 1).join(" · ")} · {fmtTime(e.received_at)}</div>
            </div>
          ))}
        </div>
      </section>
      {error && <div className="col-span-2 text-bad">{error}</div>}
    </div>
  );
}
