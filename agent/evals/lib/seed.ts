import type { Db } from "../../../server/db/client.js";
import { memory, memoryVersions, plans, planItems, problems, reviews, reviewRequests, sessionEvents, sessions, submissions } from "../../../server/db/schema.js";

/*
 * Fixture seeding helpers. Fixtures insert rows directly with explicit
 * timestamps (deterministic), mirroring the test-suite patterns. Submission
 * rows always pair with a "submission" session event, exactly as the sync
 * flow records them — outcome derivation and the digest agree.
 */

export const T0 = Date.UTC(2026, 8, 20, 12, 0, 0); // 2026-09-20T12:00Z
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

let submissionSeq = 10_000;

export interface SeedProblemInput {
  lcId: number;
  slug: string;
  title?: string;
  difficulty?: string;
  tags: string[];
}

export async function seedProblem(db: Db, input: SeedProblemInput): Promise<number> {
  const [row] = await db
    .insert(problems)
    .values({
      lcId: input.lcId,
      title: input.title ?? input.slug,
      slug: input.slug,
      difficulty: input.difficulty ?? "Medium",
      tags: JSON.stringify(input.tags),
      description: "",
      fetchedAt: T0,
    })
    .returning({ id: problems.id });
  return row!.id;
}

export interface SeedSessionInput {
  problemId: number;
  startedAt: number;
  finishedAt?: number | null;
  pausedAt?: number | null;
  activeMs?: number;
  planItemId?: number | null;
  /** Submissions stored for the session (row + matching timeline event). */
  submissions?: Array<{ verdict: string; at: number }>;
  /** When set, creates a completed review request + review row. */
  review?: { overall: string; recommendedFocus: string };
}

export async function seedSession(db: Db, input: SeedSessionInput): Promise<number> {
  const [session] = await db
    .insert(sessions)
    .values({
      problemId: input.problemId,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt ?? null,
      activeMs: input.activeMs ?? 0,
      pausedAt: input.pausedAt ?? null,
      lastResumedAt: input.pausedAt !== undefined && input.pausedAt !== null ? input.startedAt : null,
      planItemId: input.planItemId ?? null,
      createdAt: input.startedAt,
      updatedAt: input.finishedAt ?? input.startedAt,
    })
    .returning({ id: sessions.id });
  const sessionId = session!.id;

  let seq = 0;
  for (const sub of input.submissions ?? []) {
    await db.insert(submissions).values({
      lcSubmissionId: submissionSeq++,
      problemId: input.problemId,
      sessionId,
      lang: "python3",
      code: "x",
      verdict: sub.verdict,
      statusDisplay: sub.verdict,
      runtime: null,
      memory: null,
      submittedAt: sub.at,
      syncedAt: sub.at,
    });
    await db.insert(sessionEvents).values({
      sessionId,
      seq: seq++,
      type: "submission",
      ts: sub.at,
      payload: JSON.stringify({ verdict: sub.verdict, code: "x", runtime: "0 ms", memory: "10 MB" }),
    });
  }

  if (input.review) {
    await db.insert(reviewRequests).values({
      sessionId,
      status: "completed",
      requestedAt: input.startedAt,
      updatedAt: input.startedAt,
    });
    await db.insert(reviews).values({
      sessionId,
      observations: "Practice process reviewed.",
      strengths: "Solid approach.",
      weaknesses: "Notes were thin.",
      recommendedFocus: input.review.recommendedFocus,
      overall: input.review.overall,
      createdAt: input.startedAt,
    });
  }

  return sessionId;
}

export interface SeedPlanInput {
  createdAt: number;
  horizonDays: number;
  focus: string;
  notes?: string | null;
  basedOn?: number | null;
  /** lcId + slug + reason; carriedFrom is the earlier plan item id. */
  items: Array<{ problemId: number; lcId: number; slug: string; reason: string; carriedFrom?: number | null }>;
}

export async function seedPlan(db: Db, input: SeedPlanInput): Promise<{ planId: number; itemIds: number[] }> {
  const [plan] = await db
    .insert(plans)
    .values({
      createdAt: input.createdAt,
      horizonDays: input.horizonDays,
      focusMd: input.focus,
      notesMd: input.notes ?? null,
      basedOn: input.basedOn ?? null,
    })
    .returning({ id: plans.id });
  const itemRows = await db
    .insert(planItems)
    .values(
      input.items.map((i) => ({
        planId: plan!.id,
        lcId: i.lcId,
        slug: i.slug,
        reasonMd: i.reason,
        carriedFrom: i.carriedFrom ?? null,
      })),
    )
    .returning({ id: planItems.id });
  return { planId: plan!.id, itemIds: itemRows.map((r) => r.id) };
}

/** Memory notebook: current row pointing at the newest immutable version. */
export async function seedMemory(db: Db, input: { body: string; at: number }): Promise<void> {
  const [version] = await db
    .insert(memoryVersions)
    .values({ body: input.body, size: Buffer.byteLength(input.body), createdAt: input.at })
    .returning({ id: memoryVersions.id });
  await db.insert(memory).values({ currentVersionId: version!.id, updatedAt: input.at });
}

/** Seed the shared candidate bank; returns internal row ids keyed by slug. */
export async function seedBank(db: Db): Promise<Map<string, number>> {
  const { BANK } = await import("./bank.js");
  const ids = new Map<string, number>();
  for (const entry of BANK) {
    ids.set(entry.slug, await seedProblem(db, entry));
  }
  return ids;
}
