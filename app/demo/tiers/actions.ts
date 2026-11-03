"use server";

import { stripe } from "@/lib/stripe";
import { priceByLookupKey, tierMath, LOOKUP } from "@/lib/catalog";
import { getUser } from "@/lib/db";

export type Preview = {
  mode: "volume" | "graduated";
  total: number;
  words: string;
  matches: boolean;
  lines: { description: string; quantity: number | null; amount: number }[];
};

/** Two invoice previews, one per Price. Nothing is created or charged. */
export async function previewTiers(quantity: number): Promise<{ ok: true; results: Preview[] } | { ok: false; error: string }> {
  try {
    const q = Math.max(1, Math.min(100, Math.round(quantity)));
    const school = getUser("school")?.stripe_customer_id;
    if (!school) throw new Error("The school customer is missing. Run: npm run seed");

    const run = async (mode: "volume" | "graduated"): Promise<Preview> => {
      const price = await priceByLookupKey(mode === "volume" ? LOOKUP.seatVolume : LOOKUP.seatGraduated);
      const inv = await stripe().invoices.createPreview({
        customer: school,
        subscription_details: { items: [{ price: price.id, quantity: q }] },
      });
      const math = tierMath(mode, q);
      if (math.total !== inv.total) console.warn(`[tiers] ${mode}: local math ${math.total} ≠ Stripe ${inv.total}`);
      return {
        mode,
        total: inv.total,
        words: math.words,
        matches: math.total === inv.total,
        lines: inv.lines.data.map((l) => ({ description: l.description ?? "", quantity: l.quantity ?? null, amount: l.amount })),
      };
    };
    return { ok: true, results: await Promise.all([run("volume"), run("graduated")]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
