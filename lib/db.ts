import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type Stripe from "stripe";

// SQLite file the whole demo reads from. View it with any SQLite viewer: data/demo.db
const DB_PATH = path.join(process.cwd(), "data", "demo.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  stripe_customer_id TEXT
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   TEXT PRIMARY KEY,
  stripe_customer_id   TEXT NOT NULL,
  status               TEXT NOT NULL,
  price_lookup_key     TEXT,
  trial_end            INTEGER,
  cancel_at_period_end INTEGER DEFAULT 0,
  updated_at           INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  object_id   TEXT,
  customer_id TEXT,
  created     INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  summary     TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

const g = globalThis as unknown as { __demoDb?: Database.Database; __demoDbIno?: number };

const inode = () => { try { return fs.statSync(DB_PATH).ino; } catch { return -1; } };

export function db(): Database.Database {
  // Reopen if `npm run reset` replaced the file while the server was running.
  if (g.__demoDb && inode() !== g.__demoDbIno) closeDb();
  if (g.__demoDb) return g.__demoDb;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.exec(SCHEMA);
  g.__demoDb = conn;
  g.__demoDbIno = inode();
  return conn;
}

export function closeDb() {
  try { g.__demoDb?.close(); } catch { /* already closed */ }
  g.__demoDb = undefined;
}

export const DB_FILE = DB_PATH;

/* ---------------- users ---------------- */

export type User = { id: string; name: string; email: string; stripe_customer_id: string | null };

export const getUser = (id: string) =>
  db().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;

export const listUsers = () => db().prepare("SELECT * FROM users ORDER BY id").all() as User[];

export const userByCustomer = (customerId?: string | null) =>
  customerId
    ? (db().prepare("SELECT * FROM users WHERE stripe_customer_id = ?").get(customerId) as User | undefined)
    : undefined;

export function upsertUser(u: User) {
  db().prepare(
    `INSERT INTO users (id, name, email, stripe_customer_id) VALUES (@id, @name, @email, @stripe_customer_id)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, stripe_customer_id = excluded.stripe_customer_id`
  ).run(u);
}

/* ---------------- subscriptions ---------------- */

export type SubRow = {
  id: string;
  stripe_customer_id: string;
  status: string;
  price_lookup_key: string | null;
  trial_end: number | null;
  cancel_at_period_end: number;
  updated_at: number;
};

/** Saves the latest subscription state. Ignores updates older than the one we already applied. */
export function upsertSubscription(sub: Stripe.Subscription, eventCreated: number) {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  db().prepare(
    `INSERT INTO subscriptions (id, stripe_customer_id, status, price_lookup_key, trial_end, cancel_at_period_end, updated_at)
     VALUES (@id, @customer, @status, @lookup, @trial_end, @cape, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status, price_lookup_key = excluded.price_lookup_key, trial_end = excluded.trial_end,
       cancel_at_period_end = excluded.cancel_at_period_end, updated_at = excluded.updated_at
     WHERE excluded.updated_at >= subscriptions.updated_at`
  ).run({
    id: sub.id,
    customer,
    status: sub.status,
    lookup: sub.items.data[0]?.price.lookup_key ?? null,
    trial_end: sub.trial_end,
    cape: sub.cancel_at_period_end ? 1 : 0,
    updated_at: eventCreated,
  });
}

/** The customer's most relevant subscription: one with access first, then the most recently updated. */
export function subscriptionForCustomer(customerId?: string | null) {
  if (!customerId) return undefined;
  return db().prepare(
    `SELECT * FROM subscriptions WHERE stripe_customer_id = ?
     ORDER BY CASE WHEN status IN ('active','trialing','past_due') THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`
  ).get(customerId) as SubRow | undefined;
}

export type SubWithName = SubRow & { name: string | null };

export function listSubscriptions(customerIds?: string[]) {
  const all = db().prepare(
    `SELECT s.*, u.name FROM subscriptions s JOIN users u ON u.stripe_customer_id = s.stripe_customer_id
     ORDER BY s.updated_at DESC`
  ).all() as SubWithName[];
  return customerIds ? all.filter((s) => customerIds.includes(s.stripe_customer_id)) : all;
}

/* ---------------- webhook events ---------------- */

export type EventRow = {
  id: string; type: string; object_id: string | null; customer_id: string | null;
  created: number; received_at: number; summary: string | null;
};

export const eventExists = (id: string) =>
  !!db().prepare("SELECT 1 FROM webhook_events WHERE id = ?").get(id);

export function insertEvent(e: EventRow) {
  db().prepare(
    `INSERT OR IGNORE INTO webhook_events (id, type, object_id, customer_id, created, received_at, summary)
     VALUES (@id, @type, @object_id, @customer_id, @created, @received_at, @summary)`
  ).run(e);
}

/** Events for known demo customers only (newest first). */
export function listEvents(limit = 40, customerIds?: string[]) {
  const rows = db().prepare(
    `SELECT e.* FROM webhook_events e JOIN users u ON u.stripe_customer_id = e.customer_id
     ORDER BY e.received_at DESC, e.created DESC LIMIT ?`
  ).all(limit * 4) as EventRow[];
  return (customerIds ? rows.filter((r) => r.customer_id && customerIds.includes(r.customer_id)) : rows).slice(0, limit);
}

export const eventsForCustomer = (customerId: string) =>
  db().prepare("SELECT * FROM webhook_events WHERE customer_id = ? ORDER BY created ASC, rowid ASC").all(customerId) as EventRow[];

/* ---------------- settings ---------------- */

export const getSetting = (key: string) =>
  (db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value;

export const setSetting = (key: string, value: string) =>
  db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);

export const deleteSetting = (key: string) => db().prepare("DELETE FROM settings WHERE key = ?").run(key);

/** Removes demo users and everything tied to their customers (used by the clock reset). */
export function deleteUsers(ids: string[]) {
  const d = db();
  for (const id of ids) {
    const u = getUser(id);
    if (u?.stripe_customer_id) {
      d.prepare("DELETE FROM subscriptions WHERE stripe_customer_id = ?").run(u.stripe_customer_id);
      d.prepare("DELETE FROM webhook_events WHERE customer_id = ?").run(u.stripe_customer_id);
    }
    d.prepare("DELETE FROM users WHERE id = ?").run(id);
  }
}
