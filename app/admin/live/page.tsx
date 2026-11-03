import Link from "next/link";
import { DemoHeader } from "@/components/DemoHeader";
import { LivePanels } from "@/components/LivePanels";

export default function LivePage() {
  return (
    <>
      <DemoHeader tag="Session 2 · Demo 1" path="/admin/live" title={<>Our app never asked Stripe. <span className="text-accent">Stripe told us.</span></>}>
        Subscribe at <Link href="/pricing" className="text-accent underline">/pricing</Link>, watch the events land, open <Link href="/premium" className="text-accent underline">/premium</Link>. Then click <b className="text-text">Cancel now</b> and reload /premium.
      </DemoHeader>
      <LivePanels />
    </>
  );
}
