import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { createApp, type AppHandle } from "../server/app";
import type { Config } from "../server/config";
import { planItems, problems, sessions } from "../server/db/schema";
import { createPlan } from "../server/sessions/plans";
import { startSession } from "../server/sessions/service";
import type { Db } from "../server/db/client";

const TOKEN = "test-agent-token-abcdef";

let handle: AppHandle;
let db: Db;

function makeConfig(): Config {
  const dir = mkdtempSync(path.join(tmpdir(), "leeter-ui-sessions-"));
  return {
    port: 0,
    dataDir: dir,
    dbPath: path.join(dir, "test.db"),
    webDist: path.join(dir, "no-web"),
    leetcodeSession: "",
    csrfToken: "",
    agentToken: TOKEN,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("network disabled in tests");
    }),
  );
  handle = createApp(makeConfig());
  db = handle.db;
  vi.setSystemTime(0);
});

afterEach(() => {
  handle.close();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function seedProblem(lcId: number, slug: string): Promise<number> {
  const [p] = await db
    .insert(problems)
    .values({
      lcId,
      title: `Title ${slug}`,
      slug,
      difficulty: "Easy",
      tags: "[]",
      description: "",
      fetchedAt: Date.now(),
    })
    .returning({ id: problems.id });
  return p.id;
}

describe("POST /api/ui/sessions with planItemId (3.1)", () => {
  it("records provenance when planItemId is provided", async () => {
    const problemId = await seedProblem(1, "two-sum");
    const [problem] = await db.select().from(problems).where(eq(problems.id, problemId));
    const plan = await createPlan(db, {
      horizonDays: 7,
      focus: "arrays",
      problems: [{ lcId: problem!.lcId, slug: "two-sum", reason: "warm-up" }],
    });
    const [item] = plan.items;

    const res = await handle.app.inject({
      method: "POST",
      url: "/api/ui/sessions",
      payload: { problemId, planItemId: item.id },
    });
    expect(res.statusCode).toBe(200);

    const [s] = await db.select().from(sessions);
    expect(s.planItemId).toBe(item.id);
  });

  it("rejects an unknown plan item id with 400 and stores nothing", async () => {
    const problemId = await seedProblem(1, "two-sum");
    const res = await handle.app.inject({
      method: "POST",
      url: "/api/ui/sessions",
      payload: { problemId, planItemId: 9999 },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { message: string } };
    expect(body.error.message).toContain("9999");
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("creates an unlinked session when planItemId is absent", async () => {
    const problemId = await seedProblem(1, "two-sum");
    const res = await handle.app.inject({
      method: "POST",
      url: "/api/ui/sessions",
      payload: { problemId },
    });
    expect(res.statusCode).toBe(200);
    const [s] = await db.select().from(sessions);
    expect(s.planItemId).toBeNull();
  });

  it("rejects a non-integer planItemId with 400", async () => {
    const problemId = await seedProblem(1, "two-sum");
    const res = await handle.app.inject({
      method: "POST",
      url: "/api/ui/sessions",
      payload: { problemId, planItemId: "abc" },
    });
    expect(res.statusCode).toBe(400);
    expect(await db.select().from(sessions)).toHaveLength(0);
  });
});

describe("session detail plan provenance (3.2)", () => {
  it("includes planItemId, reason, plan id and plan creation date when linked", async () => {
    vi.setSystemTime(1000);
    const problemId = await seedProblem(1, "two-sum");
    const [problem] = await db.select().from(problems).where(eq(problems.id, problemId));
    const plan = await createPlan(db, {
      horizonDays: 7,
      focus: "arrays",
      problems: [{ lcId: problem!.lcId, slug: "two-sum", reason: "warm-up" }],
    });
    const [item] = plan.items;

    const sessionId = await startSession(db, problemId, item!.id);
    const res = await handle.app.inject({ method: "GET", url: `/api/ui/sessions/${sessionId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { planOrigin: { planItemId: number; reason: string; planId: number; planCreatedAt: number } };
    expect(body.planOrigin).toEqual({
      planItemId: item!.id,
      reason: "warm-up",
      planId: plan.id,
      planCreatedAt: 1000,
    });
  });

  it("has null plan origin for unlinked sessions", async () => {
    vi.setSystemTime(1000);
    const problemId = await seedProblem(1, "two-sum");
    const sessionId = await startSession(db, problemId);
    const res = await handle.app.inject({ method: "GET", url: `/api/ui/sessions/${sessionId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { planOrigin: unknown };
    expect(body.planOrigin).toBeNull();
  });
});
