import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe client. Created lazily so `next build` works without keys. Refuses live keys. */
export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.endsWith("...")) {
    throw new Error("STRIPE_SECRET_KEY is missing. Copy .env.example to .env.local and add your sandbox key.");
  }
  if (!/^(sk|rk)_test_/.test(key)) {
    throw new Error("Refusing to start: STRIPE_SECRET_KEY must be a sandbox key (sk_test_ or rk_test_). This demo never touches live mode.");
  }
  client = new Stripe(key);
  return client;
}

export const dashboardUrl = (path: string) => `https://dashboard.stripe.com/test/${path}`;
