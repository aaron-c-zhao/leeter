import type Database from "better-sqlite3";

const DDL = `
CREATE TABLE IF NOT EXISTS problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lc_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  fetched_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  active_ms INTEGER NOT NULL DEFAULT 0,
  paused_at INTEGER,
  last_resumed_at INTEGER,
  log_version INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lc_submission_id INTEGER NOT NULL UNIQUE,
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  session_id INTEGER REFERENCES sessions(id),
  lang TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  verdict TEXT NOT NULL,
  status_display TEXT NOT NULL DEFAULT '',
  runtime TEXT,
  memory TEXT,
  submitted_at INTEGER NOT NULL,
  synced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_problem_idx ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS submissions_session_idx ON submissions(session_id);

CREATE TABLE IF NOT EXISTS session_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  ts INTEGER NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS session_events_seq_idx ON session_events(session_id, seq);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
  body TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  horizon_days INTEGER NOT NULL,
  focus_md TEXT NOT NULL,
  notes_md TEXT
);

CREATE TABLE IF NOT EXISTS plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  lc_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  reason_md TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS plan_items_plan_idx ON plan_items(plan_id);

CREATE TABLE IF NOT EXISTS memory_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  current_version_id INTEGER NOT NULL REFERENCES memory_versions(id),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  observations TEXT NOT NULL DEFAULT '',
  strengths TEXT NOT NULL DEFAULT '',
  weaknesses TEXT NOT NULL DEFAULT '',
  recommended_focus TEXT NOT NULL DEFAULT '',
  overall TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_session_idx ON reviews(session_id);

CREATE TABLE IF NOT EXISTS review_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS review_requests_status_idx ON review_requests(status);
`;

export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(DDL);
  const cols = sqlite.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "log_version")) {
    sqlite.exec("ALTER TABLE sessions ADD COLUMN log_version INTEGER");
  }
  if (!cols.some((c) => c.name === "plan_item_id")) {
    sqlite.exec("ALTER TABLE sessions ADD COLUMN plan_item_id INTEGER REFERENCES plan_items(id)");
  }
  sqlite.exec("CREATE INDEX IF NOT EXISTS sessions_plan_item_idx ON sessions(plan_item_id)");
  const planCols = sqlite.prepare("PRAGMA table_info(plans)").all() as Array<{ name: string }>;
  if (!planCols.some((c) => c.name === "based_on")) {
    sqlite.exec("ALTER TABLE plans ADD COLUMN based_on INTEGER REFERENCES plans(id)");
  }
  const itemCols = sqlite.prepare("PRAGMA table_info(plan_items)").all() as Array<{ name: string }>;
  if (!itemCols.some((c) => c.name === "carried_from")) {
    sqlite.exec("ALTER TABLE plan_items ADD COLUMN carried_from INTEGER REFERENCES plan_items(id)");
  }
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  const { loadConfig } = await import("../config.js");
  const { createDb } = await import("./client.js");
  const config = loadConfig();
  const { sqlite } = createDb(config.dbPath);
  runMigrations(sqlite);
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string }>;
  console.log(`Migrations applied to ${config.dbPath}`);
  console.log("Tables:", tables.map((t) => t.name).join(", "));
  sqlite.close();
}
