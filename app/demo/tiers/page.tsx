import { DemoHeader } from "@/components/DemoHeader";
import { TiersDemo } from "./TiersDemo";

export default function TiersPage() {
  return (
    <>
      <DemoHeader tag="Session 1 · Demo 1" path="/demo/tiers" title={<>Dhanmondi Model Academy buys <span className="text-accent">12 seats.</span> What&apos;s the bill?</>}>
        Same tiers, two Prices: one volume, one graduated. The totals come from Stripe&apos;s invoice preview. Nothing is created or charged.
      </DemoHeader>
      <TiersDemo />
    </>
  );
}
