import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboard, startSession, finishSession, pauseSession } from "../server/sessions/service";
import { createPlan } from "../server/sessions/plans";
import { createDb } from "../server/db/client";
import { runMigrations } from "../server/db/migrate";
import { problems, sessions, submissions } from "../server/db/schema";
import { eq } from "drizzle-orm";
import type Database from "better-sqlite3";

const DAY = 86_400_000;
const HOUR = 3_600_000;

let db: ReturnType<typeof createDb>["db"];
let sqlite: Database.Database;

beforeEach(() => {
  const handle = createDb(":memory:");
  db = handle.db;
  sqlite = handle.sqlite;
  runMigrations(sqlite);
});

afterEach(() => {
  vi.useRealTimers();
  sqlite?.close();
});

// Epoch whose UTC date is 2026-09-10 (matches "today" in the env).
const T0 = Date.UTC(2026, 8, 10, 12, 0, 0);

async function seedProblem(slug: string, tags: string[]): Promise<number> {
  const [p] = await db
    .insert(problems)
    .values({
      lcId: Math.floor(Math.random() * 2 ** 31),
      title: slug,
      slug,
      difficulty: "Easy",
      tags: JSON.stringify(tags),
      description: "",
      fetchedAt: T0,
    })
    .returning({ id: problems.id });
  return p.id;
}

describe("dashboard aggregates", () => {
  it("computes attempts/solved per day, time spent, and topic distribution from sessions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    // Day 1: two sessions, one solved.
    vi.setSystemTime(T0);
    const p1 = await seedProblem("two-sum", ["array", "hash-table"]);
    const p2 = await seedProblem("add-numbers", ["linked-list"]);

    const s1 = await startSession(db, p1);
    vi.setSystemTime(T0 + HOUR);
    await finishSession(db, s1); // activeMs = 1h

    const s2 = await startSession(db, p2);
    vi.setSystemTime(T0 + HOUR + 30 * 60_000);
    await finishSession(db, s2); // 30min, not solved

    // Day 2: one session, solved via submission verdict.
    vi.setSystemTime(T0 + DAY);
    const s3 = await startSession(db, p1);
    vi.setSystemTime(T0 + DAY + 2 * HOUR);
    await finishSession(db, s3);
    await db.insert(submissions).values({
      lcSubmissionId: 5001,
      problemId: p1,
      sessionId: s3,
      lang: "python3",
      code: "x",
      verdict: "Accepted",
      statusDisplay: "Accepted",
      runtime: "0 ms",
      memory: "10 MB",
      submittedAt: T0 + DAY + HOUR,
      syncedAt: T0 + DAY + 2 * HOUR,
    });

    const d = await getDashboard(db);
    expect(d.totals.sessions).toBe(3);
    expect(d.totals.solved).toBe(1);
    expect(d.totals.activeMs).toBe(1.5 * HOUR + 2 * HOUR);

    const day1 = d.daily.find((x) => x.date === "2026-09-10");
    const day2 = d.daily.find((x) => x.date === "2026-09-11");
    expect(day1).toEqual({ date: "2026-09-10", attempts: 2, solved: 0, activeMs: 1.5 * HOUR });
    expect(day2).toEqual({ date: "2026-09-11", attempts: 1, solved: 1, activeMs: 2 * HOUR });

    const arrays = d.topics.find((t) => t.topic === "arrays-hashing");
    expect(arrays).toEqual({ topic: "arrays-hashing", label: "Arrays & Hashing", attempts: 2, solved: 1 });
    const linkedList = d.topics.find((t) => t.topic === "linked-list");
    expect(linkedList).toEqual({ topic: "linked-list", label: "Linked List", attempts: 1, solved: 0 });
    // A problem spanning two nodes counts once per node.
    expect(d.topics.find((t) => t.topic === "two-pointers")).toBeUndefined();
  });

  it("empty state returns zeros", async () => {
    const d = await getDashboard(db);
    expect(d.totals).toEqual({ sessions: 0, solved: 0, activeMs: 0 });
    expect(d.daily).toEqual([]);
    expect(d.topics).toEqual([]);
  });

  it("counts a Wrong-Answer-only session as an attempt but not solved", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    const p = await seedProblem("two-sum", ["array"]);
    const s = await startSession(db, p);
    vi.setSystemTime(T0 + HOUR);
    await finishSession(db, s);
    await db.insert(submissions).values({
      lcSubmissionId: 5002,
      problemId: p,
      sessionId: s,
      lang: "python3",
      code: "x",
      verdict: "Wrong Answer",
      statusDisplay: "Wrong Answer",
      runtime: null,
      memory: null,
      submittedAt: T0 + HOUR,
      syncedAt: T0 + HOUR,
    });

    const d = await getDashboard(db);
    expect(d.totals).toEqual({ sessions: 1, solved: 0, activeMs: HOUR });
    expect(d.topics).toEqual([{ topic: "arrays-hashing", label: "Arrays & Hashing", attempts: 1, solved: 0 }]);
  });
});

