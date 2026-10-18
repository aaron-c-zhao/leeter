import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { problems, sessions, sessionEvents } from "../db/schema.js";
import { getSessionOrThrow, sessionStatus } from "../sessions/service.js";

export const LOG_SCHEMA_VERSION = 1;

export interface SessionLogHeader {
  schema_version: number;
  kind: "header";
  session_id: number;
  problem: {
    lc_id: number;
    title: string;
    slug: string;
    difficulty: string;
    tags: string[];
  };
  started_at: number;
  finished_at: number | null;
  active_ms: number;
  status: "active" | "paused" | "finished";
}

export interface SessionLogEvent {
  kind: "event";
  seq: number;
  type: string;
  offset_ms: number;
  ts: number;
  payload: Record<string, unknown>;
}

/**
 * Stamp the session's log schema version on first serialization. Once set it
 * is never changed, so logs written under an older schema version keep their
 * original marker (design D3, spec: Schema evolution).
 */
async function ensureLogVersion(db: Db, sessionId: number): Promise<number> {
  const s = await getSessionOrThrow(db, sessionId);
  if (s.logVersion !== null) return s.logVersion;
  await db.update(sessions).set({ logVersion: LOG_SCHEMA_VERSION }).where(eq(sessions.id, sessionId));
  return LOG_SCHEMA_VERSION;
}

export async function serializeSessionLog(db: Db, sessionId: number): Promise<string> {
  const s = await getSessionOrThrow(db, sessionId);
  const [problem] = await db.select().from(problems).where(eq(problems.id, s.problemId)).limit(1);
  const version = await ensureLogVersion(db, sessionId);

  const header: SessionLogHeader = {
    schema_version: version,
    kind: "header",
    session_id: s.id,
    problem: {
      lc_id: problem?.lcId ?? 0,
      title: problem?.title ?? "",
      slug: problem?.slug ?? "",
      difficulty: problem?.difficulty ?? "",
      tags: problem ? (JSON.parse(problem.tags) as string[]) : [],
    },
    started_at: s.startedAt,
    finished_at: s.finishedAt,
    active_ms: s.activeMs,
    status: sessionStatus(s),
  };

  const rows = await db
    .select()
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId));

  const events: SessionLogEvent[] = rows
    .map((r) => ({
      kind: "event" as const,
      seq: r.seq,
      type: r.type,
      offset_ms: r.ts - s.startedAt,
      ts: r.ts,
      payload: JSON.parse(r.payload) as Record<string, unknown>,
    }))
    .sort((a, b) => a.seq - b.seq);

  return [JSON.stringify(header), ...events.map((e) => JSON.stringify(e))].join("\n");
}
