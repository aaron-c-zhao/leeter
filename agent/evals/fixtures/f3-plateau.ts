import { seedBank, seedMemory, seedPlan, seedSession, T0, HOUR, DAY } from "../lib/seed.js";
import { bySlug, pid } from "../lib/bank.js";

export const meta = {
  name: "f3-plateau",
  description:
    "Plateau: the current plan is fully solved, no carried items, and coverage is flat (one topic group repeated). The planner must target untouched material and avoid re-posting an unchanged plan.",
};

/*
 * A finished 7-day plan whose four items were all solved, all inside
 * arrays-hashing/two-pointers. Six other curated topics have zero attempts.
 */
export async function seed(db: Parameters<typeof seedPlan>[0]): Promise<void> {
  const ids = await seedBank(db);
  const P = (slug: string) => pid(ids, slug);

  const plan = await seedPlan(db, {
    createdAt: T0 - 12 * DAY,
    horizonDays: 10,
    focus: "Arrays and hashing week: the complement map family.",
    items: [
      { lcId: bySlug("two-sum").lcId, slug: "two-sum", reason: "complement map" },
      { lcId: bySlug("group-anagrams").lcId, slug: "group-anagrams", reason: "hash map on strings" },
      { lcId: bySlug("3sum").lcId, slug: "3sum", reason: "two pointers" },
      { lcId: bySlug("two-sum-ii-input-array-is-sorted").lcId, slug: "two-sum-ii-input-array-is-sorted", reason: "sorted variant" },
    ],
  });

  // Every item solved with an Accepted session.
  const solves: Array<{ slug: string; at: number }> = [
    { slug: "two-sum", at: T0 - 11 * DAY },
    { slug: "group-anagrams", at: T0 - 9 * DAY },
    { slug: "3sum", at: T0 - 7 * DAY },
    { slug: "two-sum-ii-input-array-is-sorted", at: T0 - 5 * DAY },
  ];
  for (let i = 0; i < solves.length; i++) {
    const s = solves[i]!;
    await seedSession(db, {
      problemId: P(s.slug),
      startedAt: s.at,
      finishedAt: s.at + 40 * 60_000,
      activeMs: 35 * 60_000,
      planItemId: plan.itemIds[i]!,
      submissions: [{ verdict: "Accepted", at: s.at + 30 * 60_000 }],
    });
  }

  // Memory: a thin notebook that does not flag the plateau.
  await seedMemory(db, {
    body: "# Memory\n- Plan going well; all items solved.\n- Keep building the same ladder next week.",
    at: T0 - 4 * DAY,
  });
}
