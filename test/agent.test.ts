import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { createApp, type AppHandle } from "../server/app";
import type { Config } from "../server/config";
import { planItems, plans, problems } from "../server/db/schema";
import { requestReview, startSession, cancelReviewRequest, recordSnapshot } from "../server/sessions/service";
import { createPlan } from "../server/sessions/plans";
import { appendEvent } from "../server/lc/sync";
import type { Db } from "../server/db/client";

const TOKEN = "test-agent-token-abcdef";
const auth = { authorization: `Bearer ${TOKEN}` };

let handle: AppHandle;
let db: Db;

function makeConfig(): Config {
  const dir = mkdtempSync(path.join(tmpdir(), "leeter-agent-"));
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
  handle = createApp(makeConfig());
  db = handle.db;
  vi.setSystemTime(0);
});

afterEach(() => {
  handle.close();
  vi.useRealTimers();
});

let nextLcId = 1000;

async function seedProblem(slug: string): Promise<number> {
  const [p] = await db
    .insert(problems)
    .values({
      lcId: nextLcId++,
      title: `Title ${slug}`,
      slug,
      difficulty: "Easy",
      tags: '["array"]',
      description: "<p>problem description</p>",
      fetchedAt: Date.now(),
    })
    .returning({ id: problems.id, lcId: problems.lcId });
  return p.id;
}

function planBody(lcId: number, slug: string) {
  return {
    horizon_days: 14,
    focus: "Focus on arrays",
    notes: "some notes",
    problems: [{ lc_id: lcId, slug, reason: "warm-up" }],
  };
}

