"use client";

import { useState, useTransition } from "react";
import { previewTiers, type Preview } from "./actions";
import { money } from "@/lib/format";

const TIERS = [["1 – 5", "$10"], ["6 – 10", "$8"], ["11 +", "$6"]];

export function TiersDemo() {
  const [seats, setSeats] = useState(12);
  const [results, setResults] = useState<Preview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reveal = () => start(async () => {
    setError(null);
    const r = await previewTiers(seats);
    if (r.ok) setResults(r.results); else setError(r.error);
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[1.4fr_1fr] gap-8">
        <div className="card p-8">
          <div className="flex items-center gap-6">
            <span className="label">Seats</span>
            <input
              type="number" min={1} max={100} value={seats}
              onChange={(e) => { setSeats(Number(e.target.value)); setResults(null); }}
              className="w-32 rounded-xl border-2 border-line bg-navy px-4 py-2 font-display text-4xl font-extrabold text-accent"
            />
            <button onClick={reveal} disabled={pending} className="btn btn-primary ml-auto text-xl">
              {pending ? "Asking Stripe…" : "Reveal"}
            </button>
          </div>
          <table className="mt-8 w-full text-xl">
            <thead><tr className="border-b-2 border-accent"><th className="label py-2 text-left">Seats</th><th className="label py-2 text-left">Price per seat / month</th></tr></thead>
            <tbody>{TIERS.map(([a, b]) => <tr key={a} className="border-b border-line"><td className="py-3 font-semibold text-accent">{a}</td><td className="py-3 font-semibold">{b}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4">
          {[["A", "$72"], ["B", "$102"], ["C", "$120"]].map(([k, v]) => (
            <div key={k} className="card flex items-center gap-6 px-8 py-5">
              <span className="label">{k}</span><span className="font-display text-5xl font-extrabold">{v}</span>
            </div>
          ))}
          <p className="text-muted">Votes are for 12 seats.</p>
        </div>
      </div>

      {error && <div className="card border-bad! p-6 text-bad">{error}</div>}

      {results && (
        <div className="grid grid-cols-2 gap-6 slidein">
          {results.map((r) => (
            <div key={r.mode} className={`card p-8 ${r.mode === "graduated" ? "card-hot" : ""}`}>
              <span className="label text-accent!">{r.mode === "volume" ? "Volume · tiers_mode=volume" : "Graduated · tiers_mode=graduated"}</span>
              <div className={`mt-2 font-display text-8xl font-extrabold ${r.mode === "graduated" ? "text-accent" : ""}`}>{money(r.total)}</div>
              <div className="mt-3 font-mono text-2xl">{r.words}</div>
              <p className="mt-2 text-muted">{r.mode === "volume" ? "All seats get the price of the tier they land in." : "Each tier is charged at its own price, like tax brackets."}</p>
              <div className="mt-6 border-t-2 border-dashed border-line pt-4">
                <p className="label mb-2">Stripe preview invoice lines</p>
                {r.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-4 py-1 font-mono text-base text-muted">
                    <span>{l.description}</span><span className="text-text">{money(l.amount)}</span>
                  </div>
                ))}
                {!r.matches && <p className="mt-2 text-sm text-bad">Local math differs from Stripe. Stripe&apos;s total is shown.</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
