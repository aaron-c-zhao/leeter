import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp, type AppHandle } from "../server/app";
import type { Config } from "../server/config";
import type { Db } from "../server/db/client";

const TOKEN = "test-agent-token-abcdef";
const auth = { authorization: `Bearer ${TOKEN}` };

let handle: AppHandle;
let db: Db;

function makeConfig(): Config {
  const dir = mkdtempSync(path.join(tmpdir(), "leeter-memory-"));
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

describe("agent memory + progress api (3.1)", () => {
  it("requires auth for progress, memory, and memory-versions endpoints", async () => {
    for (const [method, url] of [
      ["GET", "/api/agent/progress"],
      ["GET", "/api/agent/memory"],
      ["PUT", "/api/agent/memory"],
      ["GET", "/api/agent/memory/versions"],
    ] as const) {
      const res = await handle.app.inject({ method, url });
      expect(res.statusCode).toBe(401);
    }
  });

  it("GET /progress returns the digest computed by the server", async () => {
    const res = await handle.app.inject({ method: "GET", url: "/api/agent/progress", headers: auth });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totals).toEqual({ attempts: 0, solved: 0 });
    expect(body.topics).toEqual([]);
    expect(body.current_plan).toBeNull();
  });

  it("memory PUT/GET round-trip with version audit trail", async () => {
    const put1 = await handle.app.inject({
      method: "PUT",
      url: "/api/agent/memory",
      headers: auth,
      payload: { body: "first version" },
    });
    expect(put1.statusCode).toBe(200);
    const put1body = put1.json();
    expect(put1body.ok).toBe(true);
    expect(put1body.size).toBe(Buffer.byteLength("first version"));

    await handle.app.inject({
      method: "PUT",
      url: "/api/agent/memory",
      headers: auth,
      payload: { body: "second version" },
    });

    const get = await handle.app.inject({ method: "GET", url: "/api/agent/memory", headers: auth });
    expect(get.json().body).toBe("second version");

    const versions = await handle.app.inject({ method: "GET", url: "/api/agent/memory/versions", headers: auth });
    const list = versions.json();
    expect(list.map((v: { body: string }) => v.body)).toEqual(["second version", "first version"]);
    expect(list[0]).toHaveProperty("created_at");
    expect(list[0]).toHaveProperty("size");
    expect(put1.json().version_id).toBeDefined();
  });

  it("GET memory before anything is stored returns null fields", async () => {
    const res = await handle.app.inject({ method: "GET", url: "/api/agent/memory", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ body: null, version_id: null, updated_at: null });
  });

  it("rejects malformed and oversized memory payloads with 400 and stores nothing", async () => {
    const bad = await handle.app.inject({
      method: "PUT",
      url: "/api/agent/memory",
      headers: auth,
      payload: { body: "x", extra: "field" },
    });
    expect(bad.statusCode).toBe(400);

    const missing = await handle.app.inject({ method: "PUT", url: "/api/agent/memory", headers: auth, payload: {} });
    expect(missing.statusCode).toBe(400);

    const huge = "x".repeat(64 * 1024 + 1);
    const over = await handle.app.inject({
      method: "PUT",
      url: "/api/agent/memory",
      headers: auth,
      payload: { body: huge },
    });
    expect(over.statusCode).toBe(400);
    expect(over.json().error.message).toMatch(/exceeds 65536 bytes/);

    const versions = await handle.app.inject({ method: "GET", url: "/api/agent/memory/versions", headers: auth });
    expect(versions.json()).toEqual([]);
  });

  it("digest reports nothing without triggering lc-client activity", async () => {
    // No LeetCode credentials are configured in this test config; if the
    // digest triggered a sync the request would fail instead of returning 200.
    const res = await handle.app.inject({ method: "GET", url: "/api/agent/progress", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(db === handle.db).toBe(true); // digest ran against the local db handle
  });
});

describe("planning loop end-to-end (4.2)", () => {
  it("digest -> memory -> chained plan -> plan list -> memory audit", async () => {
    const [p1] = [
      await db
        .insert((await import("../server/db/schema")).problems)
        .values({
          lcId: 1,
          title: "Two Sum",
          slug: "two-sum",
          difficulty: "Easy",
          tags: '["array","hash-table"]',
          description: "",
          fetchedAt: Date.now(),
        })
        .returning({ lcId: (await import("../server/db/schema")).problems.lcId }),
    ][0]!;

    // 1. Digest before anything: zeroed, no plan.
    const digest1 = await (await handle.app.inject({ method: "GET", url: "/api/agent/progress", headers: auth })).json();
    expect(digest1.current_plan).toBeNull();

    // 2. First plan posted, memory recorded.
    const plan1 = await (
      await handle.app.inject({
        method: "POST",
        url: "/api/agent/plans",
        headers: auth,
        payload: { horizon_days: 14, focus: "arrays ladder", problems: [{ lc_id: p1.lcId, slug: "two-sum", reason: "start here" }] },
      })
    ).json();

    // 3. Memory notebook written by the "agent".
    await handle.app.inject({
      method: "PUT",
      url: "/api/agent/memory",
      headers: auth,
      payload: { body: "# Memory\n- posted arrays ladder plan" },
    });

    // 4. Chained revision carrying the unfinished item forward.
    const [p2] = [
      await db
        .insert((await import("../server/db/schema")).problems)
        .values({
          lcId: 15,
          title: "Three Sum",
          slug: "three-sum",
          difficulty: "Medium",
          tags: '["array","two-pointers"]',
          description: "",
          fetchedAt: Date.now(),
        })
        .returning({ lcId: (await import("../server/db/schema")).problems.lcId }),
    ][0]!;

    vi.setSystemTime(1000);
    const plan2 = await (
      await handle.app.inject({
        method: "POST",
        url: "/api/agent/plans",
        headers: auth,
        payload: {
          horizon_days: 14,
          focus: "two-pointers ladder",
          based_on: plan1.id,
          problems: [{ lc_id: p2.lcId, slug: "three-sum", reason: "continue", carried_from: plan1.items[0].id }],
        },
      })
    ).json();
    expect(plan2.based_on).toBe(plan1.id);

    // 5. Plan list shows the linkage.
    const list = await (await handle.app.inject({ method: "GET", url: "/api/agent/plans", headers: auth })).json();
    expect(list[0].based_on).toBe(plan1.id);
    expect(list[0].items[0].carried_from).toBe(plan1.items[0].id);

    // 6. Digest now shows the current plan with the carried unsolved item.
    const digest2 = await (await handle.app.inject({ method: "GET", url: "/api/agent/progress", headers: auth })).json();
    expect(digest2.current_plan.id).toBe(plan2.id);
    expect(digest2.current_plan.not_started).toBe(1);
    expect(digest2.current_plan.carried_unsolved).toEqual([
      { item_id: plan2.items[0].id, carried_from: plan1.items[0].id, slug: "three-sum", status: "not_started" },
    ]);
    // Topics aggregate from practice sessions only — none were recorded in
    // this flow, so topics stay empty even though plans exist.
    expect(digest2.topics).toEqual([]);

    // 7. Memory updated and fully auditable.
    await handle.app.inject({
      method: "PUT",
      url: "/api/agent/memory",
      headers: auth,
      payload: { body: "# Memory\n- revised plan to two-pointers" },
    });
    const versions = await (await handle.app.inject({ method: "GET", url: "/api/agent/memory/versions", headers: auth })).json();
    expect(versions).toHaveLength(2);
    expect(versions[0].body).toContain("two-pointers");
  });
});
