import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { notes, planItems, plans, problems, reviews, reviewRequests, sessionEvents, sessions, submissions } from "../db/schema.js";
import { appendEvent } from "../lc/sync.js";
import { listPlans, type PlanItemStatus } from "./plans.js";
import { topicLabel, topicsForTags } from "../knowledge/taxonomy.js";
import { collectPracticedSessions, aggregateTopicStats, type PracticedSessionRow } from "../memory/digest.js";

export type SessionStatus = "active" | "paused" | "finished";

export function sessionStatus(s: { finishedAt: number | null; pausedAt: number | null }): SessionStatus {
  if (s.finishedAt !== null) return "finished";
  return s.pausedAt !== null ? "paused" : "active";
}

export async function startSession(db: Db, problemId: number, planItemId?: number): Promise<number> {
  const [problem] = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
  if (!problem) throw new Error(`Problem ${problemId} not found`);
  if (planItemId !== undefined) {
    const [item] = await db.select({ id: planItems.id }).from(planItems).where(eq(planItems.id, planItemId)).limit(1);
    if (!item) throw new Error(`Plan item ${planItemId} not found`);
  }
  const now = Date.now();
  const [session] = await db
    .insert(sessions)
    .values({
      problemId,
      startedAt: now,
      activeMs: 0,
      pausedAt: null,
      lastResumedAt: now,
      planItemId: planItemId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: sessions.id });

  await appendEvent(db, session.id, now, "session_started", { problem_slug: problem.slug });
  await appendEvent(db, session.id, now, "problem_opened", {
    problem_slug: problem.slug,
    title: problem.title,
  });
  return session.id;
}

export async function pauseSession(db: Db, sessionId: number): Promise<void> {
  const s = await getSessionOrThrow(db, sessionId);
  const status = sessionStatus(s);
  if (status === "finished") throw new Error("Session already finished");
  if (status === "paused") return;
  const now = Date.now();
  const delta = now - (s.lastResumedAt ?? s.startedAt);
  await db
    .update(sessions)
    .set({
      activeMs: s.activeMs + delta,
      pausedAt: now,
      lastResumedAt: null,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId));
  await appendEvent(db, sessionId, now, "session_paused", {});
}

export async function resumeSession(db: Db, sessionId: number): Promise<void> {
  const s = await getSessionOrThrow(db, sessionId);
  const status = sessionStatus(s);
  if (status === "finished") throw new Error("Session already finished");
  if (status === "active") return;
  const now = Date.now();
  await db
    .update(sessions)
    .set({ pausedAt: null, lastResumedAt: now, updatedAt: now })
    .where(eq(sessions.id, sessionId));
  await appendEvent(db, sessionId, now, "session_resumed", {});
}

export async function finishSession(db: Db, sessionId: number): Promise<void> {
  const s = await getSessionOrThrow(db, sessionId);
  if (s.finishedAt !== null) return;
  const now = Date.now();
  const extra = s.pausedAt === null ? now - (s.lastResumedAt ?? s.startedAt) : 0;
  await db
    .update(sessions)
    .set({ finishedAt: now, activeMs: s.activeMs + extra, updatedAt: now })
    .where(eq(sessions.id, sessionId));
  await appendEvent(db, sessionId, now, "session_finished", { active_ms: s.activeMs + extra });
}

export async function getSessionOrThrow(db: Db, sessionId: number) {
  const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!s) throw new Error(`Session ${sessionId} not found`);
  return s;
}

export interface TimelineEvent {
  seq: number;
  type: string;
  ts: number;
  payload: Record<string, unknown>;
}

/** Full event stream ordered chronologically (append order preserves late arrivals at the end). */
export async function getTimeline(db: Db, sessionId: number, orderBy: "seq" | "ts" = "seq"): Promise<TimelineEvent[]> {
  const rows = await db
    .select()
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId));
  const events = rows
    .map((r) => ({ seq: r.seq, type: r.type, ts: r.ts, payload: JSON.parse(r.payload) as Record<string, unknown> }));
  events.sort((a, b) => (orderBy === "seq" ? a.seq - b.seq : a.ts - b.ts || a.seq - b.seq));
  return events;
}

