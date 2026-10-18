import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPlan, getCurrentPlan, listPlans } from "../server/sessions/plans";
import { createDb } from "../server/db/client";
import { runMigrations } from "../server/db/migrate";
import { planItems, plans, problems, sessions, submissions } from "../server/db/schema";
import { eq } from "drizzle-orm";
import type Database from "better-sqlite3";

type Db = ReturnType<typeof createDb>["db"];

let db: Db;
let sqlite: Database.Database;

beforeEach(() => {
  const handle = createDb(":memory:");
  db = handle.db;
  sqlite = handle.sqlite;
  runMigrations(sqlite);
});

afterEach(() => {
  sqlite?.close();
});

async function seedProblem(db: Db, lcId: number, slug: string): Promise<void> {
  await db.insert(problems).values({
    lcId,
    title: slug,
    slug,
    difficulty: "Easy",
    tags: "[]",
    description: "",
    fetchedAt: Date.now(),
  });
}

async function seedSessionForItem(db: Db, problemId: number, planItemId: number): Promise<number> {
  const [s] = await db
    .insert(sessions)
    .values({
      problemId,
      startedAt: Date.now(),
      activeMs: 0,
      pausedAt: null,
      lastResumedAt: Date.now(),
      planItemId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning({ id: sessions.id });
  return s.id;
}

describe("plans migration", () => {
  it("creates plans and plan_items tables and a nullable indexed plan_item_id column on sessions", () => {
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>;
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(["plans", "plan_items"]));

    const cols = sqlite.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string; notnull: number }>;
    const col = cols.find((c) => c.name === "plan_item_id");
    expect(col).toBeDefined();
    expect(col?.notnull).toBe(0);

    const idx = sqlite.prepare("PRAGMA index_list(sessions)").all() as Array<{ name: string }>;
    expect(idx.map((i) => i.name)).toContain("sessions_plan_item_idx");
  });

  it("is idempotent", () => {
    expect(() => runMigrations(sqlite)).not.toThrow();
  });
});

describe("createPlan", () => {
  it("creates a plan with items and returns it", async () => {
    await seedProblem(db, 1, "two-sum");
    await seedProblem(db, 2, "add-numbers");

    const plan = await createPlan(db, {
      horizonDays: 14,
      focus: "Focus on arrays",
      notes: "extra notes",
      problems: [
        { lcId: 1, slug: "two-sum", reason: "warm-up" },
        { lcId: 2, slug: "add-numbers", reason: "linked list practice" },
      ],
    });

    expect(plan.id).toBeGreaterThan(0);
    expect(plan.horizonDays).toBe(14);
    expect(plan.focusMd).toBe("Focus on arrays");
    expect(plan.notesMd).toBe("extra notes");
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]).toMatchObject({ lcId: 1, slug: "two-sum", reasonMd: "warm-up", status: "not_started" });
    expect(plan.items[1]).toMatchObject({ lcId: 2, slug: "add-numbers", reasonMd: "linked list practice" });

    const [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.horizonDays).toBe(14);
    const items = await db.select().from(planItems).where(eq(planItems.planId, plan.id));
    expect(items).toHaveLength(2);
  });

  it("rejects non-positive horizon_days", async () => {
    await expect(createPlan(db, { horizonDays: 0, focus: "x", problems: [{ lcId: 1, slug: "s", reason: "r" }] })).rejects.toThrow(
      "horizon_days must be a positive integer",
    );
    await expect(createPlan(db, { horizonDays: 1.5, focus: "x", problems: [{ lcId: 1, slug: "s", reason: "r" }] })).rejects.toThrow(
      "horizon_days must be a positive integer",
    );
  });

  it("rejects empty focus", async () => {
    await expect(createPlan(db, { horizonDays: 7, focus: "", problems: [{ lcId: 1, slug: "s", reason: "r" }] })).rejects.toThrow(
      "focus must be a non-empty string",
    );
  });

  it("rejects plans with no problems", async () => {
    await expect(createPlan(db, { horizonDays: 7, focus: "x", problems: [] })).rejects.toThrow(
      "at least one problem is required",
    );
  });

  it("rejects unknown lc_ids listing the offending ids and stores nothing", async () => {
    await seedProblem(db, 1, "two-sum");
    await expect(
      createPlan(db, {
        horizonDays: 7,
        focus: "x",
        problems: [
          { lcId: 1, slug: "two-sum", reason: "r" },
          { lcId: 999, slug: "unknown", reason: "r" },
          { lcId: 1234, slug: "also-unknown", reason: "r" },
        ],
      }),
    ).rejects.toThrow("Unknown problem lc_ids: 999, 1234");
    const allPlans = await db.select().from(plans);
    expect(allPlans).toHaveLength(0);
  });
});