describe("agent plans + problems api (2.1-2.4)", () => {
  it("requires auth for the plans and problems endpoints", async () => {
    for (const [method, url] of [
      ["GET", "/api/agent/plans"],
      ["POST", "/api/agent/plans"],
      ["GET", "/api/agent/problems"],
    ] as const) {
      const none = await handle.app.inject({ method, url });
      expect(none.statusCode).toBe(401);
      const wrong = await handle.app.inject({ method, url, headers: { authorization: "Bearer wrong" } });
      expect(wrong.statusCode).toBe(401);
    }
  });

  it("creates a plan and returns it with snake_case fields", async () => {
    const [p] = await db.insert(problems).values(await seedProblemRow("two-sum")).returning();
    const res = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: planBody(p.lcId, "two-sum"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      id: number;
      created_at: number;
      horizon_days: number;
      focus: string;
      notes: string | null;
      items: Array<{ id: number; lc_id: number; slug: string; reason: string; status: string }>;
    };
    expect(body.id).toBeGreaterThan(0);
    expect(body.horizon_days).toBe(14);
    expect(body.focus).toBe("Focus on arrays");
    expect(body.notes).toBe("some notes");
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      lc_id: p.lcId,
      slug: "two-sum",
      reason: "warm-up",
      status: "not_started",
    });

    const storedPlans = await db.select().from(plans);
    expect(storedPlans).toHaveLength(1);
    const storedItems = await db.select().from(planItems);
    expect(storedItems).toHaveLength(1);
  });

  it("rejects malformed plans with 400 and stores nothing", async () => {
    const missing = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { horizon_days: 7, focus: "x" },
    });
    expect(missing.statusCode).toBe(400);

    const unknownField = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { ...planBody(1, "s"), hacker_extra: "injected" },
    });
    expect(unknownField.statusCode).toBe(400);

    const unknownItemField = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: {
        horizon_days: 7,
        focus: "x",
        problems: [{ lc_id: 1, slug: "s", reason: "r", extra: "nope" }],
      },
    });
    expect(unknownItemField.statusCode).toBe(400);

    const noProblems = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { horizon_days: 7, focus: "x", problems: [] },
    });
    expect(noProblems.statusCode).toBe(400);

    const badTypes = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { horizon_days: "soon", focus: "x", problems: [{ lc_id: 1, slug: "s", reason: "r" }] },
    });
    expect(badTypes.statusCode).toBe(400);

    expect(await db.select().from(plans)).toHaveLength(0);
    expect(await db.select().from(planItems)).toHaveLength(0);
  });

  it("rejects empty and whitespace-only focus with 400 and stores nothing", async () => {
    const empty = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { ...planBody(1, "s"), focus: "" },
    });
    expect(empty.statusCode).toBe(400);
    const emptyBody = empty.json() as { error: { message: string } };
    expect(emptyBody.error.message).toContain("invalid plan payload");

    const whitespace = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { ...planBody(1, "s"), focus: "   \t\n " },
    });
    expect(whitespace.statusCode).toBe(400);
    const whitespaceBody = whitespace.json() as { error: { message: string } };
    expect(whitespaceBody.error.message).toContain("invalid plan payload");

    expect(await db.select().from(plans)).toHaveLength(0);
    expect(await db.select().from(planItems)).toHaveLength(0);
  });

  it("rejects unknown lc_ids with 400 listing them and stores nothing", async () => {
    const [p] = await db.insert(problems).values(await seedProblemRow("two-sum")).returning();
    const res = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: {
        horizon_days: 7,
        focus: "x",
        problems: [
          { lc_id: p.lcId, slug: "two-sum", reason: "ok" },
          { lc_id: 999001, slug: "unknown-a", reason: "r" },
          { lc_id: 999002, slug: "unknown-b", reason: "r" },
        ],
      },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { message: string } };
    expect(body.error.message).toContain("999001");
    expect(body.error.message).toContain("999002");
    expect(await db.select().from(plans)).toHaveLength(0);
    expect(await db.select().from(planItems)).toHaveLength(0);
  });

  it("lists plans newest-first with snake_case items", async () => {
    const [p] = await db.insert(problems).values(await seedProblemRow("two-sum")).returning();
    const first = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: planBody(p.lcId, "two-sum"),
    });
    vi.setSystemTime(60_000);
    const second = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { ...planBody(p.lcId, "two-sum"), focus: "second plan" },
    });
    expect(second.statusCode).toBe(200);
    const firstId = (first.json() as { id: number }).id;
    const secondId = (second.json() as { id: number }).id;

    const list = (await handle.app.inject({ method: "GET", url: "/api/agent/plans", headers: auth })).json() as Array<{
      id: number;
      created_at: number;
      focus: string;
      items: Array<{ lc_id: number; status: string }>;
    }>;
    expect(list.map((p2) => p2.id)).toEqual([secondId, firstId]);
    expect(list[0].focus).toBe("second plan");
    expect(list[0].items[0].lc_id).toBe(p.lcId);
  });

  it("lists the cached problem bank without triggering a LeetCode sync", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      await seedProblem("alpha");
      const p2 = await seedProblem("beta");
      await db.update(problems).set({ lcId: 2 }).where(eq(problems.id, p2));

      const rows = (
        await handle.app.inject({ method: "GET", url: "/api/agent/problems", headers: auth })
      ).json() as Array<{ id: number; lc_id: number; title: string; slug: string; difficulty: string; tags: string[] }>;
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.slug)).toEqual(["beta", "alpha"]);
      expect(rows[0]).toMatchObject({ lc_id: 2, title: "Title beta", difficulty: "Easy", tags: ["array"] });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("includes plan_item_id in the agent session list (null and set cases)", async () => {
    const p = await seedProblem("planned-problem");
    const [problem] = await db.select().from(problems).where(eq(problems.id, p));
    const plan = await createPlan(db, {
      horizonDays: 7,
      focus: "focus",
      problems: [{ lcId: problem!.lcId, slug: "planned-problem", reason: "r" }],
    });
    const [item] = plan.items;

    const linkedRes = await handle.app.inject({
      method: "POST",
      url: "/api/ui/sessions",
      payload: { problemId: p, planItemId: item.id },
    });
    expect(linkedRes.statusCode).toBe(200);
    const linked = (linkedRes.json() as { sessionId: number }).sessionId;
    vi.setSystemTime(60_000);
    const unlinked = await startSession(db, p);

    const rows = (
      await handle.app.inject({ method: "GET", url: "/api/agent/sessions", headers: auth })
    ).json() as Array<{ id: number; planItemId: number | null }>;
    const byId = new Map(rows.map((r) => [r.id, r.planItemId]));
    expect(byId.get(linked)).toBe(item.id);
    expect(byId.get(unlinked)).toBeNull();
  });
});

async function seedProblemRow(slug: string): Promise<typeof problems.$inferInsert> {
  return {
    lcId: nextLcId++,
    title: `Title ${slug}`,
    slug,
    difficulty: "Easy",
    tags: '["array"]',
    description: "<p>problem description</p>",
    fetchedAt: Date.now(),
  };
}

