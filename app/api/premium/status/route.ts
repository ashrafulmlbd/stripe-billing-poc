import { currentUser } from "@/lib/users";
import { subscriptionForCustomer } from "@/lib/db";
import { hasAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/** Reads OUR database only. The welcome page polls this until the webhook has landed. */
export async function GET() {
  const user = await currentUser();
  const sub = subscriptionForCustomer(user?.stripe_customer_id);
  return Response.json({ status: sub?.status ?? null, access: hasAccess(sub?.status) });
}
