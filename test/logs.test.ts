import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serializeSessionLog, LOG_SCHEMA_VERSION } from "../server/logs/serialize";
import { startSession, recordSnapshot, recordCopyOut, getSessionDetail } from "../server/sessions/service";
import { appendEvent } from "../server/lc/sync";
import { createDb } from "../server/db/client";
import { runMigrations } from "../server/db/migrate";
import { problems, sessions } from "../server/db/schema";
import { eq } from "drizzle-orm";
import type Database from "better-sqlite3";

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

async function seedProblem(): Promise<number> {
  const [p] = await db
    .insert(problems)
    .values({
      lcId: 1,
      title: "Two Sum",
      slug: "two-sum",
      difficulty: "Easy",
      tags: '["array","hash-table"]',
      description: "<p>desc</p>",
      fetchedAt: Date.now(),
    })
    .returning({ id: problems.id });
  return p.id;
}

describe("session log serialization", () => {
  it("emits well-formed JSONL with a versioned header and full-code snapshots", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const problemId = await seedProblem();
    const sessionId = await startSession(db, problemId);
    await recordSnapshot(db, sessionId, "def twoSum(a, b):\n    return a + b", "first try", "python3");
    await recordCopyOut(db, sessionId, "def twoSum(a, b):\n    return a + b", "python3");

    const jsonl = await serializeSessionLog(db, sessionId);
    const lines = jsonl.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(4);

    const header = JSON.parse(lines[0]!);
    expect(header.schema_version).toBe(LOG_SCHEMA_VERSION);
    expect(header.kind).toBe("header");
    expect(header.problem.slug).toBe("two-sum");

    const events = lines.slice(1).map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(events.every((e) => typeof e.type === "string" && typeof e.offset_ms === "number")).toBe(true);
    const snap = events.find((e) => e.type === "snapshot")!;
    expect((snap.payload as Record<string, unknown>).code).toContain("def twoSum");
    expect(events.find((e) => e.type === "copy_out")).toBeDefined();
  });

  it("appends late-arriving submissions without rewriting prior events", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const problemId = await seedProblem();
    const sessionId = await startSession(db, problemId);
    await recordSnapshot(db, sessionId, "draft v1", "wip", "python3");

    const before = await serializeSessionLog(db, sessionId);
    const beforeLines = before.split("\n");

    vi.setSystemTime(10 * 60_000);
    // Late submission synced after the events above were already emitted.
    await appendEvent(db, sessionId, Date.now(), "submission", {
      lc_submission_id: 777,
      verdict: "Accepted",
      code: "final code",
      lang: "python3",
    });

    const after = await serializeSessionLog(db, sessionId);
    const afterLines = after.split("\n");

    // All previously emitted lines are byte-identical and in the same order.
    expect(afterLines.slice(0, beforeLines.length)).toEqual(beforeLines);
    const appended = JSON.parse(afterLines[afterLines.length - 1]!) as Record<string, unknown>;
    expect(appended.type).toBe("submission");
    expect((appended.payload as Record<string, unknown>).verdict).toBe("Accepted");
  });

  it("preserves the original version marker across serializations", async () => {
    vi.useFakeTimers();
    const problemId = await seedProblem();
    const sessionId = await startSession(db, problemId);

    // First serialization stamps the current version.
    await serializeSessionLog(db, sessionId);
    let [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(s.logVersion).toBe(LOG_SCHEMA_VERSION);

    // Simulate a log written under an older schema version: the stored marker
    // is 1 while a future schema version (2) is current.
    const OLD_VERSION = LOG_SCHEMA_VERSION - 1;
    await db.update(sessions).set({ logVersion: OLD_VERSION }).where(eq(sessions.id, sessionId));

    const jsonl = await serializeSessionLog(db, sessionId);
    const header = JSON.parse(jsonl.split("\n")[0]!) as Record<string, unknown>;
    expect(header.schema_version).toBe(OLD_VERSION);

    // And the stamp is still not overwritten by later serializations.
    const [s2] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(s2.logVersion).toBe(OLD_VERSION);
    expect(s2.logVersion).not.toBe(LOG_SCHEMA_VERSION);
  });
});
