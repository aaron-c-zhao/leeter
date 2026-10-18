import { seedBank, seedMemory, seedPlan, seedSession, T0, HOUR, DAY } from "../lib/seed.js";
import { bySlug, pid } from "../lib/bank.js";

export const meta = {
  name: "f4-stale-memory",
  description:
    "Stale memory: the notebook claims an open thread (a paused session) and a DP weakness that the ground truth shows resolved. The planner must reconcile memory with the digest, not copy it.",
};

/*
 * Ground truth: the previous plan is fully solved, no paused sessions exist,
 * dynamic-programming has a 100% solve rate (two accepted). Memory claims
 * the opposite on both counts.
 */
export async function seed(db: Parameters<typeof seedPlan>[0]): Promise<void> {
  const ids = await seedBank(db);
  const P = (slug: string) => pid(ids, slug);

  const plan = await seedPlan(db, {
    createdAt: T0 - 10 * DAY,
    horizonDays: 8,
    focus: "Dynamic programming week.",
    items: [
      { lcId: bySlug("climbing-stairs").lcId, slug: "climbing-stairs", reason: "DP entry point" },
      { lcId: bySlug("house-robber").lcId, slug: "house-robber", reason: "1-D DP" },
    ],
  });

  // Both items solved — the claimed weaknesses are gone in reality.
  await seedSession(db, {
    problemId: P("climbing-stairs"),
    startedAt: T0 - 9 * DAY,
    finishedAt: T0 - 9 * DAY + 30 * 60_000,
    activeMs: 25 * 60_000,
    planItemId: plan.itemIds[0]!,
    submissions: [{ verdict: "Accepted", at: T0 - 9 * DAY + 25 * 60_000 }],
  });
  await seedSession(db, {
    problemId: P("house-robber"),
    startedAt: T0 - 7 * DAY,
    finishedAt: T0 - 7 * DAY + 35 * 60_000,
    activeMs: 30 * 60_000,
    planItemId: plan.itemIds[1]!,
    submissions: [{ verdict: "Accepted", at: T0 - 7 * DAY + 30 * 60_000 }],
  });

  // No paused sessions exist — yet the memory claims one is open.
  await seedMemory(db, {
    body:
      "# Memory\n- Open thread: the Three Sum session is paused mid-draft — resume it first.\n- dynamic-programming still weak; keep the ladder there.\n- User prefers one problem per day.",
    at: T0 - 2 * DAY,
  });
}
