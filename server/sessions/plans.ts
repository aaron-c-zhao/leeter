import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { planItems, plans, problems, sessions, submissions } from "../db/schema.js";

export type PlanItemStatus = "solved" | "practiced" | "not_started";

export interface PlanProblemInput {
  lcId: number;
  slug: string;
  reason: string;
  /** Optional id of an earlier plan item this item continues. */
  carriedFrom?: number;
}

export interface CreatePlanInput {
  horizonDays: number;
  focus: string;
  notes?: string;
  problems: PlanProblemInput[];
  /** Optional id of the earlier plan this plan revises. */
  basedOn?: number;
}

export interface PlanItem {
  id: number;
  planId: number;
  lcId: number;
  slug: string;
  reasonMd: string;
  status: PlanItemStatus;
  carriedFrom: number | null;
}

export interface Plan {
  id: number;
  createdAt: number;
  horizonDays: number;
  focusMd: string;
  notesMd: string | null;
  basedOn: number | null;
  items: PlanItem[];
}

export async function createPlan(db: Db, input: CreatePlanInput): Promise<Plan> {
  if (!Number.isInteger(input.horizonDays) || input.horizonDays <= 0) {
    throw new Error("horizon_days must be a positive integer");
  }
  if (typeof input.focus !== "string" || input.focus.trim() === "") {
    throw new Error("focus must be a non-empty string");
  }
  if (!Array.isArray(input.problems) || input.problems.length === 0) {
    throw new Error("at least one problem is required");
  }
  const lcIds = [...new Set(input.problems.map((p) => p.lcId))];
  const known = await db
    .select({ lcId: problems.lcId })
    .from(problems)
    .where(inArray(problems.lcId, lcIds));
  const knownIds = new Set(known.map((k) => k.lcId));
  const unknown = lcIds.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown problem lc_ids: ${unknown.join(", ")}`);
  }

  // Chaining references must exist and point backwards: the referenced plan
  // predates this one and the carried item belongs to some earlier plan.
  if (input.basedOn !== undefined) {
    if (!Number.isInteger(input.basedOn)) {
      throw new Error("based_on must be an integer plan id");
    }
    const [ref] = await db.select({ id: plans.id }).from(plans).where(eq(plans.id, input.basedOn)).limit(1);
    if (!ref) throw new Error(`Unknown based_on plan id: ${input.basedOn}`);
  }
  const carriedIds = input.problems
    .map((p) => p.carriedFrom)
    .filter((id): id is number => id !== undefined);
  if (carriedIds.length > 0) {
    for (const id of carriedIds) {
      if (!Number.isInteger(id)) throw new Error("carried_from must be an integer plan item id");
    }
    const refs = await db
      .select({ id: planItems.id })
      .from(planItems)
      .where(inArray(planItems.id, [...new Set(carriedIds)]));
    const knownRefs = new Set(refs.map((r) => r.id));
    const missing = [...new Set(carriedIds)].filter((id) => !knownRefs.has(id));
    if (missing.length > 0) {
      throw new Error(`Unknown carried_from plan item ids: ${missing.join(", ")}`);
    }
  }

  const now = Date.now();
  return db.transaction((tx) => {
    const plan = tx
      .insert(plans)
      .values({
        createdAt: now,
        horizonDays: input.horizonDays,
        focusMd: input.focus,
        notesMd: input.notes ?? null,
        basedOn: input.basedOn ?? null,
      })
      .returning()
      .get();
    const itemRows = tx
      .insert(planItems)
      .values(
        input.problems.map((p) => ({
          planId: plan.id,
          lcId: p.lcId,
          slug: p.slug,
          reasonMd: p.reason,
          carriedFrom: p.carriedFrom ?? null,
        })),
      )
      .returning()
      .all();
    return {
      id: plan.id,
      createdAt: plan.createdAt,
      horizonDays: plan.horizonDays,
      focusMd: plan.focusMd,
      notesMd: plan.notesMd,
      basedOn: plan.basedOn ?? null,
      items: itemRows.map((item) => ({
        id: item.id,
        planId: item.planId,
        lcId: item.lcId,
        slug: item.slug,
        reasonMd: item.reasonMd,
        status: "not_started" as const,
        carriedFrom: item.carriedFrom ?? null,
      })),
    };
  });
}

async function decorateWithItems(db: Db, planRows: Array<typeof plans.$inferSelect>): Promise<Plan[]> {
  if (planRows.length === 0) return [];
  const itemRows = await db
    .select()
    .from(planItems)
    .where(inArray(planItems.planId, planRows.map((p) => p.id)))
    .orderBy(asc(planItems.id));

  const itemIds = itemRows.map((i) => i.id);
  const linkedCounts = new Map<number, number>();
  const acceptedCounts = new Map<number, number>();
  if (itemIds.length > 0) {
    const links = await db
      .select({ planItemId: sql<number>`${sessions.planItemId}`, count: sql<number>`COUNT(*)` })
      .from(sessions)
      .where(and(isNotNull(sessions.planItemId), sql`${sessions.planItemId} IN ${itemIds}`))
      .groupBy(sessions.planItemId);
    for (const l of links) linkedCounts.set(Number(l.planItemId), Number(l.count));

    const accepted = await db
      .select({ planItemId: sql<number>`${sessions.planItemId}`, count: sql<number>`COUNT(*)` })
      .from(sessions)
      .innerJoin(submissions, eq(submissions.sessionId, sessions.id))
      .where(
        and(
          isNotNull(sessions.planItemId),
          sql`${sessions.planItemId} IN ${itemIds}`,
          inArray(submissions.verdict, ["Accepted"]),
        ),
      )
      .groupBy(sessions.planItemId);
    for (const a of accepted) acceptedCounts.set(Number(a.planItemId), Number(a.count));
  }

  const byPlan = new Map<number, PlanItem[]>();
  for (const item of itemRows) {
    const linked = linkedCounts.get(item.id) ?? 0;
    const acceptedCount = acceptedCounts.get(item.id) ?? 0;
    const status: PlanItemStatus = acceptedCount > 0 ? "solved" : linked > 0 ? "practiced" : "not_started";
    const list = byPlan.get(item.planId) ?? [];
    list.push({
      id: item.id,
      planId: item.planId,
      lcId: item.lcId,
      slug: item.slug,
      reasonMd: item.reasonMd,
      status,
      carriedFrom: item.carriedFrom ?? null,
    });
    byPlan.set(item.planId, list);
  }

  return planRows.map((p) => ({
    id: p.id,
    createdAt: p.createdAt,
    horizonDays: p.horizonDays,
    focusMd: p.focusMd,
    notesMd: p.notesMd,
    basedOn: p.basedOn ?? null,
    items: byPlan.get(p.id) ?? [],
  }));
}

export async function listPlans(db: Db): Promise<Plan[]> {
  const planRows = await db.select().from(plans).orderBy(desc(plans.createdAt), desc(plans.id));
  return decorateWithItems(db, planRows);
}

export async function getCurrentPlan(db: Db): Promise<Plan | null> {
  const [planRow] = await db.select().from(plans).orderBy(desc(plans.createdAt), desc(plans.id)).limit(1);
  if (!planRow) return null;
  const [plan] = await decorateWithItems(db, [planRow]);
  return plan;
}
