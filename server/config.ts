import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env ${name}`);
  return v;
}

export interface Config {
  port: number;
  dataDir: string;
  dbPath: string;
  webDist: string;
  leetcodeSession: string;
  csrfToken: string;
  agentToken: string;
}

function resolveAgentToken(dataDir: string): string {
  const fromEnv = process.env.AGENT_TOKEN;
  if (fromEnv) return fromEnv;
  const file = path.join(dataDir, "agent-token");
  if (existsSync(file)) {
    return readFileSync(file, "utf8").trim();
  }
  const token = randomBytes(24).toString("hex");
  writeFileSync(file, token, { mode: 0o600 });
  return token;
}

export function loadConfig(): Config {
  const dataDir = process.env.DATA_DIR ?? path.resolve("data");
  mkdirSync(dataDir, { recursive: true });
  return {
    port: Number(process.env.PORT ?? 8080),
    dataDir,
    dbPath: process.env.DB_PATH ?? path.join(dataDir, "leeter.db"),
    webDist: process.env.WEB_DIST ?? path.resolve("dist/web"),
    leetcodeSession: process.env.LEETCODE_SESSION ?? "",
    csrfToken: process.env.CSRFTOKEN ?? "",
    agentToken: resolveAgentToken(dataDir),
  };
}
