import { and, asc, eq, like, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { problems } from "../db/schema.js";
import { LcError, type LcClient } from "../lc/client.js";
import { lcErrorToHttp, syncBank, syncProblemDetail, syncSubmissions, enrichBankDetails } from "../lc/sync.js";
import { startSession, listSessions, getSessionDetail, pauseSession, resumeSession, finishSession, recordSnapshot, recordCopyOut, saveNotes, getNotes, requestReview, cancelReviewRequest, getDashboard } from "../sessions/service.js";
import { getRoadmapTree } from "../knowledge/tree.js";
import { serializeSessionLog } from "../logs/serialize.js";

interface UiDeps {
  db: Db;
  lcClient: LcClient;
}

function lcFailure(reply: FastifyReply, err: unknown) {
  if (err instanceof LcError) {
    const { status, body } = lcErrorToHttp(err);
    return reply.code(status).send(body);
  }
  throw err;
}

export function registerUiRoutes(app: FastifyInstance, deps: UiDeps) {
  const { db, lcClient } = deps;

  app.get("/api/ui/problems", async (req) => {
    const q = req.query as {
      q?: string;
      difficulty?: string;
      tag?: string;
      limit?: string;
      offset?: string;
    };
    const limit = Math.min(Number(q?.limit ?? 50) || 50, 200);
    const offset = Number(q?.offset ?? 0) || 0;

    const filters = [];
    if (q.q) filters.push(sql`(${problems.title} LIKE ${`%${q.q}%`} OR ${problems.slug} LIKE ${`%${q.q}%`})`);
    if (q?.difficulty) filters.push(eq(problems.difficulty, q.difficulty));
    if (q?.tag) filters.push(like(problems.tags, `%"${q.tag}"%`));

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const rows = await db
      .select()
      .from(problems)
      .where(whereClause)
      .orderBy(asc(problems.lcId))
      .limit(limit)
      .offset(offset);
    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(problems)
      .where(whereClause);

    return {
      total: Number(total),
      problems: rows.map((p) => ({
        id: p.id,
        lcId: p.lcId,
        title: p.title,
        slug: p.slug,
        difficulty: p.difficulty,
        tags: JSON.parse(p.tags) as string[],
        hasDescription: p.description.length > 0,
      })),
    };
  });

  app.post("/api/ui/sync/bank", async (_req, reply) => {
    try {
      const result = await syncBank(db, lcClient);
      void enrichBankDetails(db, lcClient);
      return result;
    } catch (err) {
      return lcFailure(reply, err);
    }
  });

  app.post("/api/ui/sync/submissions", async (req, reply) => {
    const parsed = z.object({ problemId: z.number().int() }).safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: "body must be {problemId: number}" } });
    }
    try {
      return await syncSubmissions(db, lcClient, parsed.data.problemId);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return reply.code(404).send({ error: { message: err.message } });
      }
      return lcFailure(reply, err);
    }
  });

  app.post("/api/ui/sessions", async (req, reply) => {
    const parsed = z
      .object({ problemId: z.number().int(), planItemId: z.number().int().optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: "body must be {problemId: number, planItemId?: number}" } });
    }
    try {
      await syncProblemDetail(db, lcClient, parsed.data.problemId);
    } catch {
      // Best effort; offline start must still work.
    }
    try {
      const sessionId = await startSession(db, parsed.data.problemId, parsed.data.planItemId);
      return { sessionId };
    } catch (err) {
      if (err instanceof Error && err.message.includes("Plan item") && err.message.includes("not found")) {
        return reply.code(400).send({ error: { message: err.message } });
      }
      throw err;
    }
  });

  app.get("/api/ui/sessions", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const num = (v?: string) => (v !== undefined && v !== "" ? Number(v) : undefined);
    return listSessions(db, {
      from: num(q.from),
      to: num(q.to),
      problemId: num(q.problemId),
      difficulty: q.difficulty,
      tag: q.tag,
      outcome: q.outcome,
      reviewStatus: q.reviewStatus,
      status: q.status as "active" | "paused" | "finished" | undefined,
    });
  });

  app.get("/api/ui/sessions/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: { message: "invalid session id" } });
    try {
      return await getSessionDetail(db, id);
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.post("/api/ui/sessions/:id/pause", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await pauseSession(db, Number(id));
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.post("/api/ui/sessions/:id/resume", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await resumeSession(db, Number(id));
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.post("/api/ui/sessions/:id/finish", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await finishSession(db, Number(id));
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.post("/api/ui/sessions/:id/snapshots", async (req, reply) => {
    const parsed = z
      .object({
        code: z.string(),
        label: z.string().optional(),
        language: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: "body must be {code: string, label?: string, language?: string}" } });
    }
    try {
      await recordSnapshot(db, Number((req.params as { id: string }).id), parsed.data.code, parsed.data.label, parsed.data.language);
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.post("/api/ui/sessions/:id/copy-out", async (req, reply) => {
    const parsed = z
      .object({ code: z.string(), language: z.string().optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: "body must be {code: string, language?: string}" } });
    }
    try {
      await recordCopyOut(db, Number((req.params as { id: string }).id), parsed.data.code, parsed.data.language);
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.get("/api/ui/dashboard", async () => {
    return getDashboard(db);
  });

  // Pure local reads — never triggers a LeetCode sync.
  app.get("/api/ui/roadmap", async () => {
    return getRoadmapTree(db);
  });

  app.post("/api/ui/sessions/:id/review-request", async (req, reply) => {
    try {
      await requestReview(db, Number((req.params as { id: string }).id));
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.delete("/api/ui/sessions/:id/review-request", async (req, reply) => {
    try {
      await cancelReviewRequest(db, Number((req.params as { id: string }).id));
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.get("/api/ui/sessions/:id/log", async (req, reply) => {
    try {
      const jsonl = await serializeSessionLog(db, Number((req.params as { id: string }).id));
      reply.header("Content-Type", "application/x-ndjson");
      return jsonl;
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.get("/api/ui/sessions/:id/notes", async (req, reply) => {
    try {
      return { body: await getNotes(db, Number((req.params as { id: string }).id)) };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });

  app.put("/api/ui/sessions/:id/notes", async (req, reply) => {
    const parsed = z.object({ body: z.string() }).safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: "body must be {body: string}" } });
    }
    try {
      await saveNotes(db, Number((req.params as { id: string }).id), parsed.data.body);
      return { ok: true };
    } catch (err) {
      return sessionNotFound(reply, err);
    }
  });
}

function sessionNotFound(reply: FastifyReply, err: unknown) {
  if (err instanceof Error && err.message.includes("not found")) {
    return reply.code(404).send({ error: { message: err.message } });
  }
  throw err;
}