export async function recordSnapshot(
  db: Db,
  sessionId: number,
  code: string,
  label: string | undefined,
  language: string | undefined,
): Promise<TimelineEvent> {
  const s = await getSessionOrThrow(db, sessionId);
  const ts = Date.now();
  await appendEvent(db, sessionId, ts, "snapshot", { code, label: label ?? null, language: language ?? null });
  await db.update(sessions).set({ updatedAt: ts }).where(eq(sessions.id, sessionId));
  return { seq: 0, type: "snapshot", ts, payload: { code, label: label ?? null, language: language ?? null } };
}

export async function recordCopyOut(db: Db, sessionId: number, code: string, language?: string): Promise<void> {
  const ts = Date.now();
  await appendEvent(db, sessionId, ts, "copy_out", { code, language: language ?? null });
  await db.update(sessions).set({ updatedAt: ts }).where(eq(sessions.id, sessionId));
}

export async function saveNotes(db: Db, sessionId: number, body: string): Promise<void> {
  const s = await getSessionOrThrow(db, sessionId);
  const now = Date.now();
  const [existing] = await db.select().from(notes).where(eq(notes.sessionId, sessionId)).limit(1);
  if (existing) {
    await db.update(notes).set({ body, updatedAt: now }).where(eq(notes.id, existing.id));
  } else {
    await db.insert(notes).values({ sessionId, body, updatedAt: now });
  }
  await appendEvent(db, sessionId, now, "note_change", { size: body.length });
  await db.update(sessions).set({ updatedAt: now }).where(eq(sessions.id, sessionId));
}

export async function getNotes(db: Db, sessionId: number): Promise<string> {
  const [row] = await db.select().from(notes).where(eq(notes.sessionId, sessionId)).limit(1);
  return row?.body ?? "";
}

export interface SessionSummary {
  id: number;
  problem: { id: number; title: string; slug: string; difficulty: string; tags: string[] };
  startedAt: number;
  finishedAt: number | null;
  activeMs: number;
  status: SessionStatus;
  outcome: string | null;
  reviewRequestStatus: string | null;
  reviewCount: number;
  planItemId: number | null;
}

function outcomeFor(events: Array<{ type: string; payload: Record<string, unknown> }>): string | null {
  // Outcome reflects the latest LC submission verdict for the session.
  let outcome: string | null = null;
  for (const e of events) {
    if (e.type === "submission" && typeof e.payload.verdict === "string") {
      outcome = e.payload.verdict;
    }
  }
  return outcome;
}