describe("dashboard plan payload (4.1)", () => {
  async function seedBankProblem(slug: string) {
    const [p] = await db
      .insert(problems)
      .values({
        lcId: Math.floor(Math.random() * 2 ** 31),
        title: `Title of ${slug}`,
        slug,
        difficulty: "Medium",
        tags: "[]",
        description: "",
        fetchedAt: T0,
      })
      .returning();
    return p;
  }

  it("exposes the newest plan as current, older plans as past, with derived statuses and problem refs", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    const p1 = await seedBankProblem("two-sum");
    const p2 = await seedBankProblem("add-numbers");
    const p3 = await seedBankProblem("three-sum");

    vi.setSystemTime(T0);
    const oldPlan = await createPlan(db, {
      horizonDays: 7,
      focus: "week one",
      notes: "old notes",
      problems: [
        { lcId: p1.lcId, slug: p1.slug, reason: "warm-up" },
        { lcId: p2.lcId, slug: p2.slug, reason: "practice" },
        { lcId: p3.lcId, slug: p3.slug, reason: "stretch" },
      ],
    });

    vi.setSystemTime(T0 + DAY);
    const newPlan = await createPlan(db, {
      horizonDays: 3,
      focus: "week two",
      problems: [{ lcId: p1.lcId, slug: p1.slug, reason: "retry" }],
    });

    // New plan item 1 solved via an Accepted submission.
    vi.setSystemTime(T0 + DAY + HOUR);
    const s1 = await startSession(db, p1.id, newPlan.items[0]!.id);
    await finishSession(db, s1);
    await db.insert(submissions).values({
      lcSubmissionId: 6001,
      problemId: p1.id,
      sessionId: s1,
      lang: "python3",
      code: "x",
      verdict: "Accepted",
      statusDisplay: "Accepted",
      runtime: "0 ms",
      memory: "10 MB",
      submittedAt: T0 + DAY + HOUR,
      syncedAt: T0 + DAY + HOUR,
    });

    // Old plan item 2 practiced (linked session, no Accept).
    await startSession(db, p2.id, oldPlan.items[1]!.id);

    const d = await getDashboard(db);

    expect(d.plan).not.toBeNull();
    expect(d.plan!.id).toBe(newPlan.id);
    expect(d.plan!.focus).toBe("week two");
    expect(d.plan!.horizonDays).toBe(3);
    expect(d.plan!.createdAt).toBe(T0 + DAY);
    expect(d.plan!.items).toEqual([
      {
        id: newPlan.items[0]!.id,
        planId: newPlan.id,
        problemId: p1.id,
        lcId: p1.lcId,
        slug: "two-sum",
        title: "Title of two-sum",
        difficulty: "Medium",
        reason: "retry",
        status: "solved",
        carriedFrom: null,
        topics: [{ id: "other", label: "Other" }],
      },
    ]);

    expect(d.pastPlans).toHaveLength(1);
    const past = d.pastPlans[0]!;
    expect(past.id).toBe(oldPlan.id);
    expect(past.createdAt).toBe(T0);
    expect(past.notes).toBe("old notes");
    expect(past.items.map((i) => [i.status, i.problemId, i.title])).toEqual([
      ["not_started", p1.id, "Title of two-sum"],
      ["practiced", p2.id, "Title of add-numbers"],
      ["not_started", p3.id, "Title of three-sum"],
    ]);
  });

  it("returns null plan and no past plans when none exist", async () => {
    const d = await getDashboard(db);
    expect(d.plan).toBeNull();
    expect(d.pastPlans).toEqual([]);
  });

  it("maps each plan item's problem tags to curated topic node ids", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const [p1] = await db
      .insert(problems)
      .values({
        lcId: 100,
        title: "Three Sum",
        slug: "three-sum",
        difficulty: "Medium",
        tags: '["array","two-pointers"]',
        description: "",
        fetchedAt: T0,
      })
      .returning();
    const [p2] = await db
      .insert(problems)
      .values({
        lcId: 101,
        title: "Exotic",
        slug: "exotic",
        difficulty: "Hard",
        tags: '["database"]',
        description: "",
        fetchedAt: T0,
      })
      .returning();

    await createPlan(db, {
      horizonDays: 7,
      focus: "mixed",
      problems: [
        { lcId: p1!.lcId, slug: p1!.slug, reason: "r" },
        { lcId: p2!.lcId, slug: p2!.slug, reason: "r" },
      ],
    });

    const d = await getDashboard(db);
    expect(d.plan!.items.map((i) => i.topics)).toEqual([
      [
        { id: "arrays-hashing", label: "Arrays & Hashing" },
        { id: "two-pointers", label: "Two Pointers" },
      ], // multi-node membership preserved
      [{ id: "other", label: "Other" }], // unmapped tag falls back to the Other bucket
    ]);
  });
});

