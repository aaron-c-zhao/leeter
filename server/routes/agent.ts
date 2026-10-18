import { timingSafeEqual, createHash } from "node:crypto";
import { asc } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { problems, reviews } from "../db/schema.js";
import { serializeSessionLog } from "../logs/serialize.js";
import { createPlan, listPlans } from "../sessions/plans.js";
import { listSessions, getSessionDetail } from "../sessions/service.js";
import {
  setReviewRequestStatus,
  listPendingReviewRequests,
  completeReviewRequestForSession,
} from "../sessions/service.js";
import { putMemory, getMemory, listMemoryVersions } from "../memory/memory.js";
import { getProgressDigest } from "../memory/digest.js";

interface AgentDeps {
  db: Db;
  agentToken: string;
}

/** Constant-time bearer token comparison (length-normalized via hash). */
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function registerAgentRoutes(app: FastifyInstance, deps: AgentDeps) {
  const { db, agentToken } = deps;

  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.url.startsWith("/api/agent/")) return;
    const header = req.headers.authorization ?? "";
    const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (provided.length === 0 || !tokenMatches(provided, agentToken)) {
      return reply.code(401).send({ error: { message: "unauthorized" } });
    }
  });

  app.get("/api/agent/sessions", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const num = (v?: string) => (v !== undefined && v !== "" ? Number(v) : undefined);
    return listSessions(db, {
      from: num(q.from),
      to: num(q.to),
      problemId: num(q.problem_id),
      difficulty: q.difficulty,
      tag: q.tag,
      outcome: q.outcome,
      reviewStatus: q.review_status,
      status: q.status as "active" | "paused" | "finished" | undefined,
    });
  });

  app.get("/api/agent/plans", async () => {
    return (await listPlans(db)).map((p) => ({
      id: p.id,
      created_at: p.createdAt,
      horizon_days: p.horizonDays,
      focus: p.focusMd,
      notes: p.notesMd,
      based_on: p.basedOn,
      items: p.items.map((i) => ({
        id: i.id,
        lc_id: i.lcId,
        slug: i.slug,
        reason: i.reasonMd,
        status: i.status,
        carried_from: i.carriedFrom,
      })),
    }));
  });

  app.post("/api/agent/plans", async (req, reply) => {
    const schema = z
      .object({
        horizon_days: z.number().int().positive(),
        focus: z.string().refine((v) => v.trim().length > 0, { message: "focus must not be empty" }),
        notes: z.string().optional(),
        based_on: z.number().int().optional(),
        problems: z
          .array(
            z
              .object({
                lc_id: z.number().int(),
                slug: z.string(),
                reason: z.string(),
                carried_from: z.number().int().optional(),
              })
              .strict(),
          )
          .min(1),
      })
      .strict();

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          message: `invalid plan payload: ${parsed.error.issues
            .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
            .join("; ")}`,
        },
      });
    }
    const { horizon_days, focus, notes, based_on, problems: probs } = parsed.data;
    try {
      const plan = await createPlan(db, {
        horizonDays: horizon_days,
        focus,
        notes,
        basedOn: based_on,
        problems: probs.map((p) => ({
          lcId: p.lc_id,
          slug: p.slug,
          reason: p.reason,
          carriedFrom: p.carried_from,
        })),
      });
      return {
        id: plan.id,
        created_at: plan.createdAt,
        horizon_days: plan.horizonDays,
        focus: plan.focusMd,
        notes: plan.notesMd,
        based_on: plan.basedOn,
        items: plan.items.map((i) => ({
          id: i.id,
          lc_id: i.lcId,
          slug: i.slug,
          reason: i.reasonMd,
          status: i.status,
          carried_from: i.carriedFrom,
        })),
      };
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("Unknown problem lc_ids") ||
          err.message.includes("Unknown based_on") ||
          err.message.includes("Unknown carried_from"))
      ) {
        return reply.code(400).send({ error: { message: `invalid plan payload: ${err.message}` } });
      }
      throw err;
    }
  });

  app.get("/api/agent/progress", async () => {
    return getProgressDigest(db);
  });

  app.get("/api/agent/memory", async () => {
    const current = await getMemory(db);
    return current ?? { body: null, version_id: null, updated_at: null };
  });

  app.put("/api/agent/memory", async (req, reply) => {
    const schema = z.object({ body: z.string() }).strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          message: `invalid memory payload: ${parsed.error.issues
            .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
            .join("; ")}`,
        },
      });
    }
    try {
      const { versionId, size } = await putMemory(db, parsed.data.body);
      return { ok: true, version_id: versionId, size };
    } catch (err) {
      if (err instanceof Error && err.message.includes("exceeds")) {
        return reply.code(400).send({ error: { message: `invalid memory payload: ${err.message}` } });
      }
      throw err;
    }
  });

  app.get("/api/agent/memory/versions", async () => {
    return (await listMemoryVersions(db)).map((v) => ({
      id: v.id,
      size: v.size,
      created_at: v.createdAt,
      body: v.body,
    }));
  });

  app.get("/api/agent/problems", async () => {
    const rows = await db
      .select({
        id: problems.id,
        lcId: problems.lcId,
        title: problems.title,
        slug: problems.slug,
        difficulty: problems.difficulty,
        tags: problems.tags,
      })
      .from(problems)
      .orderBy(asc(problems.lcId));
    return rows.map((p) => ({
      id: p.id,
      lc_id: p.lcId,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      tags: JSON.parse(p.tags) as string[],
    }));
  });

  app.get("/api/agent/sessions/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: { message: "invalid session id" } });
    try {
      const detail = await getSessionDetail(db, id);
      const log = await serializeSessionLog(db, id);
      return {
        session: {
          id: detail.id,
          startedAt: detail.startedAt,
          finishedAt: detail.finishedAt,
          activeMs: detail.activeMs,
          status: detail.status,
          reviewRequestStatus: detail.reviewRequestStatus,
          notes: detail.notes,
          reviews: detail.reviews,
        },
        problem: detail.problem,
        log,
      };
    } catch (err) {
      return notFound(reply, err);
    }
  });

  app.get("/api/agent/sessions/:id/log", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: { message: "invalid session id" } });
    try {
      const jsonl = await serializeSessionLog(db, id);
      reply.header("Content-Type", "application/x-ndjson");
      return jsonl;
    } catch (err) {
      return notFound(reply, err);
    }
  });

  app.get("/api/agent/reviews/pending", async () => {
    return listPendingReviewRequests(db);
  });

  app.post("/api/agent/reviews/requests/:id/claim", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: { message: "invalid request id" } });
    try {
      await setReviewRequestStatus(db, id, "in_progress");
      return { ok: true };
    } catch (err) {
      return requestError(reply, err);
    }
  });

  app.post("/api/agent/reviews/requests/:id/complete", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: { message: "invalid request id" } });
    try {
      await setReviewRequestStatus(db, id, "completed");
      return { ok: true };
    } catch (err) {
      return requestError(reply, err);
    }
  });

  app.post("/api/agent/sessions/:id/reviews", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: { message: "invalid session id" } });

    const schema = z
      .object({
        observations: z.string(),
        strengths: z.string(),
        weaknesses: z.string(),
        recommended_focus: z.string(),
        overall: z.string().optional(),
      })
      .strict();

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          message: `invalid review payload: ${parsed.error.issues
            .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
            .join("; ")}`,
        },
      });
    }
    const { observations, strengths, weaknesses, recommended_focus, overall } = parsed.data;
    if (observations.trim() === "" && strengths.trim() === "" && weaknesses.trim() === "" && recommended_focus.trim() === "") {
      return reply.code(400).send({ error: { message: "invalid review payload: review content is empty" } });
    }

    try {
      // Validate the session exists first so a bad id stores nothing.
      await getSessionDetail(db, id);
      const now = Date.now();
      const [review] = await db
        .insert(reviews)
        .values({
          sessionId: id,
          observations,
          strengths,
          weaknesses,
          recommendedFocus: recommended_focus,
          overall: overall ?? null,
          createdAt: now,
        })
        .returning({ id: reviews.id });
      await completeReviewRequestForSession(db, id);
      return { ok: true, reviewId: review.id };
    } catch (err) {
      return notFound(reply, err);
    }
  });
}

function notFound(reply: FastifyReply, err: unknown) {
  if (err instanceof Error && err.message.includes("not found")) {
    return reply.code(404).send({ error: { message: err.message } });
  }
  throw err;
}

function requestError(reply: FastifyReply, err: unknown) {
  if (err instanceof Error && (err.message.includes("not found") || err.message.includes("already"))) {
    return reply.code(409).send({ error: { message: err.message } });
  }
  throw err;
}
