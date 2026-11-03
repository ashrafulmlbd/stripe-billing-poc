import { listEvents, listSubscriptions, getUser } from "@/lib/db";
import { CLOCK_USERS } from "@/lib/clock";

export const dynamic = "force-dynamic";

/** Polled every 1.5 s by the live panels. ?scope=clock limits it to the test-clock customers. */
export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope");
  const ids = scope === "clock"
    ? CLOCK_USERS.map((u) => getUser(u)?.stripe_customer_id).filter((x): x is string => !!x)
    : undefined;
  return Response.json({ subscriptions: listSubscriptions(ids), events: listEvents(30, ids) });
}
