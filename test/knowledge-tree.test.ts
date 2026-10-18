import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRoadmapTree } from "../server/knowledge/tree";
import { TAXONOMY_VERSION } from "../server/knowledge/taxonomy";
import { createPlan } from "../server/sessions/plans";
import { startSession, finishSession } from "../server/sessions/service";
import { createDb } from "../server/db/client";
import { runMigrations } from "../server/db/migrate";
import { problems, submissions } from "../server/db/schema";

const HOUR = 3_600_000;

// Epoch whose UTC date is 2026-09-10.
const T0 = Date.UTC(2026, 8, 10, 12, 0, 0);

let db: ReturnType<typeof createDb>["db"];
let sqlite: ReturnType<typeof createDb>["sqlite"];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  const handle = createDb(":memory:");
  db = handle.db;
  sqlite = handle.sqlite;
  runMigrations(sqlite);
});

afterEach(() => {
  sqlite?.close();
  vi.useRealTimers();
});

async function seedProblem(lcId: number, slug: string, tags: string[], difficulty = "Easy") {
  const [p] = await db
    .insert(problems)
    .values({ lcId, title: slug, slug, difficulty, tags: JSON.stringify(tags), description: "", fetchedAt: T0 })
    .returning({ id: problems.id });
  return p.id;
}

async function practice(problemId: number, at: number, verdict?: string) {
  vi.setSystemTime(at);
  const sessionId = await startSession(db, problemId);
  vi.setSystemTime(at + HOUR);
  await finishSession(db, sessionId);
  if (verdict) {
    await db.insert(submissions).values({
      lcSubmissionId: sessionId * 100,
      problemId,
      sessionId,
      lang: "python3",
      code: "x",
      verdict,
      statusDisplay: verdict,
      runtime: null,
      memory: null,
      submittedAt: at + HOUR,
      syncedAt: at + HOUR,
    });
  }
  return sessionId;
}

