import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createApp } from "../../../server/app.js";
import type { Config } from "../../../server/config.js";
import { getProgressDigest } from "../../../server/memory/digest.js";
import { listSessions } from "../../../server/sessions/service.js";
import { listPlans } from "../../../server/sessions/plans.js";
import { getMemory, listMemoryVersions } from "../../../server/memory/memory.js";

/*
 * Boot a scratch leeter instance for one fixture evaluation.
 *
 *   tsx agent/evals/lib/boot.ts <fixture-name> <workdir>
 *
 * Creates <workdir>/leeter.db, runs migrations, seeds the fixture, starts
 * the app on an ephemeral localhost port, writes groundtruth.json (the
 * seeded state the planner must work from) and instance.json (how run.sh
 * and the planner reach it). Stays alive until SIGTERM.
 */

const evRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // agent/evals

const fixtureName = process.argv[2];
const workdir = process.argv[3];
if (!fixtureName || !workdir) {
  console.error("usage: tsx agent/evals/lib/boot.ts <fixture-name> <workdir>");
  process.exit(1);
}

async function main(): Promise<void> {
  mkdirSync(workdir, { recursive: true });
  const dbPath = path.join(workdir, "leeter.db");
  const token = randomBytes(24).toString("hex");

  const config: Config = {
    port: 0, // assigned after listen
    dataDir: workdir,
    dbPath,
    webDist: path.join(workdir, "no-web"), // absent -> static serving disabled
    leetcodeSession: "", // offline: any LC sync would fail loudly
    csrfToken: "",
    agentToken: token,
  };

  const handle = createApp(config);
  const fixture = await import(`../fixtures/${fixtureName}.js`);
  if (!fixture.seed || !fixture.meta) {
    throw new Error(`fixture ${fixtureName} must export meta + seed`);
  }
  await fixture.seed(handle.db);

  // Ground truth snapshot BEFORE the planner runs (digest + surfaces it reads).
  const [digest, sessionList, planList, memory, memoryVersions] = await Promise.all([
    getProgressDigest(handle.db),
    listSessions(handle.db, {}),
    listPlans(handle.db),
    getMemory(handle.db),
    listMemoryVersions(handle.db),
  ]);
  const bank = await handle.db.select().from((await import("../../../server/db/schema.js")).problems);
  writeJSON(path.join(workdir, "groundtruth.json"), {
    fixture: fixtureName,
    fixtureDescription: fixture.meta.description,
    digest,
    sessions: sessionList,
    plans: planList,
    memory,
    memoryVersions: memoryVersions.map((v) => ({ body: v.body, createdAt: v.createdAt })),
    bank: bank.map((b) => ({ id: b.id, lcId: b.lcId, title: b.title, slug: b.slug, difficulty: b.difficulty, tags: JSON.parse(b.tags) })),
  });

  await handle.app.listen({ port: 0, host: "127.0.0.1" });
  const address = handle.app.server.address();
  if (address === null || typeof address !== "object") throw new Error("no listening address");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  writeJSON(path.join(workdir, "instance.json"), { baseUrl, token, fixture: fixtureName });
  console.log(`instance ready: ${baseUrl} (fixture ${fixtureName})`);

  const shutdown = () => {
    handle.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  // Stay alive; run.sh kills us after the planner run.
  setInterval(() => {}, 1_000_000);
}

function writeJSON(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value, null, 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
