import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { problems, reviewRequests, sessionEvents, sessions, submissions } from "../db/schema.js";
import { LcError, type LcClient } from "./client.js";

export interface SyncResult {
  fetched: number;
  stored: number;
  updated: number;
}

export async function syncBank(db: Db, client: LcClient): Promise<SyncResult> {
  const list = await client.listProblems();
  const now = Date.now();
  let stored = 0;
  let updated = 0;

  const byLcId = await db
    .select({ id: problems.id, lcId: problems.lcId })
    .from(problems)
    .where(
      inArray(
        problems.lcId,
        list.map((p) => p.lcId),
      ),
    );
  const existing = new Map(byLcId.map((r) => [r.lcId, r.id]));

  for (const p of list) {
    const tags = JSON.stringify(p.tagSlugs);
    const detailId = existing.get(p.lcId);
    if (detailId === undefined) {
      await db.insert(problems).values({
        lcId: p.lcId,
        title: p.title,
        slug: p.slug,
        difficulty: p.difficulty,
        tags,
        description: "",
        fetchedAt: now,
      });
      stored += 1;
    } else {
      await db
        .update(problems)
        .set({ title: p.title, slug: p.slug, difficulty: p.difficulty, tags, fetchedAt: now })
        .where(eq(problems.id, detailId));
      updated += 1;
    }
  }
  return { fetched: list.length, stored, updated };
}

/** Fetch description for one problem (used on demand and by background enrichment). */
export async function syncProblemDetail(db: Db, client: LcClient, problemId: number): Promise<boolean> {
  const [row] = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
  if (!row) throw new Error(`Problem ${problemId} not found`);
  const detail = await client.problemDetail(row.slug);
  if (!detail) return false;
  await db
    .update(problems)
    .set({
      title: detail.title,
      difficulty: detail.difficulty,
      tags: JSON.stringify(detail.tagSlugs),
      description: detail.description,
      fetchedAt: Date.now(),
    })
    .where(eq(problems.id, problemId));
  return true;
}

let enrichmentRunning = false;

/**
 * Background detail enrichment: fetch full problem details (description
 * included) for problems missing them, throttled. Resumable — each run picks
 * up where the bank left off. Failures leave existing data intact.
 */