export async function listSessions(
  db: Db,
  filters: {
    from?: number;
    to?: number;
    problemId?: number;
    difficulty?: string;
    tag?: string;
    outcome?: string;
    reviewStatus?: string;
    status?: SessionStatus;
  },
): Promise<SessionSummary[]> {
  const conditions = [];
  if (filters.from !== undefined) conditions.push(gte(sessions.startedAt, filters.from));
  if (filters.to !== undefined) conditions.push(lte(sessions.startedAt, filters.to));
  if (filters.problemId !== undefined) conditions.push(eq(sessions.problemId, filters.problemId));
  if (filters.difficulty) conditions.push(eq(problems.difficulty, filters.difficulty));
  if (filters.tag) conditions.push(sql`${problems.tags} LIKE ${`%"${filters.tag}"%`}`);

  let rows = await db
    .select({
      session: sessions,
      problem: problems,
    })
    .from(sessions)
    .innerJoin(problems, eq(sessions.problemId, problems.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sessions.startedAt));

  let result: SessionSummary[] = [];
  for (const { session: s, problem } of rows) {
    if (filters.status && sessionStatus(s) !== filters.status) continue;
    const events = await db
      .select({ type: sessionEvents.type, payload: sessionEvents.payload })
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, s.id));
    const outcome = outcomeFor(
      events.map((e) => ({ type: e.type, payload: JSON.parse(e.payload) as Record<string, unknown> })),
    );
    if (filters.outcome) {
      if (filters.outcome === "accepted" && outcome !== "Accepted") continue;
      if (filters.outcome === "wrong_answer" && outcome !== "Wrong Answer") continue;
      if (filters.outcome === "unsolved" && outcome === "Accepted") continue;
    }
    const [req] = await db
      .select()
      .from(reviewRequests)
      .where(eq(reviewRequests.sessionId, s.id))
      .limit(1);
    if (filters.reviewStatus) {
      if (filters.reviewStatus === "none" && req) continue;
      if (filters.reviewStatus === "pending" && req?.status !== "pending") continue;
      if (filters.reviewStatus === "in_progress" && req?.status !== "in_progress") continue;
      if (filters.reviewStatus === "completed" && req?.status !== "completed") continue;
    }
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reviews)
      .where(eq(reviews.sessionId, s.id));

    result.push({
      id: s.id,
      problem: {
        id: problem.id,
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
        tags: JSON.parse(problem.tags) as string[],
      },
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      activeMs: s.activeMs,
      status: sessionStatus(s),
      outcome,
      reviewRequestStatus: req?.status ?? null,
      reviewCount: Number(count),
      planItemId: s.planItemId ?? null,
    });
  }
  return result;
}

export interface PlanOrigin {
  planItemId: number;
  reason: string;
  planId: number;
  planCreatedAt: number;
}

export async function getPlanOrigin(db: Db, planItemId: number): Promise<PlanOrigin | null> {
  const [row] = await db
    .select({
      planItemId: planItems.id,
      reason: planItems.reasonMd,
      planId: plans.id,
      planCreatedAt: plans.createdAt,
    })
    .from(planItems)
    .innerJoin(plans, eq(planItems.planId, plans.id))
    .where(eq(planItems.id, planItemId))
    .limit(1);
  return row ?? null;
}

export async function getSessionDetail(db: Db, sessionId: number) {
  const s = await getSessionOrThrow(db, sessionId);
  const [problem] = await db.select().from(problems).where(eq(problems.id, s.problemId)).limit(1);
  const timeline = await getTimeline(db, sessionId, "ts");
  const notesBody = await getNotes(db, sessionId);
  const reviewRows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.sessionId, sessionId))
    .orderBy(desc(reviews.createdAt));
  const [req] = await db.select().from(reviewRequests).where(eq(reviewRequests.sessionId, sessionId)).limit(1);
  const planOrigin = s.planItemId !== null ? await getPlanOrigin(db, s.planItemId) : null;
  return {
    id: s.id,
    problem: problem
      ? { ...problem, tags: JSON.parse(problem.tags) as string[] }
      : null,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    activeMs: s.activeMs,
    runningSince: s.pausedAt === null && s.finishedAt === null ? s.lastResumedAt : null,
    status: sessionStatus(s),
    timeline,
    notes: notesBody,
    reviews: reviewRows,
    reviewRequestStatus: req?.status ?? null,
    planOrigin,
  };
}

export async function requestReview(db: Db, sessionId: number): Promise<void> {
  await getSessionOrThrow(db, sessionId);
  const now = Date.now();
  const [existing] = await db.select().from(reviewRequests).where(eq(reviewRequests.sessionId, sessionId)).limit(1);
  if (existing) {
    if (existing.status === "pending" || existing.status === "in_progress") return;
    await db
      .update(reviewRequests)
      .set({ status: "pending", requestedAt: now, updatedAt: now })
      .where(eq(reviewRequests.id, existing.id));
  } else {
    await db.insert(reviewRequests).values({ sessionId, status: "pending", requestedAt: now, updatedAt: now });
  }
}