describe("listPlans and getCurrentPlan", () => {
  it("returns plans newest-first with items, and current plan is the newest or null", async () => {
    expect(await getCurrentPlan(db)).toBeNull();
    expect(await listPlans(db)).toEqual([]);

    await seedProblem(db, 1, "two-sum");
    const p1 = await createPlan(db, {
      horizonDays: 7,
      focus: "first",
      problems: [{ lcId: 1, slug: "two-sum", reason: "r1" }],
    });
    await new Promise((r) => setTimeout(r, 5));
    const p2 = await createPlan(db, {
      horizonDays: 14,
      focus: "second",
      problems: [{ lcId: 1, slug: "two-sum", reason: "r2" }],
    });

    const list = await listPlans(db);
    expect(list.map((p) => p.id)).toEqual([p2.id, p1.id]);
    expect(list[0].items[0].reasonMd).toBe("r2");

    const current = await getCurrentPlan(db);
    expect(current?.id).toBe(p2.id);
  });
});

describe("derived item status", () => {
  it("derives solved, practiced, and not_started statuses from linked sessions", async () => {
    await seedProblem(db, 1, "two-sum");
    await seedProblem(db, 2, "add-numbers");
    await seedProblem(db, 3, "three-sum");
    const plan = await createPlan(db, {
      horizonDays: 7,
      focus: "mix",
      problems: [
        { lcId: 1, slug: "two-sum", reason: "solved" },
        { lcId: 2, slug: "add-numbers", reason: "practiced" },
        { lcId: 3, slug: "three-sum", reason: "untouched" },
      ],
    });
    const [solvedItem, practicedItem] = plan.items;
    const [problem1] = await db.select().from(problems).where(eq(problems.lcId, 1));
    const [problem2] = await db.select().from(problems).where(eq(problems.lcId, 2));

    const sid = await seedSessionForItem(db, problem1.id, solvedItem.id);
    await db.insert(submissions).values({
      lcSubmissionId: 9001,
      problemId: problem1.id,
      sessionId: sid,
      lang: "python3",
      code: "x",
      verdict: "Accepted",
      statusDisplay: "Accepted",
      runtime: "0 ms",
      memory: "10 MB",
      submittedAt: Date.now(),
      syncedAt: Date.now(),
    });
    const practicedSid = await seedSessionForItem(db, problem2.id, practicedItem.id);
    await db.insert(submissions).values({
      lcSubmissionId: 9002,
      problemId: problem2.id,
      sessionId: practicedSid,
      lang: "python3",
      code: "x",
      verdict: "Wrong Answer",
      statusDisplay: "Wrong Answer",
      runtime: "0 ms",
      memory: "10 MB",
      submittedAt: Date.now(),
      syncedAt: Date.now(),
    });

    const current = await getCurrentPlan(db);
    expect(current?.items.map((i) => [i.slug, i.status])).toEqual([
      ["two-sum", "solved"],
      ["add-numbers", "practiced"],
      ["three-sum", "not_started"],
    ]);

    const list = await listPlans(db);
    expect(list[0].items.map((i) => i.status)).toEqual(["solved", "practiced", "not_started"]);
  });

  it("marks an item solved when a retry session is Accepted even if the first attempt was not", async () => {
    await seedProblem(db, 1, "two-sum");
    const plan = await createPlan(db, {
      horizonDays: 7,
      focus: "retry",
      problems: [{ lcId: 1, slug: "two-sum", reason: "retry" }],
    });
    const [item] = plan.items;
    const [problem1] = await db.select().from(problems).where(eq(problems.lcId, 1));

    const first = await seedSessionForItem(db, problem1.id, item.id);
    const retry = await seedSessionForItem(db, problem1.id, item.id);
    await db.insert(submissions).values({
      lcSubmissionId: 9101,
      problemId: problem1.id,
      sessionId: first,
      lang: "python3",
      code: "x",
      verdict: "Wrong Answer",
      statusDisplay: "Wrong Answer",
      runtime: "0 ms",
      memory: "10 MB",
      submittedAt: Date.now(),
      syncedAt: Date.now(),
    });

    const afterFirst = await getCurrentPlan(db);
    expect(afterFirst?.items[0].status).toBe("practiced");

    await db.insert(submissions).values({
      lcSubmissionId: 9102,
      problemId: problem1.id,
      sessionId: retry,
      lang: "python3",
      code: "x",
      verdict: "Accepted",
      statusDisplay: "Accepted",
      runtime: "0 ms",
      memory: "10 MB",
      submittedAt: Date.now(),
      syncedAt: Date.now(),
    });

    const afterRetry = await getCurrentPlan(db);
    expect(afterRetry?.items[0].status).toBe("solved");
  });
});

