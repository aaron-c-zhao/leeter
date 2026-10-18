import type { Db } from "../db/client.js";
import { problems, sessions, submissions } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { getCurrentPlan } from "../sessions/plans.js";
import { TAXONOMY_VERSION, OTHER_TOPIC, topicsForTags } from "../knowledge/taxonomy.js";

/*
 * Objective progress digest for planning runs (design D1/D2): per-topic
 * aggregates keyed by the curated taxonomy node ids (the single grouping
 * authority shared with the roadmap tree), plus adherence rollups for the
 * current plan. Topic keys are stable; the `other` bucket is kept.
 */

export { topicsForTags, OTHER_TOPIC };

export interface DigestTopic {
  topic: string;
  attempts: number;
  solved: number;
  solve_rate: number;
  last_practiced_at: number | null;
}

export interface DigestPlan {
  id: number;
  created_at: number;
  horizon_days: number;
  solved: number;
  practiced: number;
  not_started: number;
  carried_unsolved: Array<{ item_id: number; carried_from: number; slug: string; status: string }>;
}

export interface ProgressDigest {
  totals: { attempts: number; solved: number };
  topics: DigestTopic[];
  current_plan: DigestPlan | null;
  /** Version of the curated taxonomy that produced the topic keys (D6). */
  taxonomy_version: number;
}

/* ---------- Shared session aggregation (knowledge-tree D3) ----------
 * One query + one grouping used by both the digest and the roadmap tree so
 * they cannot diverge.
 */

export interface PracticedSessionRow {
  sessionId: number;
  problemId: number;
  title: string;
  slug: string;
  difficulty: string;
  tags: string[];
  startedAt: number;
  finishedAt: number | null;
  pausedAt: number | null;
  activeMs: number;
  /** Verdict-based: the session has at least one `Accepted` submission. */
  accepted: boolean;
  /** Latest submission verdict for the session, if any. */
  outcome: string | null;
}

export interface TopicStats {
  attempts: number;
  solved: number;
  last: number;
}

/** Every recorded practice session joined with its problem, submissions folded in. */
export async function collectPracticedSessions(db: Db): Promise<PracticedSessionRow[]> {
  const rows = await db
    .select({ session: sessions, problem: problems })
    .from(sessions)
    .innerJoin(problems, eq(sessions.problemId, problems.id));
  if (rows.length === 0) return [];

  const subRows = await db
    .select({ sessionId: submissions.sessionId, verdict: submissions.verdict, submittedAt: submissions.submittedAt })
    .from(submissions)
    .where(inArray(submissions.sessionId, rows.map((r) => r.session.id)));
  const acceptedSessions = new Set<number>();
  const latestVerdict = new Map<number, { verdict: string; at: number }>();
  for (const s of subRows) {
    if (s.sessionId === null) continue;
    if (s.verdict === "Accepted") acceptedSessions.add(s.sessionId);
    const prev = latestVerdict.get(s.sessionId);
    if (!prev || s.submittedAt >= prev.at) latestVerdict.set(s.sessionId, { verdict: s.verdict, at: s.submittedAt });
  }

  return rows.map(({ session: s, problem }) => ({
    sessionId: s.id,
    problemId: problem.id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
    tags: JSON.parse(problem.tags) as string[],
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    pausedAt: s.pausedAt,
    activeMs: s.activeMs,
    accepted: acceptedSessions.has(s.id),
    outcome: latestVerdict.get(s.id)?.verdict ?? null,
  }));
}

/** Per-topic aggregates grouped by the curated taxonomy (multi-node membership kept). */
export function aggregateTopicStats(rows: PracticedSessionRow[]): Map<string, TopicStats> {
  const topics = new Map<string, TopicStats>();
  for (const row of rows) {
    for (const topic of topicsForTags(row.tags)) {
      const t = topics.get(topic) ?? { attempts: 0, solved: 0, last: 0 };
      t.attempts += 1;
      if (row.accepted) t.solved += 1;
      t.last = Math.max(t.last, row.startedAt);
      topics.set(topic, t);
    }
  }
  return topics;
}

export async function getProgressDigest(db: Db): Promise<ProgressDigest> {
  const rows = await collectPracticedSessions(db);
  const topics = aggregateTopicStats(rows);
  let totalSolved = 0;
  for (const row of rows) if (row.accepted) totalSolved += 1;

  const digestTopics: DigestTopic[] = [...topics.entries()]
    .map(([topic, v]) => ({
      topic,
      attempts: v.attempts,
      solved: v.solved,
      solve_rate: v.attempts > 0 ? Math.round((v.solved / v.attempts) * 100) / 100 : 0,
      last_practiced_at: v.last > 0 ? v.last : null,
    }))
    .sort((a, b) => b.attempts - a.attempts || a.topic.localeCompare(b.topic));

  const current = await getCurrentPlan(db);
  let currentPlan: DigestPlan | null = null;
  if (current) {
    const carriedUnsolved = current.items
      .filter((i) => i.carriedFrom !== null && i.status !== "solved")
      .map((i) => ({ item_id: i.id, carried_from: i.carriedFrom!, slug: i.slug, status: i.status }));
    currentPlan = {
      id: current.id,
      created_at: current.createdAt,
      horizon_days: current.horizonDays,
      solved: current.items.filter((i) => i.status === "solved").length,
      practiced: current.items.filter((i) => i.status === "practiced").length,
      not_started: current.items.filter((i) => i.status === "not_started").length,
      carried_unsolved: carriedUnsolved,
    };
  }

  return {
    totals: { attempts: rows.length, solved: totalSolved },
    topics: digestTopics,
    current_plan: currentPlan,
    taxonomy_version: TAXONOMY_VERSION,
  };
}
