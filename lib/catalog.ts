import type Stripe from "stripe";
import { stripe } from "./stripe";

// Fictional 10 Minute School catalog, for training only.
export const PRODUCTS = {
  premium: { id: "tenms_premium", name: "10MS Premium" },
  schools: { id: "tenms_schools", name: "10MS for Schools" },
} as const;

export const LOOKUP = {
  premiumMonthly: "premium_monthly",
  premiumYearly: "premium_yearly",
  seatVolume: "schools_seat_volume",
  seatGraduated: "schools_seat_graduated",
} as const;

export const TIERS = [
  { upTo: 5, unit: 1000 },   // 1–5   → $10
  { upTo: 10, unit: 800 },   // 6–10  → $8
  { upTo: Infinity, unit: 600 }, // 11+ → $6
];

/** The teaching math, computed locally. The total shown on screen comes from Stripe. */
export function tierMath(mode: "volume" | "graduated", qty: number) {
  if (mode === "volume") {
    const tier = TIERS.find((t) => qty <= t.upTo)!;
    return { total: qty * tier.unit, words: `${qty} × $${tier.unit / 100}` };
  }
  let left = qty, prev = 0, total = 0;
  const parts: string[] = [];
  for (const t of TIERS) {
    const n = Math.min(left, t.upTo - prev);
    if (n <= 0) break;
    total += n * t.unit;
    parts.push(`${n} × $${t.unit / 100}`);
    left -= n;
    prev = t.upTo;
  }
  return { total, words: parts.join(" + ") };
}

const cache = new Map<string, Stripe.Price>();

export async function priceByLookupKey(key: string): Promise<Stripe.Price> {
  const hit = cache.get(key);
  if (hit) return hit;
  const { data } = await stripe().prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (!data[0]) throw new Error(`No Price with lookup_key "${key}". Run: npm run seed`);
  cache.set(key, data[0]);
  return data[0];
}
