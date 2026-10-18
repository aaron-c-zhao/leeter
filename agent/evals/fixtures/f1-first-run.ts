import { seedBank, seedPlan, seedSession, T0, HOUR, DAY } from "../lib/seed.js";
import { bySlug, pid } from "../lib/bank.js";

export const meta = {
  name: "f1-first-run",
  description:
    "First planning run after an ad-hoc plan: one prior plan, NO memory notebook, a paused session outside the plan graph, Easy-heavy history, two completed reviews with coaching signals.",
};

/*
 * Replica of the real instance state as of 2026-09-20 (data/leeter.db):
 * five mostly-two-sum Easy sessions, one paused longest-substring session
 * with planItemId null, a 14-day plan whose focus references that paused
 * session, and two completed reviews ("leave key-insight notes", "submit on
 * leetcode and re-sync").
 */
export async function seed(db: Parameters<typeof seedPlan>[0]): Promise<void> {
  const ids = await seedBank(db);
  const P = (slug: string) => pid(ids, slug);

  // Prior plan: the ad-hoc ladder the planner must revise.
  const { itemIds } = await seedPlan(db, {
    createdAt: T0 - DAY,
    horizonDays: 14,
    focus:
      "Two weeks on the hash-map -> two-pointers -> sliding-window ladder. Two Sum is already solved optimally (one-pass complement map); the next step is the same idea under different constraints (sorted array, k-sum, windowed uniqueness) plus finishing the paused Longest Substring session.",
    items: [
      { lcId: bySlug("two-sum-ii-input-array-is-sorted").lcId, slug: "two-sum-ii-input-array-is-sorted", reason: "same complement idea on a sorted array" },
      { lcId: bySlug("longest-substring-without-repeating-characters").lcId, slug: "longest-substring-without-repeating-characters", reason: "finish the paused session" },
      { lcId: bySlug("3sum").lcId, slug: "3sum", reason: "k-sum generalization" },
      { lcId: bySlug("group-anagrams").lcId, slug: "group-anagrams", reason: "hash-map pattern on strings" },
      { lcId: bySlug("two-sum-iv-input-is-a-bst").lcId, slug: "two-sum-iv-input-is-a-bst", reason: "two pointers on a BST" },
    ],
  });

  // History: five Easy two-sum attempts, one Accepted.
  const twoSum = P("two-sum");
  await seedSession(db, {
    problemId: twoSum,
    startedAt: T0 - 6 * DAY,
    finishedAt: T0 - 6 * DAY + 2 * HOUR,
    activeMs: 1.2 * HOUR,
    submissions: [{ verdict: "Accepted", at: T0 - 6 * DAY + HOUR }],
    review: {
      overall: "good",
      recommendedFocus:
        "1) Always leave at least one note capturing the key insight (complement keyed map); 2) compare draft snapshots before submitting.",
    },
  });
  await seedSession(db, { problemId: twoSum, startedAt: T0 - 5 * DAY, finishedAt: T0 - 5 * DAY + HOUR, activeMs: HOUR });

  // Paused session outside the plan graph — invisible to carried_unsolved.
  const longest = P("longest-substring-without-repeating-characters");
  await seedSession(db, {
    problemId: longest,
    startedAt: T0 - 4 * DAY,
    pausedAt: T0 - 4 * DAY + 40 * 60_000,
    activeMs: 40 * 60_000,
  });

  // Abandoned finished attempts (no submissions).
  await seedSession(db, { problemId: twoSum, startedAt: T0 - 3 * DAY, finishedAt: T0 - 3 * DAY + 30 * 60_000, activeMs: 25 * 60_000 });
  await seedSession(db, { problemId: twoSum, startedAt: T0 - 2 * DAY, finishedAt: T0 - 2 * DAY + 40 * 60_000, activeMs: 30 * 60_000 });
  await seedSession(db, { problemId: twoSum, startedAt: T0 - DAY, finishedAt: T0 - DAY + 20 * 60_000, activeMs: 15 * 60_000 });

  // A second reviewed session with the "re-sync" coaching signal.
  await seedSession(db, {
    problemId: twoSum,
    startedAt: T0 - 2 * DAY + HOUR,
    finishedAt: T0 - 2 * DAY + HOUR,
    activeMs: 45 * 60_000,
    review: {
      overall: "good",
      recommendedFocus: "submit on leetcode.com and re-sync so verdicts land in the log",
    },
  });

  // Plan item 1 started (two-sum-ii), still open.
  await seedSession(db, {
    problemId: P("two-sum-ii-input-array-is-sorted"),
    startedAt: T0 - 12 * HOUR,
    planItemId: itemIds[0]!,
  });
}