export async function cancelReviewRequest(db: Db, sessionId: number): Promise<void> {
  const [existing] = await db.select().from(reviewRequests).where(eq(reviewRequests.sessionId, sessionId)).limit(1);
  if (existing && (existing.status === "pending" || existing.status === "in_progress")) {
    const now = Date.now();
    await db
      .update(reviewRequests)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(reviewRequests.id, existing.id));
  }
}

export type ReviewRequestStatus = "pending" | "in_progress" | "completed" | "cancelled";

export async function setReviewRequestStatus(db: Db, requestId: number, status: ReviewRequestStatus): Promise<void> {
  const [existing] = await db.select().from(reviewRequests).where(eq(reviewRequests.id, requestId)).limit(1);
  if (!existing) throw new Error(`Review request ${requestId} not found`);
  if (existing.status === "cancelled" || existing.status === "completed") {
    throw new Error(`Review request ${requestId} is already ${existing.status}`);
  }
  const now = Date.now();
  await db
    .update(reviewRequests)
    .set({ status, updatedAt: now })
    .where(eq(reviewRequests.id, requestId));
}

export async function completeReviewRequestForSession(db: Db, sessionId: number): Promise<void> {
  const [existing] = await db.select().from(reviewRequests).where(eq(reviewRequests.sessionId, sessionId)).limit(1);
  if (existing && (existing.status === "pending" || existing.status === "in_progress")) {
    const now = Date.now();
    await db
      .update(reviewRequests)
      .set({ status: "completed", updatedAt: now })
      .where(eq(reviewRequests.id, existing.id));
  }
}

export interface PendingReviewRequest {
  requestId: number;
  sessionId: number;
  status: string;
  requestedAt: number;
  problem: { id: number; title: string; slug: string; difficulty: string; tags: string[] };
  sessionStartedAt: number;
  sessionFinishedAt: number | null;
}

export async function listPendingReviewRequests(db: Db): Promise<PendingReviewRequest[]> {
  const rows = await db
    .select({ request: reviewRequests, session: sessions, problem: problems })
    .from(reviewRequests)
    .innerJoin(sessions, eq(reviewRequests.sessionId, sessions.id))
    .innerJoin(problems, eq(sessions.problemId, problems.id))
    .where(inArray(reviewRequests.status, ["pending", "in_progress"]));
  return rows.map(({ request, session, problem }) => ({
    requestId: request.id,
    sessionId: session.id,
    status: request.status,
    requestedAt: request.requestedAt,
    problem: {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      tags: JSON.parse(problem.tags) as string[],
    },
    sessionStartedAt: session.startedAt,
    sessionFinishedAt: session.finishedAt,
  }));
}

export interface DashboardData {
  totals: { sessions: number; solved: number; activeMs: number };
  daily: Array<{ date: string; attempts: number; solved: number; activeMs: number }>;
  topics: Array<{ topic: string; label: string; attempts: number; solved: number }>;
  plan: DashboardPlan | null;
  pastPlans: DashboardPlan[];
  /** The single unfinished (active/paused) session, newest first, if any. */
  activeSession: DashboardSession | null;
  /** The most recent finished sessions, newest first (max 5). */
  recentSessions: DashboardRecentSession[];
}

export interface DashboardSession {
  id: number;
  problem: { id: number; title: string; slug: string; difficulty: string };
  startedAt: number;
  activeMs: number;
  status: SessionStatus;
}

export interface DashboardRecentSession extends DashboardSession {
  finishedAt: number;
  outcome: string | null;
}

export interface DashboardPlan {
  id: number;
  createdAt: number;
  horizonDays: number;
  focus: string;
  notes: string | null;
  basedOn: number | null;
  items: DashboardPlanItem[];
}

export interface DashboardPlanItem {
  id: number;
  planId: number;
  problemId: number | null;
  lcId: number;
  slug: string;
  title: string;
  difficulty: string;
  reason: string;
  status: PlanItemStatus;
  carriedFrom: number | null;
  /** Curated topics the item's problem trains (id + label for chips). */
  topics: Array<{ id: string; label: string }>;
}

function utcDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export async function getDashboard(db: Db): Promise<DashboardData> {
  // One shared aggregation with the digest/roadmap (verdict-based accepted).
  const rows = await collectPracticedSessions(db);

  const dailyMap = new Map<string, { attempts: number; solved: number; activeMs: number }>();
  let totalSolved = 0;
  for (const row of rows) {
    if (row.accepted) totalSolved += 1;

    const day = utcDate(row.startedAt);
    const d = dailyMap.get(day) ?? { attempts: 0, solved: 0, activeMs: 0 };
    d.attempts += 1;
    if (row.accepted) d.solved += 1;
    d.activeMs += row.activeMs;
    dailyMap.set(day, d);
  }

  const daily = [...dailyMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topics = [...aggregateTopicStats(rows).entries()]
    .map(([topic, v]) => ({ topic, label: topicLabel(topic), attempts: v.attempts, solved: v.solved }))
    .sort((a, b) => b.attempts - a.attempts || a.topic.localeCompare(b.topic));

  const allPlans = await listPlans(db);
  const lcIds = [...new Set(allPlans.flatMap((p) => p.items.map((i) => i.lcId)))];
  const problemByLcId = new Map<number, { id: number; title: string; difficulty: string; tags: string[] }>();
  if (lcIds.length > 0) {
    const problemRows = await db
      .select({ id: problems.id, lcId: problems.lcId, title: problems.title, difficulty: problems.difficulty, tags: problems.tags })
      .from(problems)
      .where(inArray(problems.lcId, lcIds));
    for (const p of problemRows) {
      problemByLcId.set(p.lcId, { id: p.id, title: p.title, difficulty: p.difficulty, tags: JSON.parse(p.tags) as string[] });
    }
  }

  // Next up section: the unfinished session (newest first) and recent finished sessions.
  const toDashboardSession = (row: PracticedSessionRow): DashboardSession => ({
    id: row.sessionId,
    problem: { id: row.problemId, title: row.title, slug: row.slug, difficulty: row.difficulty },
    startedAt: row.startedAt,
    activeMs: row.activeMs,
    status: row.finishedAt !== null ? ("finished" as const) : row.pausedAt !== null ? ("paused" as const) : ("active" as const),
  });

  const unfinished = rows
    .filter((r) => r.finishedAt === null)
    .sort((a, b) => b.startedAt - a.startedAt);
  const activeSession = unfinished.length > 0 ? toDashboardSession(unfinished[0]!) : null;

  const finished = rows
    .filter((r) => r.finishedAt !== null)
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
    .slice(0, 5);
  const recentSessions: DashboardRecentSession[] = finished.map((row) => ({
    ...toDashboardSession(row),
    finishedAt: row.finishedAt!,
    outcome: row.outcome,
  }));


  const toDashboardPlan = (plan: (typeof allPlans)[number]): DashboardPlan => ({
    id: plan.id,
    createdAt: plan.createdAt,
    horizonDays: plan.horizonDays,
    focus: plan.focusMd,
    notes: plan.notesMd,
    basedOn: plan.basedOn,
    items: plan.items.map((item) => {
      const problem = problemByLcId.get(item.lcId);
      return {
        id: item.id,
        planId: item.planId,
        problemId: problem?.id ?? null,
        lcId: item.lcId,
        slug: item.slug,
        title: problem?.title ?? item.slug,
        difficulty: problem?.difficulty ?? "",
        reason: item.reasonMd,
        status: item.status,
        carriedFrom: item.carriedFrom,
        topics: problem ? topicsForTags(problem.tags).map((id) => ({ id, label: topicLabel(id) })) : [],
      };
    }),
  });

  return {
    totals: { sessions: rows.length, solved: totalSolved, activeMs: rows.reduce((acc, r) => acc + r.activeMs, 0) },
    daily,
    topics,
    plan: allPlans.length > 0 ? toDashboardPlan(allPlans[0]) : null,
    pastPlans: allPlans.slice(1).map(toDashboardPlan),
    activeSession,
    recentSessions,
  };
}
