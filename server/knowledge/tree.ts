import type { Db } from "../db/client.js";
import { problems } from "../db/schema.js";
import { inArray } from "drizzle-orm";
import { getCurrentPlan, type PlanItemStatus } from "../sessions/plans.js";
import {
  OTHER_TOPIC,
  TAXONOMY_DOMAINS,
  TAXONOMY_VERSION,
  TOPIC_NODES,
  topicsForTags,
  type TopicNode,
} from "./taxonomy.js";
import {
  aggregateTopicStats,
  collectPracticedSessions,
  type PracticedSessionRow,
} from "../memory/digest.js";

/*
 * Roadmap tree service (knowledge-tree D3/D4/D5): the curated taxonomy in
 * roadmap order, each node enriched with mastery aggregates and the
 * current-plan frontier, plus a capped drill-down of recently practiced
 * problems. Reuses the digest's session aggregation — no second path.
 */

/** Drill-down cap per node (design D5 placeholder). */
const RECENT_LIMIT = 10;

export interface RoadmapDrillItem {
  sessionId: number;
  title: string;
  slug: string;
  difficulty: string;
  outcome: string | null;
  practicedAt: number;
}

export interface RoadmapFrontierItem {
  itemId: number;
  /** Internal problem id — what a Start action posts. Null if the bank row vanished. */
  problemId: number | null;
  title: string;
  slug: string;
  difficulty: string;
  status: PlanItemStatus;
  carriedFrom: number | null;
}

export interface RoadmapTopic {
  id: string;
  label: string;
  attempts: number;
  solved: number;
  /** Fraction 0..1, like the digest's solve_rate. */
  solveRate: number;
  lastPracticedAt: number | null;
  frontier: RoadmapFrontierItem[];
  recent: RoadmapDrillItem[];
}

export interface RoadmapDomain {
  id: string;
  label: string;
  topics: RoadmapTopic[];
}

export interface RoadmapTree {
  taxonomyVersion: number;
  domains: RoadmapDomain[];
}

/** The explicit bucket, appended so unmapped practice is never omitted. */
const OTHER_NODE: TopicNode = {
  id: OTHER_TOPIC,
  label: "Other",
  domain: "other",
  tags: [],
  order: TOPIC_NODES.length + 1,
};

export async function getRoadmapTree(db: Db): Promise<RoadmapTree> {
  const rows = await collectPracticedSessions(db);
  const stats = aggregateTopicStats(rows);

  const recentByTopic = new Map<string, PracticedSessionRow[]>();
  for (const row of rows) {
    for (const topic of topicsForTags(row.tags)) {
      const list = recentByTopic.get(topic) ?? [];
      list.push(row);
      recentByTopic.set(topic, list);
    }
  }

  // Frontier: current-plan items mapped to nodes through their problem tags.
  const frontierByTopic = new Map<string, RoadmapFrontierItem[]>();
  const current = await getCurrentPlan(db);
  if (current && current.items.length > 0) {
    const lcIds = [...new Set(current.items.map((i) => i.lcId))];
    const probRows = await db.select().from(problems).where(inArray(problems.lcId, lcIds));
    const byLcId = new Map(probRows.map((p) => [p.lcId, p]));
    for (const item of current.items) {
      const problem = byLcId.get(item.lcId);
      const topics = problem ? topicsForTags(JSON.parse(problem.tags) as string[]) : [OTHER_TOPIC];
      for (const topic of topics) {
        const list = frontierByTopic.get(topic) ?? [];
        list.push({
          itemId: item.id,
          problemId: problem?.id ?? null,
          title: problem?.title ?? item.slug,
          slug: item.slug,
          difficulty: problem?.difficulty ?? "",
          status: item.status,
          carriedFrom: item.carriedFrom,
        });
        frontierByTopic.set(topic, list);
      }
    }
  }

  const topicFor = (node: TopicNode): RoadmapTopic => {
    const s = stats.get(node.id);
    const attempts = s?.attempts ?? 0;
    const solved = s?.solved ?? 0;
    const recent = (recentByTopic.get(node.id) ?? [])
      .slice()
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, RECENT_LIMIT)
      .map((r) => ({
        sessionId: r.sessionId,
        title: r.title,
        slug: r.slug,
        difficulty: r.difficulty,
        outcome: r.outcome,
        practicedAt: r.startedAt,
      }));
    return {
      id: node.id,
      label: node.label,
      attempts,
      solved,
      solveRate: attempts > 0 ? Math.round((solved / attempts) * 100) / 100 : 0,
      lastPracticedAt: s && s.last > 0 ? s.last : null,
      frontier: frontierByTopic.get(node.id) ?? [],
      recent,
    };
  };

  const domains: RoadmapDomain[] = TAXONOMY_DOMAINS.map((d) => ({
    id: d.id,
    label: d.label,
    topics: d.topics.map(topicFor),
  }));
  domains.push({ id: OTHER_NODE.domain, label: OTHER_NODE.label, topics: [topicFor(OTHER_NODE)] });

  return { taxonomyVersion: TAXONOMY_VERSION, domains };
}
