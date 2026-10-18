import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp, type AppHandle } from "../server/app";
import type { Config } from "../server/config";
import type { Db } from "../server/db/client";
import { problems } from "../server/db/schema";
import { TAXONOMY_VERSION } from "../server/knowledge/taxonomy";

const TOKEN = "test-agent-token-abcdef";

let handle: AppHandle;
let db: Db;

function makeConfig(): Config {
  const dir = mkdtempSync(path.join(tmpdir(), "leeter-roadmap-"));
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
  // Any LeetCode network touch fails loudly — proves the route never syncs.
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

async function seedProblem(lcId: number, slug: string, tags: string[], difficulty = "Easy") {
  const [p] = await db
    .insert(problems)
    .values({ lcId, title: slug, slug, difficulty, tags: JSON.stringify(tags), description: "", fetchedAt: Date.now() })
    .returning({ id: problems.id });
  return p.id;
}

describe("GET /api/ui/roadmap (2.2)", () => {
  it("returns the empty taxonomy tree with zeroed mastery and no error", async () => {
    const res = await handle.app.inject({ method: "GET", url: "/api/ui/roadmap" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.taxonomyVersion).toBe(TAXONOMY_VERSION);
    expect(body.domains.map((d: { id: string }) => d.id)).toEqual(["data-structures", "algorithms", "other"]);
    const arrays = body.domains[0].topics.find((t: { id: string }) => t.id === "arrays-hashing");
    expect(arrays).toMatchObject({
      attempts: 0,
      solved: 0,
      solveRate: 0,
      lastPracticedAt: null,
      frontier: [],
      recent: [],
    });
  });

  it("returns a populated tree without triggering a LeetCode sync", async () => {
    const problemId = await seedProblem(1, "two-sum", ["array", "hash-table"]);
    const start = await handle.app.inject({
      method: "POST",
      url: "/api/ui/sessions",
      payload: { problemId },
    });
    expect(start.statusCode).toBe(200);

    const res = await handle.app.inject({ method: "GET", url: "/api/ui/roadmap" });
    expect(res.statusCode).toBe(200);
    const arrays = res.json().domains[0].topics.find((t: { id: string }) => t.id === "arrays-hashing");
    expect(arrays.attempts).toBe(1);
    expect(arrays.recent).toHaveLength(1);
    expect(arrays.recent[0].slug).toBe("two-sum");
    expect(arrays.recent[0].sessionId).toBeTypeOf("number");
  });

  it("reflects the current plan frontier including carried items", async () => {
    await seedProblem(1, "two-sum", ["array"]);
    const threeSumId = await seedProblem(15, "three-sum", ["array", "two-pointers"], "Medium");

    const plan1 = await (
      await handle.app.inject({
        method: "POST",
        url: "/api/agent/plans",
        headers: { authorization: `Bearer ${TOKEN}` },
        payload: { horizon_days: 7, focus: "week one", problems: [{ lc_id: 1, slug: "two-sum", reason: "r" }] },
      })
    ).json();

    const plan2 = await (
      await handle.app.inject({
        method: "POST",
        url: "/api/agent/plans",
        headers: { authorization: `Bearer ${TOKEN}` },
        payload: {
          horizon_days: 7,
          focus: "week two",
          based_on: plan1.id,
          problems: [{ lc_id: 15, slug: "three-sum", reason: "continue", carried_from: plan1.items[0].id }],
        },
      })
    ).json();

    const res = await handle.app.inject({ method: "GET", url: "/api/ui/roadmap" });
    expect(res.statusCode).toBe(200);
    const domains = res.json().domains;
    const arrays = domains[0].topics.find((t: { id: string }) => t.id === "arrays-hashing");
    // three-sum maps to both arrays-hashing and two-pointers.
    expect(arrays.frontier).toEqual([
      {
        itemId: plan2.items[0].id,
        problemId: threeSumId,
        title: "three-sum",
        slug: "three-sum",
        difficulty: "Medium",
        status: "not_started",
        carriedFrom: plan1.items[0].id,
      },
    ]);
    const pointers = domains[0].topics.find((t: { id: string }) => t.id === "two-pointers");
    expect(pointers.frontier.map((f: { itemId: number }) => f.itemId)).toEqual([plan2.items[0].id]);
    // Stale plan items are not in the frontier.
    expect(arrays.frontier.map((f: { slug: string }) => f.slug)).not.toContain("two-sum");
  });
});
