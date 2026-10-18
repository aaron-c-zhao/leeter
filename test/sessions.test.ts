import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  startSession,
  pauseSession,
  resumeSession,
  finishSession,
  recordSnapshot,
  recordCopyOut,
  saveNotes,
  getNotes,
  getTimeline,
  getSessionDetail,
  sessionStatus,
} from "../server/sessions/service";
import { createDb } from "../server/db/client";
import { runMigrations } from "../server/db/migrate";
import { problems, sessionEvents, sessions } from "../server/db/schema";
import { eq } from "drizzle-orm";
import type Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const MIN = 60_000;

async function seedProblem(db: Parameters<typeof startSession>[0]): Promise<number> {
  const [p] = await db
    .insert(problems)
    .values({
      lcId: 1,
      title: "Two Sum",
      slug: "two-sum",
      difficulty: "Easy",
      tags: "[]",
      description: "",
      fetchedAt: Date.now(),
    })
    .returning({ id: problems.id });
  return p.id;
}

describe("session lifecycle", () => {
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

  it("excludes paused time from active time", async () => {
    vi.useFakeTimers();
    const problemId = await seedProblem(db);
    vi.setSystemTime(0);
    const sessionId = await startSession(db, problemId);

    vi.setSystemTime(10 * MIN);
    await pauseSession(db, sessionId);
    vi.setSystemTime(25 * MIN);
    await resumeSession(db, sessionId);
    vi.setSystemTime(40 * MIN);
    await finishSession(db, sessionId);

    const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(s.finishedAt).toBe(40 * MIN);
    expect(s.activeMs).toBe(25 * MIN); // 10 active + 15 active, 15 paused excluded

    const events = await db.select().from(sessionEvents).where(eq(sessionEvents.sessionId, sessionId));
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      "session_started",
      "problem_opened",
      "session_paused",
      "session_resumed",
      "session_finished",
    ]);
  });

  it("state survives an app restart (persistence)", async () => {
    vi.useFakeTimers();
    const dir = mkdtempSync(path.join(tmpdir(), "leeter-test-"));
    const dbPath = path.join(dir, "leeter.db");

    vi.setSystemTime(0);
    let handle = createDb(dbPath);
    runMigrations(handle.sqlite);
    const problemId = await seedProblem(handle.db);
    const sessionId = await startSession(handle.db, problemId);
    await saveNotes(handle.db, sessionId, "# approach\nbinary search");
    await recordSnapshot(handle.db, sessionId, "def twoSum(): pass", "first try", "python");
    vi.setSystemTime(5 * MIN);
    await pauseSession(handle.db, sessionId);
    handle.sqlite.close();

    // "Restart" the app: reopen the DB.
    handle = createDb(dbPath);
    runMigrations(handle.sqlite);
    const detail = await getSessionDetail(handle.db, sessionId);
    expect(detail.status).toBe("paused");
    expect(detail.notes).toBe("# approach\nbinary search");
    expect(detail.timeline.some((e) => e.type === "snapshot" && e.payload.code === "def twoSum(): pass")).toBe(true);

    vi.setSystemTime(12 * MIN);
    await resumeSession(handle.db, sessionId);
    vi.setSystemTime(20 * MIN);
    await finishSession(handle.db, sessionId);
    const [s] = await handle.db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(s.activeMs).toBe(13 * MIN); // 5 pre-pause + 8 post-resume; 7 paused excluded
    expect(sessionStatus(s)).toBe("finished");
    handle.sqlite.close();
  });

  it("appends a full-code snapshot event on each save", async () => {
    vi.useFakeTimers();
    const problemId = await seedProblem(db);
    const sessionId = await startSession(db, problemId);
    await recordSnapshot(db, sessionId, "first draft", "wip", "python3");
    await recordSnapshot(db, sessionId, "first draft\nclass Solution:\n    pass", undefined, "python3");

    const events = await getTimeline(db, sessionId);
    const snaps = events.filter((e) => e.type === "snapshot");
    expect(snaps).toHaveLength(2);
    expect(snaps[1].payload.code).toContain("class Solution");
    expect(snaps[0].payload.code).toBe("first draft");
  });

  it("records copy-out as a timeline event", async () => {
    vi.useFakeTimers();
    const problemId = await seedProblem(db);
    const sessionId = await startSession(db, problemId);
    await recordCopyOut(db, sessionId, "pasted code", "python3");
    const events = await getTimeline(db, sessionId);
    const copy = events.find((e) => e.type === "copy_out");
    expect(copy).toBeDefined();
    expect(copy!.payload.code).toBe("pasted code");
  });

  it("interleaves synced submissions chronologically with draft events", async () => {
    vi.useFakeTimers();
    const problemId = await seedProblem(db);
    vi.setSystemTime(0);
    const sessionId = await startSession(db, problemId);
    await recordSnapshot(db, sessionId, "draft v1", "wip", "python3");

    // Simulate the LC sync appending a submission between the two snapshots.
    const T_SUB = 3 * MIN;
    const { appendEvent } = await import("../server/lc/sync.js");
    await appendEvent(db, sessionId, T_SUB, "submission", {
      lc_submission_id: 999,
      verdict: "Wrong Answer",
      code: "submitted code",
      lang: "python3",
    });

    vi.setSystemTime(5 * MIN);
    await recordSnapshot(db, sessionId, "draft v2 after failure", undefined, "python3");

    const timeline = await getTimeline(db, sessionId, "ts");
    const types = timeline.filter((e) => e.type === "snapshot" || e.type === "submission").map((e) => e.type);
    expect(types).toEqual(["snapshot", "submission", "snapshot"]);
  });
});
