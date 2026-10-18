import { existsSync } from "node:fs";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { loadConfig, type Config } from "./config.js";
import { createDb, type Db } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createLcClient } from "./lc/client.js";
import { registerUiRoutes } from "./routes/ui.js";
import { registerAgentRoutes } from "./routes/agent.js";

export interface AppHandle {
  app: FastifyInstance;
  db: Db;
  close(): void;
}

export function createApp(config: Config): AppHandle {
  const { sqlite, db } = createDb(config.dbPath);
  runMigrations(sqlite);

  const app = Fastify({ logger: false });
  const lcClient = createLcClient({
    session: config.leetcodeSession,
    csrfToken: config.csrfToken,
  });

  app.get("/api/health", async () => ({ status: "ok", time: Date.now() }));

  registerUiRoutes(app, { db, lcClient });
  registerAgentRoutes(app, { db, agentToken: config.agentToken });

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    reply.code(status).send({ error: { message: err.message } });
  });

  if (existsSync(config.webDist)) {
    app.register(fastifyStatic, { root: config.webDist });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api")) {
        reply.code(404).send({ error: { message: "not found" } });
      } else {
        reply.sendFile("index.html");
      }
    });
  }

  return {
    app,
    db,
    close() {
      app.close();
      sqlite.close();
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const handle = createApp(config);
  handle.app
    .listen({ port: config.port, host: "0.0.0.0" })
    .then((addr) => console.log(`leeter listening on ${addr}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