describe("dashboard continue payload (3.1)", () => {
  async function seed(slug: string) {
    const [p] = await db
      .insert(problems)
      .values({
        lcId: Math.floor(Math.random() * 2 ** 31),
        title: `Title of ${slug}`,
        slug,
        difficulty: "Easy",
        tags: "[]",
        description: "",
        fetchedAt: T0,
      })
      .returning();
    return p;
  }

  let submissionId = 7000;

  async function acceptedSubmission(sessionId: number, at: number, problemId: number) {
    // Outcome comes from the synced submission rows (sync stores the row and
    // appends the matching timeline event).
    await db.insert(submissions).values({
      lcSubmissionId: ++submissionId,
      problemId,
      sessionId,
      lang: "python3",
      code: "x",
      verdict: "Accepted",
      statusDisplay: "Accepted",
      runtime: "0 ms",
      memory: "10 MB",
      submittedAt: at,
      syncedAt: at,
    });
  }

  it("exposes the newest unfinished session as activeSession, preferring paused over older active", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const p = await seed("two-sum");

    vi.setSystemTime(T0);
    const s1 = await startSession(db, p.id);
    vi.setSystemTime(T0 + HOUR);
    await finishSession(db, s1);

    vi.setSystemTime(T0 + 2 * HOUR);
    const s2 = await startSession(db, p.id); // active, older

    vi.setSystemTime(T0 + 3 * HOUR);
    const s3 = await startSession(db, p.id); // newest, will be paused
    await pauseSession(db, s3);

    const d = await getDashboard(db);
    expect(d.activeSession).not.toBeNull();
    expect(d.activeSession!.id).toBe(s3);
    expect(d.activeSession!.status).toBe("paused");
    expect(d.activeSession!.problem.slug).toBe("two-sum");
    expect(d.activeSession!.startedAt).toBe(T0 + 3 * HOUR);

    // Existing fields unchanged. Untagged problems fall into the Other bucket.
    expect(d.totals.sessions).toBe(3);
    expect(d.daily).toHaveLength(1);
    expect(d.topics).toEqual([{ topic: "other", label: "Other", attempts: 3, solved: 0 }]);
  });

  it("returns null activeSession when every session is finished", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const p = await seed("three-sum");

    vi.setSystemTime(T0);
    const s1 = await startSession(db, p.id);
    await finishSession(db, s1);

    const d = await getDashboard(db);
    expect(d.activeSession).toBeNull();
    expect(d.recentSessions).toHaveLength(1);
  });

  it("lists recent finished sessions newest-first with derived outcome, capped at 5", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const p = await seed("four-sum");

    const ids: number[] = [];
    for (let i = 0; i < 6; i++) {
      vi.setSystemTime(T0 + i * HOUR);
      const s = await startSession(db, p.id);
      vi.setSystemTime(T0 + i * HOUR + 30 * 60_000);
      await finishSession(db, s);
      if (i === 2) await acceptedSubmission(s, T0 + i * HOUR + 60_000, p.id);
      ids.push(s);
    }

    const d = await getDashboard(db);
    expect(d.activeSession).toBeNull();
    expect(d.recentSessions).toHaveLength(5);
    // Newest first: sessions 6..2 (the oldest, session 1, is dropped).
    expect(d.recentSessions.map((r) => r.id)).toEqual([ids[5]!, ids[4]!, ids[3]!, ids[2]!, ids[1]!]);
    const withOutcome = d.recentSessions.find((r) => r.id === ids[2]!)!;
    expect(withOutcome.outcome).toBe("Accepted");
    expect(withOutcome.finishedAt).toBeGreaterThan(withOutcome.startedAt);
    expect(withOutcome.status).toBe("finished");
    const withoutSubmission = d.recentSessions.find((r) => r.id === ids[1]!)!;
    expect(withoutSubmission.outcome).toBeNull();
  });

  it("lists all finished sessions when fewer than 5 exist", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const p = await seed("five-sum");

    vi.setSystemTime(T0);
    const s1 = await startSession(db, p.id);
    await finishSession(db, s1);
    vi.setSystemTime(T0 + HOUR);
    const s2 = await startSession(db, p.id);
    await finishSession(db, s2);

    const d = await getDashboard(db);
    expect(d.recentSessions).toHaveLength(2);
    expect(d.recentSessions.map((r) => r.id)).toEqual([s2, s1]);
  });
});
