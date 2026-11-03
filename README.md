# 10MS Billing Demo App

Live demos for the **Stripe Billing Learning Club**, Sessions 1 & 2 (Team Billing / Revenue).
Next.js (App Router) + Stripe + SQLite. Sandbox only: the app refuses live keys.

> 10 Minute School is used as a fictional example. Products, prices, people and the school are made up for training.

| Session | Demo | Page |
|---|---|---|
| 1 | Guess the total (volume vs graduated) | `/demo/tiers` |
| 1 | One click, six objects | `/pricing` → `/premium/welcome` → `/admin/chain` |
| 2 | Events arriving at our server | `/admin/live` + `/premium` |
| 2 | Trial → renewal → failed card | `/admin/clock` |

---

## First-time setup

```bash
npm install
cp .env.example .env.local       # add your sandbox sk_test_ / pk_test_ keys
stripe login                     # once, for webhook forwarding
npm run seed                     # products, prices, Nusrat + the school (safe to re-run)
```

## Before each session (10 min)

1. `npm run reset && npm run seed`
2. **Terminal A:** `npm run listen` → copy the `whsec_…` it prints into `.env.local` as `STRIPE_WEBHOOK_SECRET` (it can change between runs)
3. **Terminal B:** `npm run dev`
4. **Session 2 only:** open `/admin/clock` → **Create simulation**
5. Browser tabs in order: `/demo/tiers`, `/pricing`, `/admin/chain`, `/admin/live`, `/premium`, `/admin/clock`, Stripe Dashboard
6. Zoom the browser to 125–150 %

## Running each demo

**S1 · Demo 1, `/demo/tiers`:** room votes ($72 / $102 / $120) → set 12 seats → **Reveal**. Both totals come from `invoices.createPreview`. Nothing is created.

**S1 · Demo 2, `/pricing`:** as Nusrat, click **Go Premium** → pay with `4242 4242 4242 4242` → the welcome page waits for the webhook → **See what Stripe created** opens `/admin/chain` with the six objects and the event timeline.

**S2 · Demo 1, `/admin/live`:** subscribe Nusrat (if not already) → events land, row turns `active` → `/premium` is unlocked → **Cancel now** → row flips to `canceled` → reload `/premium`: locked.

**S2 · Demo 2, `/admin/clock`:** click ① → ④ in order (each takes a few seconds):

| Step | Clock moves to | Expect |
|---|---|---|
| ① | day 11 | `trial_will_end` for Nusrat and Tanvir |
| ② | day 14 + 2h | Nusrat `active` (first invoice paid), Tanvir `paused` (no card) |
| ③ | — | Nusrat's card swapped to `4000 0000 0000 0341` (fails when charged) |
| ④ | day 44 + 2h | `invoice.payment_failed`, Nusrat `past_due` |
| ⑤ optional | +3 weeks | retries run out → `canceled` or `unpaid` (sandbox settings) |

Then **/premium as Nusrat (clock)** shows the amber "update your card" banner. **Delete simulation** → **Create simulation** for a clean rerun.

## Test cards

| Use | Card | PaymentMethod |
|---|---|---|
| Always succeeds | `4242 4242 4242 4242` | `pm_card_visa` |
| Attaches, fails when charged | `4000 0000 0000 0341` | `pm_card_chargeCustomerFail` |
| Needs 3-D Secure | `4000 0025 0000 3155` | — |

## Viewing the database

Everything the app knows is in `data/demo.db` (SQLite): `users`, `subscriptions`, `webhook_events`, `settings`.

- On screen: `/admin/live` (auto-refreshing)
- VS Code: "SQLite Viewer" extension, click the file
- GUI: DB Browser for SQLite or TablePlus (open read-only while the app runs)
- CLI: `sqlite3 data/demo.db "select * from subscriptions;"`

## How it's built

| File | What it does |
|---|---|
| `app/api/webhooks/stripe/route.ts` | Verify signature → skip duplicates → fetch latest → save status → 200 |
| `lib/access.ts` | `hasAccess(status)`: `active`, `trialing`, `past_due` |
| `lib/db.ts` | SQLite schema and queries. Ignores subscription updates older than the stored one |
| `lib/clock.ts` | Test clock simulation: create, steps ①–⑤, delete |
| `lib/catalog.ts` | Lookup keys, tiers, price lookup |
| `scripts/seed.ts` / `reset.ts` | Idempotent catalog + customers / delete clocks and wipe the DB |

Notes on the Stripe API version this SDK pins (`2026-10-28`):
- Invoice → PaymentIntent goes through **Invoice Payments** (`invoicePayments.list({ invoice })`), not `invoice.payment_intent`.
- Billing period dates live on the **Subscription Item** (`current_period_start/end`).
- The webhook only tracks the demo's own customers, so `stripe trigger` test events are stored but not shown in the feed.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Welcome page spins forever | `npm run listen` not running, or `STRIPE_WEBHOOK_SECRET` is stale: re-copy it and restart `npm run dev` |
| "No Price with lookup_key…" | Run `npm run seed` |
| Header says "No users" | Run `npm run seed` |
| Clock step says "already past this step" | Delete and recreate the simulation |
| "Refusing to start…" | `.env.local` has a live key. Use a sandbox key |
| Port 3000 already in use | Run on another port, e.g. 3100: `APP_URL=http://localhost:3100 npx next dev -p 3100` and `stripe listen --forward-to localhost:3100/api/webhooks/stripe` |