describe("roadmap tree service (2.1)", () => {
  it("returns the full taxonomy with zeroed mastery and no frontier when nothing exists", async () => {
    const tree = await getRoadmapTree(db);
    expect(tree.taxonomyVersion).toBe(TAXONOMY_VERSION);
    expect(tree.domains.map((d) => d.id)).toEqual(["data-structures", "algorithms", "other"]);
    const allTopics = tree.domains.flatMap((d) => d.topics);
    expect(allTopics.length).toBeGreaterThanOrEqual(15);
    for (const t of allTopics) {
      expect(t).toEqual({
        id: t.id,
        label: t.label,
        attempts: 0,
        solved: 0,
        solveRate: 0,
        lastPracticedAt: null,
        frontier: [],
        recent: [],
      });
    }
  });

  it("enriches practiced nodes with mastery aggregates in roadmap order", async () => {
    const twoSum = await seedProblem(1, "two-sum", ["array", "hash-table"]);
    const threeSum = await seedProblem(15, "three-sum", ["array", "two-pointers"]);
    const wa = await seedProblem(16, "wa-only", ["array"]);
    await practice(twoSum, T0); // no submission -> attempt only
    await practice(threeSum, T0 + 3 * HOUR, "Accepted");
    await practice(wa, T0 + 4 * HOUR, "Wrong Answer"); // attempt, not solved

    const tree = await getRoadmapTree(db);
    const arrays = tree.domains[0]!.topics.find((t) => t.id === "arrays-hashing")!;
    expect(arrays.attempts).toBe(3);
    expect(arrays.solved).toBe(1);
    expect(arrays.solveRate).toBe(Math.round((1 / 3) * 100) / 100);
    expect(arrays.lastPracticedAt).toBe(T0 + 4 * HOUR);
    // three-sum spans two nodes and counts in each.
    const pointers = tree.domains[0]!.topics.find((t) => t.id === "two-pointers")!;
    expect(pointers.attempts).toBe(1);
    expect(pointers.solved).toBe(1);
    // Untouched nodes stay zeroed.
    const untouched = tree.domains[0]!.topics.find((t) => t.id === "sliding-window")!;
    expect(untouched.attempts).toBe(0);
    expect(untouched.lastPracticedAt).toBeNull();
  });

  it("maps current-plan items to nodes by tags across nodes and flags carried items", async () => {
    const twoSum = await seedProblem(1, "two-sum", ["array", "hash-table"]);
    const threeSum = await seedProblem(15, "three-sum", ["array", "two-pointers"], "Medium");

    const first = await createPlan(db, {
      horizonDays: 7,
      focus: "week one",
      problems: [{ lcId: 1, slug: "two-sum", reason: "r" }],
    });
    const second = await createPlan(db, {
      horizonDays: 7,
      focus: "week two",
      basedOn: first.id,
      problems: [{ lcId: 15, slug: "three-sum", reason: "continue", carriedFrom: first.items[0]!.id }],
    });

    const tree = await getRoadmapTree(db);
    // A plan item maps to every node its tags reach (three-sum -> both
    // arrays-hashing and two-pointers), even with zero practice.
    const arrays = tree.domains[0]!.topics.find((t) => t.id === "arrays-hashing")!;
    expect(arrays.frontier.map((f) => f.slug)).toEqual(["three-sum"]);
    expect(arrays.frontier[0]!.carriedFrom).toBe(first.items[0]!.id);
    const pointers = tree.domains[0]!.topics.find((t) => t.id === "two-pointers")!;
    expect(pointers.frontier).toEqual([
      {
        itemId: second.items[0]!.id,
        problemId: threeSum,
        title: "three-sum",
        slug: "three-sum",
        difficulty: "Medium",
        status: "not_started",
        carriedFrom: first.items[0]!.id,
      },
    ]);
    // Node with neither practice nor frontier stays empty.
    const untouched = tree.domains[0]!.topics.find((t) => t.id === "tries")!;
    expect(untouched.frontier).toEqual([]);
  });

  it("only maps frontier items from the current plan", async () => {
    const p1 = await seedProblem(1, "two-sum", ["array"]);
    const p2 = await seedProblem(15, "three-sum", ["array"]);
    await createPlan(db, {
      horizonDays: 7,
      focus: "stale",
      problems: [{ lcId: 1, slug: "two-sum", reason: "old" }],
    });
    await createPlan(db, {
      horizonDays: 7,
      focus: "current",
      basedOn: 1,
      problems: [{ lcId: 15, slug: "three-sum", reason: "new" }],
    });

    const tree = await getRoadmapTree(db);
    const arrays = tree.domains[0]!.topics.find((t) => t.id === "arrays-hashing")!;
    expect(arrays.frontier.map((f) => f.slug)).toEqual(["three-sum"]);
    expect(arrays.frontier[0]!.carriedFrom).toBeNull();
  });

  it("lists practiced problems newest-first in the drill-down with outcome and session links", async () => {
    const twoSum = await seedProblem(1, "two-sum", ["array"]);
    const threeSum = await seedProblem(15, "three-sum", ["array"], "Medium");
    const older = await practice(twoSum, T0, "Wrong Answer");
    const newer = await practice(threeSum, T0 + DAY(), "Accepted");

    const tree = await getRoadmapTree(db);
    const arrays = tree.domains[0]!.topics.find((t) => t.id === "arrays-hashing")!;
    expect(arrays.recent.map((r) => r.sessionId)).toEqual([newer, older]);
    expect(arrays.recent[0]).toMatchObject({
      sessionId: newer,
      title: "three-sum",
      difficulty: "Medium",
      outcome: "Accepted",
    });
    expect(arrays.recent[1]).toMatchObject({ outcome: "Wrong Answer" });
    // Unpracticed node has an empty drill-down (no error on expand).
    const tries = tree.domains[0]!.topics.find((t) => t.id === "tries")!;
    expect(tries.recent).toEqual([]);
  });

  it("caps the drill-down at 10 problems per node", async () => {
    for (let i = 1; i <= 12; i++) {
      const id = await seedProblem(1000 + i, `p-${i}`, ["array"]);
      await practice(id, T0 + i * HOUR);
    }
    const tree = await getRoadmapTree(db);
    const arrays = tree.domains[0]!.topics.find((t) => t.id === "arrays-hashing")!;
    expect(arrays.recent).toHaveLength(10);
    // Newest first: the last-seeded practice is the head.
    expect(arrays.recent[0]!.title).toBe("p-12");
  });
});

function DAY(): number {
  return 86_400_000;
}
