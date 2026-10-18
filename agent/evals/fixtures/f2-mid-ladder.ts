import { seedBank, seedMemory, seedPlan, seedSession, T0, HOUR, DAY } from "../lib/seed.js";
import { bySlug, pid } from "../lib/bank.js";

export const meta = {
  name: "f2-mid-ladder",
  description:
    "Mid-ladder revision: a carried unsolved item (based_on + carried_from chaining), a weak topic at 33% solve rate, and a partially worked plan.",
};

/*
 * Plan 1 (done) -> plan 2 (current, based_on 1): item two-sum solved, item
 * three-sum carried from plan 1 and practiced without success (appears in
 * carried_unsolved), dynamic-programming weak (1 of 3 accepted).
 */
export async function seed(db: Parameters<typeof seedPlan>[0]): Promise<void> {
  const ids = await seedBank(db);
  const P = (slug: string) => pid(ids, slug);

  const plan1 = await seedPlan(db, {
    createdAt: T0 - 14 * DAY,
    horizonDays: 7,
    focus: "Warm-up week: hash maps and two pointers.",
    items: [
      { lcId: bySlug("two-sum").lcId, slug: "two-sum", reason: "start of the ladder" },
      { lcId: bySlug("3sum").lcId, slug: "3sum", reason: "two pointers step" },
      { lcId: bySlug("valid-parentheses").lcId, slug: "valid-parentheses", reason: "stack warm-up" },
    ],
  });

  const plan2 = await seedPlan(db, {
    createdAt: T0 - 2 * DAY,
    horizonDays: 10,
    focus: "Two pointers week, carrying Three Sum forward.",
    basedOn: plan1.planId,
    items: [
      {
        lcId: bySlug("3sum").lcId,
        slug: "3sum",
        reason: "continue from last week",
        carriedFrom: plan1.itemIds[1]!,
      },
      { lcId: bySlug("coin-change").lcId, slug: "coin-change", reason: "new topic" },
    ],
  });

  // Plan 1 item: solved via an Accepted session.
  await seedSession(db, {
    problemId: P("two-sum"),
    startedAt: T0 - 13 * DAY,
    finishedAt: T0 - 13 * DAY + HOUR,
    activeMs: HOUR,
    planItemId: plan1.itemIds[0]!,
    submissions: [{ verdict: "Accepted", at: T0 - 13 * DAY + HOUR }],
  });
  // Plan 1 item 3: practiced, no accept.
  await seedSession(db, {
    problemId: P("valid-parentheses"),
    startedAt: T0 - 12 * DAY,
    finishedAt: T0 - 12 * DAY + 40 * 60_000,
    activeMs: 40 * 60_000,
    planItemId: plan1.itemIds[2]!,
  });

  // Carried plan-2 item practiced but unsolved (Wrong Answer).
  await seedSession(db, {
    problemId: P("3sum"),
    startedAt: T0 - DAY,
    finishedAt: T0 - DAY + 50 * 60_000,
    activeMs: 50 * 60_000,
    planItemId: plan2.itemIds[0]!,
    submissions: [{ verdict: "Wrong Answer", at: T0 - DAY + 40 * 60_000 }],
  });

  // Weak dynamic-programming topic: one accepted, two not.
  await seedSession(db, {
    problemId: P("climbing-stairs"),
    startedAt: T0 - 10 * DAY,
    finishedAt: T0 - 10 * DAY + 30 * 60_000,
    activeMs: 30 * 60_000,
    submissions: [{ verdict: "Accepted", at: T0 - 10 * DAY + 20 * 60_000 }],
  });
  await seedSession(db, {
    problemId: P("house-robber"),
    startedAt: T0 - 9 * DAY,
    finishedAt: T0 - 9 * DAY + 45 * 60_000,
    activeMs: 40 * 60_000,
    submissions: [{ verdict: "Wrong Answer", at: T0 - 9 * DAY + 40 * 60_000 }],
  });
  await seedSession(db, {
    problemId: P("coin-change"),
    startedAt: T0 - 3 * DAY,
    finishedAt: T0 - 3 * DAY + HOUR,
    activeMs: 55 * 60_000,
    submissions: [{ verdict: "Time Limit Exceeded", at: T0 - 3 * DAY + 50 * 60_000 }],
  });

  // Memory from the previous run: notes the DP weakness and the carry.
  await seedMemory(db, {
    body:
      "# Memory\n- Carried Three Sum from plan 1 into plan 2; user practiced it once, Wrong Answer on the sort-based approach.\n- dynamic-programming looks weak (1 accepted of 3 attempts); watch whether Coin Change improves.\n- User asked for medium-difficulty steps, not easy repeats.",
    at: T0 - 2 * DAY,
  });
}
