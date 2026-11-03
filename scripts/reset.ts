/**
 * npm run reset
 * Deletes every "10MS demo" test clock (and with it, its customers and subscriptions),
 * then wipes data/demo.db. Run `npm run seed` afterwards.
 */
import fs from "node:fs";
import { stripe } from "../lib/stripe";
import { DB_FILE, closeDb } from "../lib/db";
import { CLOCK_NAME } from "../lib/clock";

async function main() {
  const s = stripe();
  for await (const clock of s.testHelpers.testClocks.list({ limit: 100 })) {
    if (clock.name === CLOCK_NAME) {
      await s.testHelpers.testClocks.del(clock.id);
      console.log(`  - deleted test clock ${clock.id}`);
    }
  }
  closeDb();
  for (const f of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) fs.rmSync(f, { force: true });
  console.log("  - wiped data/demo.db");
  console.log("Done. Now run: npm run seed");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