describe("agent api auth (5.1)", () => {
  it("rejects missing and wrong tokens, accepts the right one", async () => {
    const none = await handle.app.inject({ method: "GET", url: "/api/agent/sessions" });
    expect(none.statusCode).toBe(401);

    const wrong = await handle.app.inject({
      method: "GET",
      url: "/api/agent/sessions",
      headers: { authorization: "Bearer wrong" },
    });
    expect(wrong.statusCode).toBe(401);

    const ok = await handle.app.inject({ method: "GET", url: "/api/agent/sessions", headers: auth });
    expect(ok.statusCode).toBe(200);
  });

  it("does not leak data on rejected requests", async () => {
    const res = await handle.app.inject({ method: "GET", url: "/api/agent/reviews/pending" });
    expect(res.statusCode).toBe(401);
    expect(res.body).not.toContain("sessionId");
  });
});

describe("agent session list + context (5.2)", () => {
  it("filters by date range, problem, and review status", async () => {
    const p1 = await seedProblem("two-sum");
    const p2 = await seedProblem("add-numbers");
    const s1 = await startSession(db, p1);
    await recordSnapshot(db, s1, "code1");
    vi.setSystemTime(5 * 60_000);
    const s2 = await startSession(db, p2);
    await recordSnapshot(db, s2, "code2");
    vi.setSystemTime(20 * 60_000);
    await requestReview(db, s1);

    const rows1 = (
      await handle.app.inject({ method: "GET", url: `/api/agent/sessions?problem_id=${p1}`, headers: auth })
    ).json() as Array<{ id: number }>;
    expect(rows1.map((r) => r.id)).toEqual([s1]);

    const rowsDate = (
      await handle.app.inject({
        method: "GET",
        url: "/api/agent/sessions?from=300000&to=600000",
        headers: auth,
      })
    ).json() as Array<{ id: number }>;
    expect(rowsDate.map((r) => r.id)).toEqual([s2]);

    const rowsPending = (
      await handle.app.inject({ method: "GET", url: "/api/agent/sessions?review_status=pending", headers: auth })
    ).json() as Array<{ id: number }>;
    expect(rowsPending.map((r) => r.id)).toEqual([s1]);
  });

  it("returns review-ready context (log + problem metadata + description) in one call", async () => {
    const p = await seedProblem("context-problem");
    const s = await startSession(db, p);
    await recordSnapshot(db, s, "def solve(): pass");
    vi.setSystemTime(60_000);
    await appendEvent(db, s, Date.now(), "submission", { lc_submission_id: 5, verdict: "Accepted", code: "x" });

    const res = await handle.app.inject({ method: "GET", url: `/api/agent/sessions/${s}`, headers: auth });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      session: { id: number };
      problem: { slug: string; description: string };
      log: string;
    };
    expect(body.session.id).toBe(s);
    expect(body.problem.slug).toBe("context-problem");
    expect(body.problem.description).toContain("problem description");
    const header = JSON.parse(body.log.split("\n")[0]!);
    expect(header.schema_version).toBe(1);
    expect(body.log).toContain("submission");
  });
});

