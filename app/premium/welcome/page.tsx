import { WaitForWebhook } from "./WaitForWebhook";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  return <WaitForWebhook sessionId={session_id} />;
}
