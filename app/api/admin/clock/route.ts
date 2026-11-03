import { clockInfo, STEPS } from "@/lib/clock";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await clockInfo();
    const steps = STEPS.map((s) => ({ id: s.id, title: s.title, expect: s.expect, target: info ? s.target(info.start) : null }));
    return Response.json({ clock: info, steps });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
