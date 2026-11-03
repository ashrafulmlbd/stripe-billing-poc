/**
 * npm run seed
 * Idempotent: creates the 10MS catalog and the Session 1 customers in your sandbox,
 * and stores the customer IDs in data/demo.db. Safe to run many times.
 */
import Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { LOOKUP, PRODUCTS } from "../lib/catalog";
import { upsertUser, getUser, closeDb } from "../lib/db";

const s = stripe();

async function ensureProduct(id: string, name: string) {
  try {
    const p = await s.products.retrieve(id);
    console.log(`  = product ${id}`);
    return p;
  } catch (e) {
    if ((e as Stripe.errors.StripeError).code !== "resource_missing") throw e;
    const p = await s.products.create({ id, name });
    console.log(`  + product ${id}`);
    return p;
  }
}

async function ensurePrice(lookup_key: string, params: Omit<Stripe.PriceCreateParams, "lookup_key">) {
  const { data } = await s.prices.list({ lookup_keys: [lookup_key], limit: 1 });
  if (data[0]) {
    console.log(`  = price ${lookup_key} (${data[0].id})`);
    return data[0];
  }
  const p = await s.prices.create({ ...params, lookup_key });
  console.log(`  + price ${lookup_key} (${p.id})`);
  return p;
}

const tiers: Stripe.PriceCreateParams.Tier[] = [
  { up_to: 5, unit_amount: 1000 },
  { up_to: 10, unit_amount: 800 },
  { up_to: "inf", unit_amount: 600 },
];

async function ensureCustomer(demoUser: string, name: string, email: string) {
  const existing = getUser(demoUser)?.stripe_customer_id;
  if (existing) {
    try {
      const c = await s.customers.retrieve(existing);
      if (!c.deleted) {
        console.log(`  = customer ${demoUser} (${existing})`);
        return existing;
      }
    } catch { /* fall through and look it up / recreate */ }
  }
  const found = await s.customers.search({ query: `metadata['demo_user']:'${demoUser}'`, limit: 1 });
  const c = found.data[0] ?? (await s.customers.create({ name, email, metadata: { demo_user: demoUser } }));
  console.log(`  ${found.data[0] ? "=" : "+"} customer ${demoUser} (${c.id})`);
  upsertUser({ id: demoUser, name, email, stripe_customer_id: c.id });
  return c.id;
}

async function main() {
  console.log("Seeding 10 Minute School demo catalog…");
  await ensureProduct(PRODUCTS.premium.id, PRODUCTS.premium.name);
  await ensureProduct(PRODUCTS.schools.id, PRODUCTS.schools.name);

  await ensurePrice(LOOKUP.premiumMonthly, { product: PRODUCTS.premium.id, currency: "usd", unit_amount: 2900, recurring: { interval: "month" }, nickname: "Premium monthly" });
  await ensurePrice(LOOKUP.premiumYearly, { product: PRODUCTS.premium.id, currency: "usd", unit_amount: 29000, recurring: { interval: "year" }, nickname: "Premium yearly" });
  await ensurePrice(LOOKUP.seatVolume, { product: PRODUCTS.schools.id, currency: "usd", recurring: { interval: "month" }, billing_scheme: "tiered", tiers_mode: "volume", tiers, nickname: "Seats · volume" });
  await ensurePrice(LOOKUP.seatGraduated, { product: PRODUCTS.schools.id, currency: "usd", recurring: { interval: "month" }, billing_scheme: "tiered", tiers_mode: "graduated", tiers, nickname: "Seats · graduated" });

  await ensureCustomer("nusrat", "Nusrat Jahan", "nusrat@example.com");
  await ensureCustomer("school", "Dhanmondi Model Academy", "billing@example.com");

  console.log("Done.");
  closeDb();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