describe("plan chaining (1.2)", () => {
  it("stores based_on and carried_from and echoes them in create + list", async () => {
    await seedProblem(db, 1, "two-sum");
    await seedProblem(db, 2, "three-sum");

    const first = await createPlan(db, {
      horizonDays: 7,
      focus: "week one",
      problems: [{ lcId: 1, slug: "two-sum", reason: "start" }],
    });

    const second = await createPlan(db, {
      horizonDays: 7,
      focus: "week two",
      basedOn: first.id,
      problems: [{ lcId: 2, slug: "three-sum", reason: "continue", carriedFrom: first.items[0]!.id }],
    });

    expect(second.basedOn).toBe(first.id);
    expect(second.items[0]!.carriedFrom).toBe(first.items[0]!.id);

    const listed = await listPlans(db);
    expect(listed[0]!.basedOn).toBe(first.id);
    expect(listed[0]!.items[0]!.carriedFrom).toBe(first.items[0]!.id);
    expect(listed[1]!.basedOn).toBeNull();
  });

  it("rejects unknown based_on and carried_from references without storing", async () => {
    await seedProblem(db, 1, "two-sum");
    await expect(
      createPlan(db, {
        horizonDays: 7,
        focus: "x",
        basedOn: 999,
        problems: [{ lcId: 1, slug: "two-sum", reason: "r" }],
      }),
    ).rejects.toThrow(/Unknown based_on plan id: 999/);
    await expect(
      createPlan(db, {
        horizonDays: 7,
        focus: "x",
        problems: [{ lcId: 1, slug: "two-sum", reason: "r", carriedFrom: 4242 }],
      }),
    ).rejects.toThrow(/Unknown carried_from plan item ids: 4242/);

    const listed = await listPlans(db);
    expect(listed).toHaveLength(0);
  });

  it("still stores plans without any chaining fields", async () => {
    await seedProblem(db, 1, "two-sum");
    const plan = await createPlan(db, {
      horizonDays: 3,
      focus: "plain",
      problems: [{ lcId: 1, slug: "two-sum", reason: "r" }],
    });
    expect(plan.basedOn).toBeNull();
    expect(plan.items[0]!.carriedFrom).toBeNull();
  });
});
