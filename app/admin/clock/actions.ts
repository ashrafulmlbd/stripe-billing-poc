"use server";

import { createSimulation, deleteSimulation, runStep, type StepId } from "@/lib/clock";

type Result = { ok: true } | { ok: false; error: string };

const wrap = async (fn: () => Promise<unknown>): Promise<Result> => {
  try { await fn(); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
};

export const createSim = async () => wrap(createSimulation);
export const deleteSim = async () => wrap(deleteSimulation);
export const step = async (id: StepId) => wrap(() => runStep(id));
