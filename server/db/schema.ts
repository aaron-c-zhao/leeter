import { sqliteTable, integer, text, index, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const problems = sqliteTable("problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lcId: integer("lc_id").notNull().unique(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  difficulty: text("difficulty").notNull(),
  tags: text("tags").notNull().default("[]"),
  description: text("description").notNull().default(""),
  fetchedAt: integer("fetched_at").notNull(),
});

export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at").notNull(),
  horizonDays: integer("horizon_days").notNull(),
  focusMd: text("focus_md").notNull(),
  notesMd: text("notes_md"),
  // Optional chaining: the earlier plan this one revises.
  basedOn: integer("based_on").references((): AnySQLiteColumn => plans.id),
});

export const planItems = sqliteTable(
  "plan_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id),
    lcId: integer("lc_id").notNull(),
    slug: text("slug").notNull(),
    reasonMd: text("reason_md").notNull(),
    // Optional chaining: the earlier plan item this one continues.
    carriedFrom: integer("carried_from").references((): AnySQLiteColumn => planItems.id),
  },
  (t) => [index("plan_items_plan_idx").on(t.planId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    activeMs: integer("active_ms").notNull().default(0),
    pausedAt: integer("paused_at"),
    lastResumedAt: integer("last_resumed_at"),
    logVersion: integer("log_version"),
    planItemId: integer("plan_item_id").references(() => planItems.id),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("sessions_plan_item_idx").on(t.planItemId)],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lcSubmissionId: integer("lc_submission_id").notNull().unique(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id),
    sessionId: integer("session_id").references(() => sessions.id),
    lang: text("lang").notNull().default(""),
    code: text("code").notNull().default(""),
    verdict: text("verdict").notNull(),
    statusDisplay: text("status_display").notNull().default(""),
    runtime: text("runtime"),
    memory: text("memory"),
    submittedAt: integer("submitted_at").notNull(),
    syncedAt: integer("synced_at").notNull(),
  },
  (t) => [index("submissions_problem_idx").on(t.problemId), index("submissions_session_idx").on(t.sessionId)],
);

export const sessionEvents = sqliteTable(
  "session_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    ts: integer("ts").notNull(),
    payload: text("payload").notNull().default("{}"),
  },
  (t) => [uniqueIndex("session_events_seq_idx").on(t.sessionId, t.seq)],
);

export const notes = sqliteTable(
  "notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .unique()
      .references(() => sessions.id),
    body: text("body").notNull().default(""),
    updatedAt: integer("updated_at").notNull(),
  },
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id),
    observations: text("observations").notNull().default(""),
    strengths: text("strengths").notNull().default(""),
    weaknesses: text("weaknesses").notNull().default(""),
    recommendedFocus: text("recommended_focus").notNull().default(""),
    overall: text("overall"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("reviews_session_idx").on(t.sessionId)],
);

export const reviewRequests = sqliteTable(
  "review_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .unique()
      .references(() => sessions.id),
    status: text("status").notNull().default("pending"),
    requestedAt: integer("requested_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("review_requests_status_idx").on(t.status)],
);

// Agent memory notebook: a single current row pointing at the latest of an
// immutable version history (PUT always creates a new version — audit trail).
export const memoryVersions = sqliteTable("memory_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const memory = sqliteTable("memory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currentVersionId: integer("current_version_id")
    .notNull()
    .references(() => memoryVersions.id),
  updatedAt: integer("updated_at").notNull(),
});
