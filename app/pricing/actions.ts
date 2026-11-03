"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { priceByLookupKey, LOOKUP } from "@/lib/catalog";
import { currentUser } from "@/lib/users";

export async function createCheckout(formData: FormData) {
  const lookupKey = formData.get("lookup_key") === LOOKUP.premiumYearly ? LOOKUP.premiumYearly : LOOKUP.premiumMonthly;
  const user = await currentUser();
  if (!user?.stripe_customer_id) throw new Error("This user has no Stripe customer. Run: npm run seed");

  const price = await priceByLookupKey(lookupKey);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: user.stripe_customer_id, // reuse the customer, never duplicate
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${appUrl}/premium/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
  });
  redirect(session.url!);
}
