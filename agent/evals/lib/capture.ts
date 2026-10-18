import { writeFileSync } from "node:fs";
import path from "node:path";
import { createDb } from "../../../server/db/client.js";
import { runMigrations } from "../../../server/db/migrate.js";
import { listPlans } from "../../../server/sessions/plans.js";
import { getMemory, listMemoryVersions } from "../../../server/memory/memory.js";

/*
 * Capture what the planner did, from the scratch instance's own database:
 * every plan POST is an appended plan, every memory PUT is a new immutable
 * version. Nothing the planner did is ever overwritten, so reading the db
 * after the run is a complete record.
 *
 *   tsx agent/evals/lib/capture.ts <fixture-name> <workdir>
 *
 * Writes <workdir>/captured.json: plansAfter (newest first, with derived
 * statuses), memoryVersionsAfter, currentMemoryAfter.
 */

const fixtureName = process.argv[2];
const workdir = process.argv[3];
if (!fixtureName || !workdir) {
  console.error("usage: tsx agent/evals/lib/capture.ts <fixture-name> <workdir>");
  process.exit(1);
}

const dbPath = path.join(workdir, "leeter.db");
const { sqlite, db } = createDb(dbPath);
runMigrations(sqlite); // idempotent on an existing db

const plans = await listPlans(db);
const memory = await getMemory(db);
const versions = await listMemoryVersions(db);

const captured = {
  fixture: fixtureName,
  plansAfter: plans.map((p) => ({
    id: p.id,
    createdAt: p.createdAt,
    horizonDays: p.horizonDays,
    basedOn: p.basedOn,
    focus: p.focusMd,
    notes: p.notesMd,
    items: p.items.map((i) => ({
      id: i.id,
      lcId: i.lcId,
      slug: i.slug,
      reason: i.reasonMd,
      status: i.status,
      carriedFrom: i.carriedFrom,
    })),
  })),
  memoryVersionsAfter: versions.map((v) => ({ body: v.body, createdAt: v.createdAt, size: v.size })),
  currentMemoryAfter: memory?.body ?? null,
};

writeFileSync(path.join(workdir, "captured.json"), JSON.stringify(captured, null, 1));
console.log(`captured: ${plans.length} plans total, ${versions.length} memory versions`);
sqlite.close();
