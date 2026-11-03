import { addMonths } from "date-fns";
import { stripe } from "./stripe";
import { priceByLookupKey, LOOKUP } from "./catalog";
import { getSetting, setSetting, deleteSetting, upsertUser, deleteUsers, getUser } from "./db";

export const CLOCK_NAME = "10MS demo";
export const CLOCK_USERS = ["clock_nusrat", "clock_tanvir"];

const DAY = 86400;
const HOUR = 3600;

export type StepId = 1 | 2 | 3 | 4 | 5;

export type Step = {
  id: StepId;
  title: string;
  expect: string;
  /** Target frozen_time, or null for an action that doesn't move time. */
  target: (start: number) => number | null;
};

/** "+2h" covers the ~1 hour draft window before Stripe finalizes and charges a renewal invoice. */
export const STEPS: Step[] = [
  { id: 1, title: "Day 11: trial reminder", expect: "customer.subscription.trial_will_end for Nusrat and Tanvir", target: (s) => s + 11 * DAY },
  { id: 2, title: "Day 14 + 2h: trial ends", expect: "Nusrat: first invoice paid → active. Tanvir: no card → paused", target: (s) => s + 14 * DAY + 2 * HOUR },
  { id: 3, title: "Swap Nusrat's card to a failing one", expect: "Attach 4000 0000 0000 0341 (pm_card_chargeCustomerFail) as her default", target: () => null },
  { id: 4, title: "Day 44 + 2h: first renewal", expect: "Renewal invoice → payment fails → invoice.payment_failed → Nusrat past_due", target: (s) => trialEndPlusMonth(s) + 2 * HOUR },
  { id: 5, title: "Optional: +3 weeks, retries run out", expect: "Per the sandbox's retry settings → canceled or unpaid", target: (s) => trialEndPlusMonth(s) + 2 * HOUR + 21 * DAY },
];

// Calendar month, not 30 days.
const trialEndPlusMonth = (start: number) => Math.floor(addMonths(new Date((start + 14 * DAY) * 1000), 1).getTime() / 1000);

export function clockState() {
  const id = getSetting("clock_id");
  return id
    ? { id, start: Number(getSetting("clock_start")), step: Number(getSetting("clock_step") ?? 0) }
    : null;
}

/** Creates a fresh test clock with Nusrat (trial with card) and Tanvir (trial, no card → pause). */
export async function createSimulation() {
  if (clockState()) throw new Error("A simulation already exists. Delete it first.");
  const s = stripe();
  const price = await priceByLookupKey(LOOKUP.premiumMonthly);
  const start = Math.floor(Date.now() / 1000);
  const clock = await s.testHelpers.testClocks.create({ frozen_time: start, name: CLOCK_NAME });

  // Nusrat: trial WITH a card
  const nusrat = await s.customers.create({
    name: "Nusrat Jahan", email: "nusrat+clock@example.com", test_clock: clock.id, metadata: { demo_user: "clock_nusrat" },
  });
  const pm = await s.paymentMethods.attach("pm_card_visa", { customer: nusrat.id }); // returns a new pm_… id
  await s.customers.update(nusrat.id, { invoice_settings: { default_payment_method: pm.id } });
  upsertUser({ id: "clock_nusrat", name: "Nusrat (clock)", email: nusrat.email!, stripe_customer_id: nusrat.id });

  // Tanvir: trial WITHOUT a card → pause at trial end
  const tanvir = await s.customers.create({
    name: "Tanvir Ahmed", email: "tanvir+clock@example.com", test_clock: clock.id, metadata: { demo_user: "clock_tanvir" },
  });
  upsertUser({ id: "clock_tanvir", name: "Tanvir (clock)", email: tanvir.email!, stripe_customer_id: tanvir.id });

  setSetting("clock_id", clock.id);
  setSetting("clock_start", String(start));
  setSetting("clock_step", "0");

  // Create subscriptions after the users exist, so their webhooks are recognised.
  await s.subscriptions.create({ customer: nusrat.id, items: [{ price: price.id }], trial_period_days: 14 });
  await s.subscriptions.create({
    customer: tanvir.id,
    items: [{ price: price.id }],
    trial_period_days: 14,
    trial_settings: { end_behavior: { missing_payment_method: "pause" } },
  });
  return clock.id;
}

/** Waits until the clock has finished advancing (Stripe runs it asynchronously). */
async function waitReady(id: string, timeoutMs = 120_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const c = await stripe().testHelpers.testClocks.retrieve(id);
    if (c.status === "ready") return c;
    if (c.status === "internal_failure") throw new Error("Stripe reported an internal failure advancing the test clock.");
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("The test clock is still advancing. Wait a few seconds and refresh.");
}

export async function runStep(stepId: StepId) {
  const st = clockState();
  if (!st) throw new Error("No simulation. Click “Create simulation” first.");
  const step = STEPS.find((x) => x.id === stepId)!;
  const s = stripe();

  if (step.id === 3) {
    const nusrat = getUser("clock_nusrat");
    if (!nusrat?.stripe_customer_id) throw new Error("Nusrat's clock customer is missing.");
    const pm = await s.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: nusrat.stripe_customer_id });
    await s.customers.update(nusrat.stripe_customer_id, { invoice_settings: { default_payment_method: pm.id } });
  } else {
    const target = step.target(st.start)!;
    const current = await s.testHelpers.testClocks.retrieve(st.id);
    if (target <= current.frozen_time) throw new Error("The clock is already past this step.");
    await s.testHelpers.testClocks.advance(st.id, { frozen_time: target });
    await waitReady(st.id);
  }
  setSetting("clock_step", String(Math.max(st.step, step.id)));
}

export async function deleteSimulation() {
  const st = clockState();
  if (st) {
    try {
      await stripe().testHelpers.testClocks.del(st.id); // also deletes its customers and subscriptions
    } catch (e) {
      console.warn("Could not delete test clock (maybe already gone):", e instanceof Error ? e.message : e);
    }
  }
  deleteUsers(CLOCK_USERS);
  for (const k of ["clock_id", "clock_start", "clock_step"]) deleteSetting(k);
}

export async function clockInfo() {
  const st = clockState();
  if (!st) return null;
  try {
    const c = await stripe().testHelpers.testClocks.retrieve(st.id);
    return { ...st, frozenTime: c.frozen_time, status: c.status };
  } catch {
    return { ...st, frozenTime: null, status: "missing" as const };
  }
}