export async function enrichBankDetails(db: Db, client: LcClient, delayMs = 400): Promise<void> {
  if (enrichmentRunning) return;
  enrichmentRunning = true;
  try {
    for (;;) {
      const [row] = await db
        .select({ id: problems.id })
        .from(problems)
        .where(eq(problems.description, ""))
        .orderBy(asc(problems.lcId))
        .limit(1);
      if (!row) break;
      try {
        await syncProblemDetail(db, client, row.id);
      } catch {
        break; // LC unreachable/auth — resume on a later sync trigger
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  } finally {
    enrichmentRunning = false;
  }
}

export interface SubmissionSyncResult {
  fetched: number;
  newSubmissions: number;
}

/**
 * Pull LC submissions for a problem and store them. Idempotent on
 * lc_submission_id. New submissions are linked to the open session whose time
 * window contains the submission timestamp, and appended to that session's
 * event stream.
 */
export async function syncSubmissions(db: Db, client: LcClient, problemId: number): Promise<SubmissionSyncResult> {
  const [problem] = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
  if (!problem) throw new Error(`Problem ${problemId} not found`);

  const items = await client.listSubmissions(problem.slug);
  let created = 0;
  for (const item of items) {
    const [existing] = await db
      .select({ id: submissions.id, sessionId: submissions.sessionId })
      .from(submissions)
      .where(eq(submissions.lcSubmissionId, item.lcSubmissionId))
      .limit(1);
    if (existing) {
      // Already stored: retry linking in case a matching session exists now,
      // and backfill code if it failed on a previous sync.
      if (existing.sessionId === null) {
        const session = await findSessionForTimestamp(db, problemId, item.submittedAt);
        if (session) {
          await db.update(submissions).set({ sessionId: session.id }).where(eq(submissions.id, existing.id));
          await appendEvent(db, session.id, item.submittedAt, "submission", {
            lc_submission_id: item.lcSubmissionId,
            verdict: item.statusDisplay,
            code: item.code,
            lang: item.lang,
            runtime: item.runtime,
            memory: item.memory,
          });
        }
      }
      const [stored] = await db.select({ code: submissions.code, id: submissions.id, sessionId: submissions.sessionId }).from(submissions).where(eq(submissions.id, existing.id)).limit(1);
      if (stored && stored.code === "") {
        try {
          const detail = await client.submissionDetail(item.lcSubmissionId);
          if (detail && detail.code) {
            await db.update(submissions).set({ code: detail.code }).where(eq(submissions.id, stored.id));
            if (stored.sessionId !== null) {
              const [event] = await db
                .select({ id: sessionEvents.id, payload: sessionEvents.payload })
                .from(sessionEvents)
                .where(
                  and(
                    eq(sessionEvents.sessionId, stored.sessionId),
                    eq(sessionEvents.type, "submission"),
                    like(sessionEvents.payload, `%"lc_submission_id":${item.lcSubmissionId}%`),
                  ),
                )
                .limit(1);
              if (event) {
                const payload = JSON.parse(event.payload) as Record<string, unknown>;
                payload.code = detail.code;
                await db
                  .update(sessionEvents)
                  .set({ payload: JSON.stringify(payload) })
                  .where(eq(sessionEvents.id, event.id));
              }
            }
          }
        } catch {
          // stays empty; retried on the next sync
        }
      }
      continue;
    }

    const session = await findSessionForTimestamp(db, problemId, item.submittedAt);
    // GraphQL submissionList does not expose code; fetch it per submission.
    let code = item.code;
    try {
      const detail = await client.submissionDetail(item.lcSubmissionId);
      if (detail) code = detail.code;
    } catch {
      // Code stays empty if the detail fetch fails; verdict/metadata still stored.
    }
    await db.insert(submissions).values({
      lcSubmissionId: item.lcSubmissionId,
      problemId,
      sessionId: session?.id ?? null,
      lang: item.lang,
      code,
      verdict: item.statusDisplay,
      statusDisplay: item.statusDisplay,
      runtime: item.runtime,
      memory: item.memory,
      submittedAt: item.submittedAt,
      syncedAt: Date.now(),
    });
    created += 1;

    if (session) {
      await appendEvent(db, session.id, item.submittedAt, "submission", {
        lc_submission_id: item.lcSubmissionId,
        verdict: item.statusDisplay,
        code,
        lang: item.lang,
        runtime: item.runtime,
        memory: item.memory,
      });
    }
  }
  return { fetched: items.length, newSubmissions: created };
}

async function findSessionForTimestamp(
  db: Db,
  problemId: number,
  ts: number,
): Promise<{ id: number } | undefined> {
  // Unfinished session active at the timestamp; else a session whose
  // started/finished window contains it.
  const rows = await db
    .select({ id: sessions.id, startedAt: sessions.startedAt, finishedAt: sessions.finishedAt })
    .from(sessions)
    .where(eq(sessions.problemId, problemId));
  return rows.find((s) => s.startedAt <= ts && (s.finishedAt === null || ts <= s.finishedAt));
}

export async function appendEvent(
  db: Db,
  sessionId: number,
  ts: number,
  type: string,
  payload: unknown,
): Promise<number> {
  const [{ maxSeq }] = await db
    .select({ maxSeq: sql<number>`COALESCE(MAX(${sessionEvents.seq}), 0)` })
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId));
  const seq = maxSeq + 1;
  await db.insert(sessionEvents).values({
    sessionId,
    seq,
    type,
    ts,
    payload: JSON.stringify(payload ?? {}),
  });
  return seq;
}

/** Convert an LcError into an HTTP status + user-facing message. */
export function lcErrorToHttp(err: LcError): { status: number; body: { error: { kind: string; message: string } } } {
  if (err.kind === "auth") {
    return {
      status: 502,
      body: {
        error: {
          kind: "auth",
          message: "LeetCode session credential expired or invalid. Renew the cookie in app configuration.",
        },
      },
    };
  }
  if (err.kind === "network") {
    return {
      status: 502,
      body: {
        error: { kind: "network", message: `LeetCode unreachable: ${err.message}` },
      },
    };
  }
  return {
    status: 502,
    body: { error: { kind: "unexpected", message: `LeetCode sync failed: ${err.message}` } },
  };
}

export async function hasPendingReview(db: Db, sessionId: number): Promise<boolean> {
  const [row] = await db
    .select({ status: reviewRequests.status })
    .from(reviewRequests)
    .where(and(eq(reviewRequests.sessionId, sessionId), inArray(reviewRequests.status, ["pending", "in_progress"])))
    .limit(1);
  return !!row;
}
