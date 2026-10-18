import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { marked } from "marked";
import { ApiError, api } from "../api";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { Chip, difficultyVariant } from "../components/Chip";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

const DAY_MS = 86_400_000;

/* Rows above the fold must answer three questions in order: what do I do
 * right now (Next up), what am I working toward (Plan), what have I been
 * doing (Record). The payload types mirror GET /api/ui/dashboard. */

interface DashboardData {
  totals: { sessions: number; solved: number; activeMs: number };
  daily: Array<{ date: string; attempts: number; solved: number; activeMs: number }>;
  topics: Array<{ topic: string; label: string; attempts: number; solved: number }>;
  plan: Plan | null;
  pastPlans: Plan[];
  activeSession: DashboardSession | null;
  recentSessions: DashboardRecentSession[];
}

export interface DashboardSession {
  id: number;
  problem: { id: number; title: string; slug: string; difficulty: string };
  startedAt: number;
  activeMs: number;
  status: string;
}

export interface DashboardRecentSession extends DashboardSession {
  finishedAt: number;
  outcome: string | null;
}

type PlanItemStatus = "solved" | "practiced" | "not_started";

interface PlanItem {
  id: number;
  planId: number;
  problemId: number | null;
  lcId: number;
  slug: string;
  title: string;
  difficulty: string;
  reason: string;
  status: PlanItemStatus;
  carriedFrom: number | null;
  topics: Array<{ id: string; label: string }>;
}

interface Plan {
  id: number;
  createdAt: number;
  horizonDays: number;
  focus: string;
  notes: string | null;
  items: PlanItem[];
}

/** Visible item rows before the inline show-all control (design D8). */
const ITEM_CAP = 8;
/** Visible topic bars before the "see all on the roadmap" link (design D1). */
const TOPIC_CAP = 8;

function fmtHours(ms: number): string {
  return `${(ms / 3_600_000).toFixed(1)} h`;
}

function fmtMinutes(ms: number): string {
  return `${Math.round(ms / 60_000)} min`;
}

function statusVariant(status: PlanItemStatus): "success" | "warning" | "neutral" {
  if (status === "solved") return "success";
  if (status === "practiced") return "warning";
  return "neutral";
}

function StatusChip({ status }: { status: PlanItemStatus }) {
  return (
    <Chip variant={statusVariant(status)}>{status === "not_started" ? "not started" : status}</Chip>
  );
}

/* ---------- Next up (the action layer) ---------- */

function carriedUnsolvedItems(plan: Plan): PlanItem[] {
  return plan.items.filter((i) => i.carriedFrom != null && i.status !== "solved");
}

function nextPlanItem(plan: Plan | null): PlanItem | null {
  if (!plan) return null;
  const carried = carriedUnsolvedItems(plan);
  if (carried.length > 0) return carried[0]!;
  return plan.items.find((i) => i.status === "not_started") ?? null;
}

function StartButton({ item, compact }: { item: PlanItem; compact?: boolean }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (item.problemId === null) return;
    setStarting(true);
    setError(null);
    try {
      const { sessionId } = await api<{ sessionId: number }>("/api/ui/sessions", {
        method: "POST",
        body: JSON.stringify({ problemId: item.problemId, planItemId: item.id }),
      });
      navigate(`/sessions/${sessionId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setStarting(false);
    }
  }

  return (
    <span>
      <Button variant="primary" onClick={start} disabled={starting}>
        {starting ? "Starting…" : "Start"}
      </Button>
      {!compact && error && <span className="text-danger" style={{ marginLeft: "0.5rem" }}>{error}</span>}
      {compact && error && <span className="text-danger">{error}</span>}
    </span>
  );
}

function NextUpStrip({
  activeSession,
  plan,
  hasSessions,
}: {
  activeSession: DashboardSession | null;
  plan: Plan | null;
  hasSessions: boolean;
}) {
  const item = nextPlanItem(plan);
  return (
    <Card className="nextup">
      <h3>Next up</h3>
      {activeSession && (
        <div className="nextup-row" data-testid="nextup-session">
          <Link to={`/sessions/${activeSession.id}`}>{activeSession.problem.title}</Link>{" "}
          <Chip variant={activeSession.status === "active" ? "accent" : "warning"}>{activeSession.status}</Chip>{" "}
          <span className="text-muted">{fmtMinutes(activeSession.activeMs)} active — resume from the session page</span>
        </div>
      )}
      {!activeSession && item && (
        <div className="nextup-row" data-testid="nextup-item">
          <a href={`https://leetcode.com/problems/${item.slug}/`} target="_blank" rel="noreferrer">
            {item.title}
          </a>
          {item.difficulty && <Chip variant={difficultyVariant(item.difficulty)}>{item.difficulty}</Chip>}
          {item.carriedFrom != null && (
            <Chip variant="warning" title="Carried unfinished item from a previous plan">
              carried
            </Chip>
          )}
          <span className="text-muted" style={{ fontSize: "0.85em" }}>
            {item.reason}
          </span>
          <StartButton item={item} compact />
        </div>
      )}
      {!activeSession && !item && hasSessions && (
        <p className="text-muted" style={{ margin: 0 }} data-testid="nextup-clear">
          All caught up — start another problem from the bank.
        </p>
      )}
      {!activeSession && !item && !hasSessions && (
        <EmptyState
          message="No sessions yet — start your first practice session."
          actionTo="/bank"
          actionLabel="Open the problem bank"
        />
      )}
    </Card>
  );
}

