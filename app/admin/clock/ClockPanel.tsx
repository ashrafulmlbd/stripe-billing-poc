"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSim, deleteSim, step } from "./actions";
import { switchUser } from "@/app/actions";
import { fmtDateTime } from "@/lib/format";
import type { StepId } from "@/lib/clock";

type ClockData = {
  clock: { id: string; start: number; step: number; frozenTime: number | null; status: string } | null;
  steps: { id: StepId; title: string; expect: string; target: number | null }[];
  error?: string;
};

const CIRCLED = ["", "①", "②", "③", "④", "⑤"];

export function ClockPanel() {
  const router = useRouter();
  const [data, setData] = useState<ClockData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [, start] = useTransition();

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/clock", { cache: "no-store" });
    const d: ClockData = await r.json();
    setData(d);
    if (d.error) setError(d.error);
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 3000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  const run = (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setRunning(label);
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong");
      await load();
      setRunning(null);
      router.refresh(); // the header switcher picks up the clock users
    });
  };

  const viewAs = (id: string) => start(async () => { await switchUser(id); router.push("/premium"); });

  const c = data?.clock;
  const busy = !!running || c?.status === "advancing";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr_auto] items-center gap-6">
        <div className="card flex items-center gap-10 px-8 py-6">
          <div>
            <span className="label">Test clock time</span>
            <div className="font-display text-5xl font-extrabold text-accent">{c?.frozenTime ? fmtDateTime(c.frozenTime) : "—"}</div>
          </div>
          <div>
            <span className="label">Status</span>
            <div className="mt-1 font-mono text-xl">{running ? `${running}…` : c ? c.status : "no simulation"}</div>
          </div>
          {c && <div className="ml-auto font-mono text-sm text-muted">{c.id}<br />day 0 = {fmtDateTime(c.start)}</div>}
        </div>
        <div className="flex flex-col gap-3">
          {!c ? (
            <button className="btn btn-primary text-lg" disabled={busy} onClick={() => run("Creating simulation", createSim)}>Create simulation</button>
          ) : (
            <button className="btn btn-danger" disabled={busy} onClick={() => run("Deleting simulation", deleteSim)}>Delete simulation</button>
          )}
          <button className="btn btn-ghost text-sm" disabled={!c} onClick={() => viewAs("clock_nusrat")}>/premium as Nusrat (clock)</button>
          <button className="btn btn-ghost text-sm" disabled={!c} onClick={() => viewAs("clock_tanvir")}>/premium as Tanvir (clock)</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {(data?.steps ?? []).map((s) => {
          const done = (c?.step ?? 0) >= s.id;
          return (
            <button
              key={s.id}
              disabled={!c || busy || done}
              onClick={() => run(`Running step ${s.id}`, () => step(s.id))}
              className={`card flex flex-col items-start gap-2 p-5 text-left transition enabled:hover:border-accent disabled:cursor-not-allowed ${done ? "border-ok/60! opacity-70" : ""} ${s.id === 5 ? "border-dashed!" : ""}`}
            >
              <span className="font-display text-3xl font-extrabold text-accent">{CIRCLED[s.id]} {done && <span className="text-ok">✓</span>}</span>
              <span className="text-lg font-semibold leading-tight">{s.title}</span>
              {s.target && <span className="font-mono text-sm text-muted">→ {fmtDateTime(s.target)}</span>}
              <span className="text-sm leading-snug text-muted [overflow-wrap:anywhere]">{s.expect}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="card border-bad! p-4 text-bad">{error}</div>}
    </div>
  );
}
