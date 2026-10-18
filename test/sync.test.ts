import { beforeEach, describe, expect, it } from "vitest";
import type { LcClient, LcProblemDetail, LcProblemListItem, LcSubmissionDetail, LcSubmissionItem } from "../server/lc/client";
import { syncBank, syncProblemDetail, syncSubmissions } from "../server/lc/sync";
import { createDb, type Db } from "../server/db/client";
import { runMigrations } from "../server/db/migrate";
import { notes, problems, sessions, sessionEvents, submissions } from "../server/db/schema";
import { sql } from "drizzle-orm";
import type Database from "better-sqlite3";

const BANK: LcProblemListItem[] = [
  { lcId: 1, title: "Two Sum", slug: "two-sum", difficulty: "Easy", tagSlugs: ["array", "hash-table"] },
  { lcId: 2, title: "Add Two Numbers", slug: "add-two-numbers", difficulty: "Medium", tagSlugs: ["linked-list"] },
  { lcId: 3, title: "Longest Substring", slug: "longest-substring", difficulty: "Medium", tagSlugs: ["string"] },
];

const SUBMISSIONS: LcSubmissionItem[] = [
  {
    lcSubmissionId: 101,
    code: "def solve(): pass\n",
    lang: "python3",
    statusDisplay: "Wrong Answer",
    runtime: "0 ms",
    memory: "10 MB",
    submittedAt: 1_700_000_100_000,
  },
  {
    lcSubmissionId: 102,
    code: "def solve(): return 0\n",
    lang: "python3",
    statusDisplay: "Accepted",
    runtime: "4 ms",
    memory: "11 MB",
    submittedAt: 1_700_000_200_000,
  },
];

function fakeClient(): LcClient {
  return {
    listProblems: async () => [...BANK],
    problemDetail: async (slug: string): Promise<LcProblemDetail | null> => {
      const p = BANK.find((b) => b.slug === slug);
      if (!p) return null;
      return { ...p, description: `<p>${p.title} description</p>` };
    },
    listSubmissions: async () => [...SUBMISSIONS],
    submissionDetail: async (id: number): Promise<LcSubmissionDetail | null> => {
      const s = SUBMISSIONS.find((x) => x.lcSubmissionId === id);
      if (!s) return null;
      return {
        code: s.code,
        lang: s.lang,
        statusDisplay: s.statusDisplay,
        runtime: s.runtime,
        memory: s.memory,
        submittedAt: s.submittedAt,
      };
    },
  };
}

let db: Db;
let sqlite: Database.Database;

beforeEach(() => {
  const handle = createDb(":memory:");
  db = handle.db;
  sqlite = handle.sqlite;
  runMigrations(sqlite);
});

function sqliteRaw(): Database.Database {
  return sqlite;
}

async function count(table: string): Promise<number> {
  return Number(sqliteRaw().prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()!.c);
}

describe("problem bank sync", () => {
  it("populates the bank on initial sync and updates in place on refresh", async () => {
    const client = fakeClient();
    const first = await syncBank(db, client);
    expect(first).toEqual({ fetched: 3, stored: 3, updated: 0 });
    expect(await count("problems")).toBe(3);

    // User data created after initial sync must survive a refresh.
    const [p] = await db.select().from(problems).where(sql`${problems.slug} = 'two-sum'`);
    const now = Date.now();
    const [session] = await db
      .insert(sessions)
      .values({ problemId: p.id, startedAt: now, createdAt: now, updatedAt: now, activeMs: 0 })
      .returning({ id: sessions.id });
    await db.insert(notes).values({ sessionId: session.id, body: "my approach notes", updatedAt: now });

    const second = await syncBank(db, client);
    expect(second).toEqual({ fetched: 3, stored: 0, updated: 3 });
    expect(await count("problems")).toBe(3);
    expect(await count("sessions")).toBe(1);
    expect(await count("notes")).toBe(1);
    const [n] = await db.select().from(notes);
    expect(n.body).toBe("my approach notes");
  });

  it("background enrichment fills descriptions without losing data", async () => {
    const client = fakeClient();
    await syncBank(db, client);
    await syncProblemDetail(db, client, 1);
    const [p] = await db.select().from(problems).where(sql`${problems.slug} = 'two-sum'`);
    expect(p.description).toContain("Two Sum description");
    expect(await count("problems")).toBe(3);
  });
});

describe("submission history ingestion", () => {
  it("stores failed submissions and links to the covering session", async () => {
    const client = fakeClient();
    await syncBank(db, client);
    const [p] = await db.select().from(problems).where(sql`${problems.slug} = 'two-sum'`);

    // Session covering the submission window.
    const [session] = await db
      .insert(sessions)
      .values({
        problemId: p.id,
        startedAt: 1_700_000_000_000,
        finishedAt: 1_700_000_300_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        activeMs: 0,
      })
      .returning({ id: sessions.id });

    const result = await syncSubmissions(db, client, p.id);
    expect(result).toEqual({ fetched: 2, newSubmissions: 2 });
    expect(await count("submissions")).toBe(2);

    const stored = await db.select().from(submissions);
    const wrong = stored.find((s) => s.lcSubmissionId === 101)!;
    expect(wrong.verdict).toBe("Wrong Answer");
    expect(wrong.code).toContain("def solve");
    expect(wrong.sessionId).toBe(session.id);

    const events = await db.select().from(sessionEvents).where(sql`${sessionEvents.sessionId} = ${session.id}`);
    const subEvents = events.filter((e) => e.type === "submission");
    expect(subEvents).toHaveLength(2);
    const payloads = subEvents.map((e) => JSON.parse(e.payload));
    expect(payloads.map((x) => x.verdict).sort()).toEqual(["Accepted", "Wrong Answer"]);
  });

  it("re-sync without new activity creates no duplicates", async () => {
    const client = fakeClient();
    await syncBank(db, client);
    const [p] = await db.select().from(problems).where(sql`${problems.slug} = 'two-sum'`);
    const [session] = await db
      .insert(sessions)
      .values({
        problemId: p.id,
        startedAt: 1_700_000_000_000,
        finishedAt: 1_700_000_300_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        activeMs: 0,
      })
      .returning({ id: sessions.id });

    await syncSubmissions(db, client, p.id);
    const second = await syncSubmissions(db, client, p.id);
    expect(second).toEqual({ fetched: 2, newSubmissions: 0 });

    expect(await count("submissions")).toBe(2);
    const events = await db.select().from(sessionEvents).where(sql`${sessionEvents.sessionId} = ${session.id}`);
    expect(events.filter((e) => e.type === "submission")).toHaveLength(2);
  });
});