/* ---------- Plan section ---------- */

function PlanProgress({ plan }: { plan: Plan }) {
  const solved = plan.items.filter((i) => i.status === "solved").length;
  const total = plan.items.length;
  const pct = total === 0 ? 0 : Math.round((solved / total) * 100);
  const daysLeft = Math.max(0, Math.ceil((plan.createdAt + plan.horizonDays * DAY_MS - Date.now()) / DAY_MS));
  return (
    <div>
      <div className="plan-progress">
        <strong>
          {solved}/{total} solved
        </strong>
        <span className="text-muted">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TopicChips({ topics }: { topics: PlanItem["topics"] }) {
  if (topics.length === 0) return null;
  return (
    <span className="topic-chips">
      <span className="text-muted" style={{ fontSize: "0.85em" }}>
        trains:
      </span>
      {topics.map((t) => (
        <Link key={t.id} className="chip" to={`/roadmap?topic=${t.id}`} title={`Roadmap: ${t.label}`}>
          {t.label}
        </Link>
      ))}
    </span>
  );
}

function PlanItemRow({ item, startable }: { item: PlanItem; startable: boolean }) {
  return (
    <div className="plan-item">
      <a href={`https://leetcode.com/problems/${item.slug}/`} target="_blank" rel="noreferrer">
        {item.title}
      </a>
      {item.difficulty && <Chip variant={difficultyVariant(item.difficulty)}>{item.difficulty}</Chip>}
      <StatusChip status={item.status} />
      <TopicChips topics={item.topics} />
      <span className="text-muted" style={{ fontSize: "0.85em" }}>
        {item.reason}
      </span>
      {startable && <StartButton item={item} />}
    </div>
  );
}

function PlanSection({ plan, startable }: { plan: Plan; startable: boolean }) {
  return (
    <div>
      <p className="text-muted" style={{ margin: "0.35rem 0" }}>
        Horizon: {plan.horizonDays} days
      </p>
      <div className="md" dangerouslySetInnerHTML={{ __html: marked.parse(plan.focus, { async: false }) as string }} />
      {plan.notes && (
        <div className="md" dangerouslySetInnerHTML={{ __html: marked.parse(plan.notes, { async: false }) as string }} />
      )}
      <hr className="plan-divider" />
      <h4 className="plan-subhead">Problems</h4>
      <PlanItems plan={plan} startable={startable} />
    </div>
  );
}

function PlanItems({ plan, startable }: { plan: Plan; startable: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const capped = !showAll && plan.items.length > ITEM_CAP;
  const visible = capped ? plan.items.slice(0, ITEM_CAP) : plan.items;
  return (
    <div className="plan-list">
      {visible.map((item) => (
        <PlanItemRow key={item.id} item={item} startable={startable} />
      ))}
      {capped && (
        <button className="plan-showall" onClick={() => setShowAll(true)}>
          Show all {plan.items.length} items
        </button>
      )}
    </div>
  );
}

function PlanCard({ plan, pastPlans }: { plan: Plan | null; pastPlans: Plan[] }) {
  if (!plan) {
    return (
      <Card className="dashboard-plan">
        <h3>The plan</h3>
        <EmptyState message="No current plan — your agent's next run will post one." />
      </Card>
    );
  }
  return (
    <Card className="dashboard-plan">
      <h3>The plan</h3>
      <PlanProgress plan={plan} />
      <PlanSection plan={plan} startable />
      {pastPlans.length > 0 && (
        <details style={{ marginTop: "1rem" }}>
          <summary>Past plans ({pastPlans.length})</summary>
          {pastPlans.map((p) => (
            <div key={p.id} style={{ border: "1px solid var(--color-border)", padding: "0.5rem", marginTop: "0.5rem" }}>
              <strong>{new Date(p.createdAt).toLocaleDateString()}</strong> · horizon {p.horizonDays} days
              <PlanSection plan={p} startable={false} />
            </div>
          ))}
        </details>
      )}
    </Card>
  );
}

/* ---------- Record section ---------- */

function StatStrip({ totals }: { totals: DashboardData["totals"] }) {
  const solveRate = totals.sessions > 0 ? Math.round((totals.solved / totals.sessions) * 100) : null;
  return (
    <div className="stat-strip">
      <span className="stat-cell">
        <strong>{totals.sessions}</strong> sessions recorded
      </span>
      <span className="stat-cell">
        <strong>{totals.solved}</strong> solved{solveRate !== null ? ` · ${solveRate}% solve rate` : ""}
      </span>
      <span className="stat-cell">
        <strong>{fmtHours(totals.activeMs)}</strong> active time
      </span>
    </div>
  );
}

function ActivityChart({ daily }: { daily: DashboardData["daily"] }) {
  // Zero-fill the last 30 days so skipped days render as empty bars.
  const days = useMemo(() => {
    const byDate = new Map(daily.map((d) => [d.date, d]));
    const today = Date.now();
    const out: DashboardData["daily"] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today - i * DAY_MS).toISOString().slice(0, 10);
      out.push(byDate.get(date) ?? { date, attempts: 0, solved: 0, activeMs: 0 });
    }
    return out;
  }, [daily]);

  const maxAttempts = Math.max(1, ...days.map((d) => d.attempts));

  return (
    <div>
      <h4 className="plan-subhead">Activity (last 30 days)</h4>
      <div className="activity-chart">
        {days.map((d) => (
          <div
            key={d.date}
            className="activity-day"
            data-date={d.date}
            title={`${d.date} · ${d.attempts} attempts · ${d.solved} solved · ${fmtHours(d.activeMs)}`}
          >
            {d.attempts > 0 ? (
              <div className="activity-bar-stack" style={{ height: `${(d.attempts / maxAttempts) * 100}%` }}>
                {d.solved > 0 && (
                  <div
                    className="activity-bar-solved"
                    style={{ height: `${(d.solved / d.attempts) * 100}%` }}
                  />
                )}
                <div className="activity-bar" style={{ flex: 1 }} />
              </div>
            ) : (
              <div className="activity-bar-empty" />
            )}
          </div>
        ))}
      </div>
      <p className="text-muted" style={{ fontSize: "0.85em", marginBottom: 0 }}>
        Dark segment = solved; full bar = attempts.
      </p>
    </div>
  );
}

function TopicBars({ topics }: { topics: DashboardData["topics"] }) {
  const visible = topics.slice(0, TOPIC_CAP);
  const maxTopic = Math.max(1, ...visible.map((t) => t.attempts));
  return (
    <div>
      <h4 className="plan-subhead">Topics practiced</h4>
      {visible.map((t) => (
        <Link className="tag-row" key={t.topic} to={`/roadmap?topic=${t.topic}`} title={`Roadmap: ${t.label}`}>
          <span className="tag-name">{t.label}</span>
          <div className="tag-track">
            <div className="tag-fill" style={{ width: `${(t.attempts / maxTopic) * 100}%` }} />
          </div>
          <span className="text-muted">
            {t.attempts} attempts ({t.solved} solved)
          </span>
        </Link>
      ))}
      {topics.length > TOPIC_CAP && (
        <p className="text-muted" style={{ margin: "0.5rem 0 0" }}>
          <Link to="/roadmap">See all topics on the roadmap</Link>
        </p>
      )}
    </div>
  );
}

function RecentResults({ recentSessions }: { recentSessions: DashboardRecentSession[] }) {
  if (recentSessions.length === 0) return null;
  return (
    <div>
      <h4 className="plan-subhead">Recent results</h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {recentSessions.map((s) => (
          <li key={s.id} style={{ padding: "0.3rem 0", borderBottom: "1px solid var(--color-border)" }}>
            <Link to={`/sessions/${s.id}`}>{s.problem.title}</Link>{" "}
            <span className="text-muted">{new Date(s.finishedAt).toLocaleDateString()}</span>{" "}
            <span>{s.outcome ?? "no submissions"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecordSection({ data }: { data: DashboardData }) {
  return (
    <Card className="dashboard-record">
      <h3>The record</h3>
      <StatStrip totals={data.totals} />
      {data.daily.length === 0 ? (
        <EmptyState message="No activity yet — sessions you record will appear here." />
      ) : (
        <ActivityChart daily={data.daily} />
      )}
      {data.topics.length === 0 ? (
        <EmptyState message="No topics yet — practice tagged problems to see the distribution." />
      ) : (
        <TopicBars topics={data.topics} />
      )}
      <RecentResults recentSessions={data.recentSessions} />
    </Card>
  );
}

/* ---------- Page ---------- */

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardData>("/api/ui/dashboard")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p>Loading dashboard…</p>;

  const hasSessions = data.totals.sessions > 0 || data.activeSession !== null;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <NextUpStrip activeSession={data.activeSession} plan={data.plan} hasSessions={hasSessions} />
      <div className="dashboard-grid">
        <PlanCard plan={data.plan} pastPlans={data.pastPlans} />
        <RecordSection data={data} />
      </div>
    </div>
  );
}
