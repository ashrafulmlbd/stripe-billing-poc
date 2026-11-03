import { DemoHeader } from "@/components/DemoHeader";
import { LivePanels } from "@/components/LivePanels";
import { ClockPanel } from "./ClockPanel";

export default function ClockPage() {
  return (
    <>
      <DemoHeader tag="Session 2 · Demo 2" path="/admin/clock" title={<>Trial → renewal → failed card, <span className="text-accent">in four clicks.</span></>}>
        Nusrat starts a 14-day trial with a card. Tanvir starts one with no card (pauses at the end). Each step moves the test clock and Stripe fires every webhook for real.
      </DemoHeader>
      <ClockPanel />
      <div className="mt-8"><LivePanels scope="clock" showCancel={false} /></div>
    </>
  );
}
