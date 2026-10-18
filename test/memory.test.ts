import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMemory, listMemoryVersions, putMemory } from "../server/memory/memory";
import { getProgressDigest, topicsForTags, OTHER_TOPIC } from "../server/memory/digest";
import { createPlan, getCurrentPlan } from "../server/sessions/plans";
import { startSession, finishSession } from "../server/sessions/service";
import { createDb } from "../server/db/client";
import { runMigrations } from "../server/db/migrate";
import { problems, sessions, submissions } from "../server/db/schema";
import { eq } from "drizzle-orm";
import type Database from "better-sqlite3";

const DAY = 86_400_000;
const HOUR = 3_600_000;

// Epoch whose UTC date is 2026-09-10.
const T0 = Date.UTC(2026, 8, 10, 12, 0, 0);

let db: ReturnType<typeof createDb>["db"];
let sqlite: ReturnType<typeof createDb>["sqlite"];

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

describe("memory service (2.1)", () => {
  it("PUT creates a new version, GET returns the latest, versions list newest-first", async () => {
    const first = await putMemory(db, "version one");
    const second = await putMemory(db, "version two — revised ladder");

    const current = await getMemory(db);
    expect(current!.body).toBe("version two — revised ladder");
    expect(current!.versionId).toBe(second.versionId);
    expect(second.versionId).toBeGreaterThan(first.versionId);

    const versions = await listMemoryVersions(db);
    expect(versions.map((v) => v.body)).toEqual(["version two — revised ladder", "version one"]);
    expect(versions[0]!.size).toBe(Buffer.byteLength(versions[0]!.body));
    expect(versions[0]!.createdAt).toBeGreaterThan(0);
  });

  it("returns null before any memory is stored", async () => {
    expect(await getMemory(db)).toBeNull();
    expect(await listMemoryVersions(db)).toEqual([]);
  });

  it("enforces the size cap with an informative error and stores nothing", async () => {
    const huge = "x".repeat(64 * 1024 + 1);
    await expect(putMemory(db, huge)).rejects.toThrow(/exceeds 65536 bytes/);
    expect(await listMemoryVersions(db)).toEqual([]);
  });
});

describe("progress digest (2.2)", () => {
  async function seedProblem(lcId: number, slug: string, tags: string[]) {
    const [p] = await db
      .insert(problems)
      .values({ lcId, title: slug, slug, difficulty: "Easy", tags: JSON.stringify(tags), description: "", fetchedAt: T0 })
      .returning({ id: problems.id });
    return p.id;
  }

  it("aggregates per-topic attempts/solved/last-practiced from sessions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    const twoSum = await seedProblem(1, "two-sum", ["array", "hash-table"]);
    const threeSum = await seedProblem(15, "three-sum", ["array", "two-pointers"]);

    const s1 = await startSession(db, twoSum);
    vi.setSystemTime(T0 + HOUR);
    await finishSession(db, s1);

    vi.setSystemTime(T0 + DAY);
    const s2 = await startSession(db, threeSum);
    vi.setSystemTime(T0 + DAY + 2 * HOUR);
    await finishSession(db, s2);
    await db.insert(submissions).values({
      lcSubmissionId: 1,
      problemId: threeSum,
      sessionId: s2,
      lang: "python3",
      code: "x",
      verdict: "Accepted",
      statusDisplay: "Accepted",
      runtime: null,
      memory: null,
      submittedAt: T0 + DAY + HOUR,
      syncedAt: T0 + DAY + 2 * HOUR,
    });

    const digest = await getProgressDigest(db);
    expect(digest.totals).toEqual({ attempts: 2, solved: 1 });
    // three-sum spans two buckets (array, two-pointers) and counts in each.
    const arrays = digest.topics.find((t) => t.topic === "arrays-hashing")!;
    expect(arrays.attempts).toBe(2);
    expect(arrays.solved).toBe(1);
    expect(arrays.last_practiced_at).toBe(T0 + DAY);
    const pointers = digest.topics.find((t) => t.topic === "two-pointers")!;
    expect(pointers).toEqual({
      topic: "two-pointers",
      attempts: 1,
      solved: 1,
      solve_rate: 1,
      last_practiced_at: T0 + DAY,
    });
  });

  it("returns zeroed aggregates and no plan when nothing exists", async () => {
    const digest = await getProgressDigest(db);
    expect(digest.totals).toEqual({ attempts: 0, solved: 0 });
    expect(digest.topics).toEqual([]);
    expect(digest.current_plan).toBeNull();
  });

  it("counts a Wrong-Answer-only session as an attempt but not solved (verdict-based)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    const p = await seedProblem(1, "two-sum", ["array"]);

    const s = await startSession(db, p);
    vi.setSystemTime(T0 + HOUR);
    await finishSession(db, s);
    await db.insert(submissions).values({
      lcSubmissionId: 11,
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

    const digest = await getProgressDigest(db);
    expect(digest.totals).toEqual({ attempts: 1, solved: 0 });
    const arrays = digest.topics.find((t) => t.topic === "arrays-hashing")!;
    expect(arrays.attempts).toBe(1);
    expect(arrays.solved).toBe(0);
    expect(arrays.solve_rate).toBe(0);
  });

  it("rolls up current-plan adherence and carried unsolved items", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    const p1 = await seedProblem(1, "two-sum", ["array"]);
    const p2 = await seedProblem(2, "three-sum", ["array"]);

    const first = await createPlan(db, {
      horizonDays: 7,
      focus: "week one",
      problems: [{ lcId: 1, slug: "two-sum", reason: "r" }],
    });

    const second = await createPlan(db, {
      horizonDays: 7,
      focus: "week two",
      basedOn: first.id,
      problems: [{ lcId: 2, slug: "three-sum", reason: "carried", carriedFrom: first.items[0]!.id }],
    });

    // Practice the carried item (no Accepted verdict -> practiced).
    const s = await startSession(db, p2, second.items[0]!.id);
    vi.setSystemTime(T0 + HOUR);
    await finishSession(db, s);
    await db.insert(submissions).values({
      lcSubmissionId: 2,
      problemId: p2,
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

    const digest = await getProgressDigest(db);
    expect(digest.current_plan!.id).toBe(second.id);
    expect(digest.current_plan!.solved).toBe(0);
    expect(digest.current_plan!.practiced).toBe(1);
    expect(digest.current_plan!.not_started).toBe(0);
    expect(digest.current_plan!.carried_unsolved).toEqual([
      { item_id: second.items[0]!.id, carried_from: first.items[0]!.id, slug: "three-sum", status: "practiced" },
    ]);
  });

  it("does not trigger any lc-client activity (pure local reads)", async () => {
    // The digest is built only from local tables; the test simply runs without
    // any fetch mocks/credentials configured, which would throw if sync ran.
    const digest = await getProgressDigest(db);
    expect(digest.totals.attempts).toBe(0);
  });

  it("maps unknown tags into the other bucket", () => {
    expect(topicsForTags(["database", "shell"])).toEqual([OTHER_TOPIC]);
    expect(topicsForTags(["array", "hash-table"])).toEqual(["arrays-hashing"]);
    expect(topicsForTags(["array", "two-pointers"])).toEqual(["arrays-hashing", "two-pointers"]);
  });
});
