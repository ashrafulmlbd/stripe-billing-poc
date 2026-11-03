import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "@/components/UserSwitcher";
import { currentUserId, switchableUsers } from "@/lib/users";

export const metadata: Metadata = {
  title: "10MS Billing Demo",
  description: "Live demos for the Stripe Billing Learning Club, sessions 1 and 2",
};

const NAV = [
  { href: "/pricing", label: "Pricing" },
  { href: "/premium", label: "Premium" },
  { href: "/demo/tiers", label: "Tiers" },
  { href: "/admin/chain", label: "Chain" },
  { href: "/admin/live", label: "Live" },
  { href: "/admin/clock", label: "Clock" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let users: { id: string; label: string }[] = [];
  let dbError: string | null = null;
  try {
    users = switchableUsers();
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }
  const current = await currentUserId();

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&f[]=general-sans@400,500,600&f[]=jetbrains-mono@500&display=swap" />
      </head>
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b-2 border-line bg-ink/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center gap-8 px-10 py-4">
            <Link href="/" className="flex shrink-0 items-center gap-3 whitespace-nowrap">
              <span className="h-4 w-4 rounded-full bg-accent shadow-[0_0_0_6px_rgba(255,198,41,.18)]" />
              <span className="font-display text-2xl font-extrabold">10 Minute School <span className="text-accent">· Billing demo</span></span>
            </Link>
            <nav className="flex gap-5 text-muted">
              {NAV.map((n) => <Link key={n.href} href={n.href} className="font-semibold hover:text-accent">{n.label}</Link>)}
            </nav>
            <div className="ml-auto"><UserSwitcher users={users} current={current} /></div>
          </div>
        </header>
        {dbError && <div className="bg-bad/20 px-10 py-3 text-bad">Database error: {dbError}</div>}
        <main className="mx-auto max-w-[1600px] px-10 py-10">{children}</main>
        <footer className="mx-auto max-w-[1600px] px-10 pb-8 text-sm text-muted">
          Training demo. 10 Minute School is used as a fictional example; prices, people and the school are made up. Stripe sandbox only.
        </footer>
      </body>
    </html>
  );
}