describe("review POST (5.3)", () => {
  it("stores a well-formed review and links it to the session", async () => {
    const p = await seedProblem("review-target");
    const s = await startSession(db, p);
    const res = await handle.app.inject({
      method: "POST",
      url: `/api/agent/sessions/${s}/reviews`,
      headers: auth,
      payload: {
        observations: "O(n) hash map approach",
        strengths: "Clean code",
        weaknesses: "Missed edge case for duplicates",
        recommended_focus: "Two-pointer patterns",
        overall: "good",
      },
    });
    expect(res.statusCode).toBe(200);
    const detail = (await handle.app.inject({ method: "GET", url: `/api/ui/sessions/${s}` })).json() as {
      reviews: Array<{ observations: string }>;
    };
    expect(detail.reviews).toHaveLength(1);
    expect(detail.reviews[0].observations).toBe("O(n) hash map approach");
  });

  it("rejects malformed reviews and stores nothing", async () => {
    const p = await seedProblem("review-bad");
    const s = await startSession(db, p);

    const missing = await handle.app.inject({
      method: "POST",
      url: `/api/agent/sessions/${s}/reviews`,
      headers: auth,
      payload: { observations: "only observations" },
    });
    expect(missing.statusCode).toBe(400);

    const unknownField = await handle.app.inject({
      method: "POST",
      url: `/api/agent/sessions/${s}/reviews`,
      headers: auth,
      payload: {
        observations: "a",
        strengths: "b",
        weaknesses: "c",
        recommended_focus: "d",
        hacker_extra: "injected",
      },
    });
    expect(unknownField.statusCode).toBe(400);

    const empty = await handle.app.inject({
      method: "POST",
      url: `/api/agent/sessions/${s}/reviews`,
      headers: auth,
      payload: { observations: "", strengths: "", weaknesses: "", recommended_focus: "" },
    });
    expect(empty.statusCode).toBe(400);

    const detail = (await handle.app.inject({ method: "GET", url: `/api/ui/sessions/${s}` })).json() as {
      reviews: unknown[];
    };
    expect(detail.reviews).toHaveLength(0);
  });

  it("rejects reviews for unknown sessions", async () => {
    const res = await handle.app.inject({
      method: "POST",
      url: "/api/agent/sessions/9999/reviews",
      headers: auth,
      payload: { observations: "a", strengths: "b", weaknesses: "c", recommended_focus: "d" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("plan → practice → provenance flow (5.2)", () => {
  it("runs one coherent agent plan → user practice → provenance round trip", async () => {
    const [p] = await db.insert(problems).values(await seedProblemRow("e2e-planned")).returning();

    // Agent proposes a plan over the bank problem.
    const posted = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: {
        horizon_days: 7,
        focus: "lock in the hash-map pattern",
        notes: "start with easy variants",
        problems: [{ lc_id: p.lcId, slug: "e2e-planned", reason: "warm-up" }],
      },
    });
    expect(posted.statusCode).toBe(200);
    const plan = posted.json() as {
      id: number;
      items: Array<{ id: number; lc_id: number; status: string }>;
    };
    const item = plan.items[0]!;
    expect(item.lc_id).toBe(p.lcId);
    expect(item.status).toBe("not_started");

    // The posted plan shows up in the plan list (newest-first).
    const list = (
      await handle.app.inject({ method: "GET", url: "/api/agent/plans", headers: auth })
    ).json() as Array<{ id: number; items: Array<{ id: number; status: string }> }>;
    const listed = list.find((entry) => entry.id === plan.id);
    expect(listed).toBeDefined();
    expect(listed!.items[0]!.id).toBe(item.id);

    // User starts a session from the plan item via the UI endpoint.
    const start = await handle.app.inject({
      method: "POST",
      url: "/api/ui/sessions",
      payload: { problemId: p.id, planItemId: item.id },
    });
    expect(start.statusCode).toBe(200);
    const sessionId = (start.json() as { sessionId: number }).sessionId;

    // The agent session list records the plan provenance.
    const sessions = (
      await handle.app.inject({ method: "GET", url: "/api/agent/sessions", headers: auth })
    ).json() as Array<{ id: number; planItemId: number | null }>;
    const row = sessions.find((s) => s.id === sessionId);
    expect(row).toBeDefined();
    expect(row!.planItemId).toBe(item.id);

    // The linked session flips the item's derived status to practiced.
    const after = (
      await handle.app.inject({ method: "GET", url: "/api/agent/plans", headers: auth })
    ).json() as Array<{ id: number; items: Array<{ id: number; status: string }> }>;
    const afterItem = after.find((entry) => entry.id === plan.id)!.items.find((i) => i.id === item.id);
    expect(afterItem!.status).toBe("practiced");
  });
});

describe("review-request queue (5.4)", () => {
  it("runs the full request → pending → claim → complete round trip", async () => {
    const p = await seedProblem("queue-problem");
    const s = await startSession(db, p);
    vi.setSystemTime(60_000);
    await requestReview(db, s);

    const queue = (
      await handle.app.inject({ method: "GET", url: "/api/agent/reviews/pending", headers: auth })
    ).json() as Array<{ requestId: number; sessionId: number; status: string }>;
    expect(queue).toHaveLength(1);
    expect(queue[0].sessionId).toBe(s);
    expect(queue[0].status).toBe("pending");
    const requestId = queue[0].requestId;

    const claimed = await handle.app.inject({
      method: "POST",
      url: `/api/agent/reviews/requests/${requestId}/claim`,
      headers: auth,
    });
    expect(claimed.statusCode).toBe(200);
    const inProgress = (
      await handle.app.inject({ method: "GET", url: "/api/agent/reviews/pending", headers: auth })
    ).json() as Array<{ status: string }>;
    expect(inProgress[0].status).toBe("in_progress");

    const completed = await handle.app.inject({
      method: "POST",
      url: `/api/agent/reviews/requests/${requestId}/complete`,
      headers: auth,
    });
    expect(completed.statusCode).toBe(200);
    const after = (
      await handle.app.inject({ method: "GET", url: "/api/agent/reviews/pending", headers: auth })
    ).json() as unknown[];
    expect(after).toHaveLength(0);

    const detail = (await handle.app.inject({ method: "GET", url: `/api/ui/sessions/${s}` })).json() as {
      reviewRequestStatus: string;
    };
    expect(detail.reviewRequestStatus).toBe("completed");
  });

  it("a review POST completes a pending request", async () => {
    const p = await seedProblem("review-completes");
    const s = await startSession(db, p);
    await requestReview(db, s);
    await handle.app.inject({
      method: "POST",
      url: `/api/agent/sessions/${s}/reviews`,
      headers: auth,
      payload: { observations: "x", strengths: "y", weaknesses: "z", recommended_focus: "w" },
    });
    const after = (
      await handle.app.inject({ method: "GET", url: "/api/agent/reviews/pending", headers: auth })
    ).json() as unknown[];
    expect(after).toHaveLength(0);
  });

  it("user can cancel a pending request before pickup", async () => {
    const p = await seedProblem("cancel-problem");
    const s = await startSession(db, p);
    await requestReview(db, s);
    expect(
      (await handle.app.inject({ method: "GET", url: "/api/agent/reviews/pending", headers: auth })).json() as unknown[],
    ).toHaveLength(1);

    await cancelReviewRequest(db, s);
    const after = (
      await handle.app.inject({ method: "GET", url: "/api/agent/reviews/pending", headers: auth })
    ).json() as unknown[];
    expect(after).toHaveLength(0);
  });
});

describe("agent plan chaining api (3.2)", () => {
  it("echoes based_on and carried_from through POST and includes them in GET", async () => {
    const [p1] = await db.insert(problems).values(await seedProblemRow("two-sum")).returning({ id: problems.id, lcId: problems.lcId });
    const [p2] = await db.insert(problems).values(await seedProblemRow("three-sum")).returning({ id: problems.id, lcId: problems.lcId });

    const first = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: { horizon_days: 7, focus: "week one", problems: [{ lc_id: p1.lcId, slug: "two-sum", reason: "r" }] },
    });
    expect(first.statusCode).toBe(200);
    const firstPlan = first.json();
    expect(firstPlan.based_on).toBeNull();
    expect(firstPlan.items[0].carried_from).toBeNull();

    const second = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: {
        horizon_days: 7,
        focus: "week two",
        based_on: firstPlan.id,
        problems: [{ lc_id: p2.lcId, slug: "three-sum", reason: "continue", carried_from: firstPlan.items[0].id }],
      },
    });
    expect(second.statusCode).toBe(200);
    const secondPlan = second.json();
    expect(secondPlan.based_on).toBe(firstPlan.id);
    expect(secondPlan.items[0].carried_from).toBe(firstPlan.items[0].id);

    const list = await handle.app.inject({ method: "GET", url: "/api/agent/plans", headers: auth });
    const plans = list.json();
    expect(plans[0].based_on).toBe(firstPlan.id);
    expect(plans[0].items[0].carried_from).toBe(firstPlan.items[0].id);
    expect(plans[1].based_on).toBeNull();
  });

  it("rejects unknown chaining references with 400 and stores nothing", async () => {
    const [p1] = await db.insert(problems).values(await seedProblemRow("two-sum")).returning({ id: problems.id, lcId: problems.lcId });
    const badBased = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: {
        horizon_days: 7,
        focus: "x",
        based_on: 9999,
        problems: [{ lc_id: p1.lcId, slug: "two-sum", reason: "r" }],
      },
    });
    expect(badBased.statusCode).toBe(400);
    expect(badBased.json().error.message).toMatch(/Unknown based_on plan id: 9999/);

    const badCarried = await handle.app.inject({
      method: "POST",
      url: "/api/agent/plans",
      headers: auth,
      payload: {
        horizon_days: 7,
        focus: "x",
        problems: [{ lc_id: p1.lcId, slug: "two-sum", reason: "r", carried_from: 4242 }],
      },
    });
    expect(badCarried.statusCode).toBe(400);
    expect(badCarried.json().error.message).toMatch(/Unknown carried_from plan item ids: 4242/);

    const list = await handle.app.inject({ method: "GET", url: "/api/agent/plans", headers: auth });
    expect(list.json()).toEqual([]);
  });
});
