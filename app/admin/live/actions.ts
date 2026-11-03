"use server";

import { stripe } from "@/lib/stripe";

export async function cancelSubscription(id: string) {
  try {
    await stripe().subscriptions.cancel(id);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
