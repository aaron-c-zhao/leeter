import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { listPlans } from "../../../server/sessions/plans.js";
import { createDb } from "../../../server/db/client.js";
import { runMigrations } from "../../../server/db/migrate.js";

/*
 * Scripted checks (rubric dimensions 1, 3, 6, 9 — the parts a deterministic
 * oracle can verify). Reads groundtruth.json + captured.json and the scratch
 * db, writes checks.json.
 *
 *   tsx agent/evals/lib/checks.ts <fixture-name> <workdir>
 *
 * Structural validity note: the server itself is the schema oracle — a plan
 * that exists in the db passed validation. These checks therefore verify the
 * accepted plan's references, coverage, bounds, hygiene, and diff signals
 * that the server does NOT enforce.
 */

interface Check {
  name: string;
  /** Rubric dimension this check feeds (1, 3, 6 or 9); undefined = precondition. */
  dimension?: 1 | 3 | 6 | 9;
  pass: boolean;
  detail: string;
}

const [fixtureName, workdir] = process.argv.slice(2);
if (!fixtureName || !workdir) {
  console.error("usage: tsx agent/evals/lib/checks.ts <fixture-name> <workdir>");
  process.exit(1);
}

const groundtruth = JSON.parse(readFileSync(path.join(workdir, "groundtruth.json"), "utf8"));
const captured = JSON.parse(readFileSync(path.join(workdir, "captured.json"), "utf8"));
const { sqlite, db } = createDb(path.join(workdir, "leeter.db"));
runMigrations(sqlite);

const plans = await listPlans(db);
const previous = plans.length > 1 ? plans[1]! : null; // plans[0] is the new plan; plans[1] is the one being revised
const newest = plans[0]!;
const gtPlan = groundtruth.plans[0] ?? null;
const checks: Check[] = [];

function record(name: string, pass: boolean, detail: string, dimension?: Check["dimension"]): void {
  checks.push({ name, dimension, pass, detail });
}

// Precondition: the planner actually posted a plan.
record("plan_posted", plans.length > (groundtruth.plans?.length ?? 0), `plans: ${groundtruth.plans?.length ?? 0} -> ${plans.length}`);

const posted = plans.length > (groundtruth.plans?.length ?? 0) ? newest : null;
if (posted) {
  const bankLcIds = new Set(groundtruth.bank.map((b: { lcId: number }) => b.lcId));
  const badLcIds = posted.items.map((i: { lcId: number }) => i.lcId).filter((id: number) => !bankLcIds.has(id));
  record("bank_lc_ids", badLcIds.length === 0, badLcIds.length === 0 ? "all lc_ids exist in the bank" : `unknown lc_ids: ${badLcIds.join(", ")}`, 1);

  const expectedBasedOn = gtPlan?.id ?? null;
  record(
    "based_on_chained",
    previous ? posted.basedOn === previous.id : posted.basedOn === null,
    `based_on=${posted.basedOn}, previous plan=${previous?.id ?? "none"}`,
    1,
  );

  const previousItemIds = new Set((previous?.items ?? []).map((i: { id: number }) => i.id));
  const badCarry = posted.items.map((i: { carriedFrom: number | null }) => i.carriedFrom).filter((cf: number | null) => cf !== null && !previousItemIds.has(cf));
  record("carried_from_valid", badCarry.length === 0, badCarry.length === 0 ? "all carried_from target previous items" : `dangling carried_from: ${badCarry.join(", ")}`, 1);

  // Ladder coverage: every digest carried_unsolved item is carried, or its
  // slug is addressed in memory (resolved with a reason).
  const carriedUnsolved: Array<{ item_id: number; slug: string }> = groundtruth.digest?.current_plan?.carried_unsolved ?? [];
  const memoryText = (captured.currentMemoryAfter ?? "") + posted.focus + (posted.notes ?? "");
  const uncovered = carriedUnsolved.filter(
    (c) => !posted.items.some((i: { carriedFrom: number | null }) => i.carriedFrom === c.item_id) && !memoryText.includes(c.slug),
  );
  record("carried_unsolved_addressed", uncovered.length === 0, uncovered.length === 0 ? `${carriedUnsolved.length} carried item(s) carried or resolved` : `unaddressed carried items: ${uncovered.map((c) => c.slug).join(", ")}`, 3);

  record(
    "horizon_item_bounds",
    posted.items.length >= 1 && posted.items.length <= Math.max(1, posted.horizonDays * 2),
    `${posted.items.length} items for a ${posted.horizonDays}-day horizon`,
    1,
  );

  const narrationRe = /\b(i checked|i read|adherence|digest shows|history used|re-?checked)\b/i;
  const narrated = [posted.focus, posted.notes ?? ""].filter((t: string) => narrationRe.test(t));
  record("focus_notes_hygiene", narrated.length === 0, narrated.length === 0 ? "no process narration in focus/notes" : `narration heuristic flagged ${narrated.length} field(s)`, 6);

  if (previous) {
    const prevSet = new Set(previous.items.map((i: { lcId: number }) => i.lcId));
    const newSet = new Set(posted.items.map((i: { lcId: number }) => i.lcId));
    const same = prevSet.size === newSet.size && [...prevSet].every((id) => newSet.has(id));
    record("not_a_noop", !same, same ? "item set identical to the previous plan" : "item set differs from the previous plan", 9);
  }
} else {
  record("plan_posted_valid", false, "no new plan was stored — either the planner never POSTed or every POST was rejected");
}

record("memory_updated", (captured.memoryVersionsAfter?.length ?? 0) > (groundtruth.memoryVersions?.length ?? 0), `memory versions: ${groundtruth.memoryVersions?.length ?? 0} -> ${captured.memoryVersionsAfter?.length ?? 0}`, 8);

const passed = checks.filter((c) => c.pass).length;
const out = {
  fixture: fixtureName,
  checks,
  passed,
  total: checks.length,
};
writeFileSync(path.join(workdir, "checks.json"), JSON.stringify(out, null, 1));
console.log(`checks: ${passed}/${checks.length} passed`);
sqlite.close();
