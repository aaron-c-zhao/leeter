import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api";
import { PageHeader } from "../components/PageHeader";
import { Chip, difficultyVariant } from "../components/Chip";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

/*
 * Roadmap page (knowledge-tree D5): the curated taxonomy rendered as
 * collapsible domain sections in roadmap order, each topic node with a
 * mastery bar (solved/attempts), "next focus"/"carried" chips for the
 * current plan's frontier (startable, like the dashboard's plan display),
 * and a drill-down of recently practiced problems. The curated domains sit
 * side by side on wide viewports; `/roadmap?topic=<id>` deep-links to a
 * node's expanded drill-down. Order conveys the roadmap — no graph.
 */

interface RoadmapDrillItem {
  sessionId: number;
  title: string;
  slug: string;
  difficulty: string;
  outcome: string | null;
  practicedAt: number;
}

interface RoadmapFrontierItem {
  itemId: number;
  problemId: number | null;
  title: string;
  slug: string;
  difficulty: string;
  status: string;
  carriedFrom: number | null;
}

interface RoadmapTopic {
  id: string;
  label: string;
  attempts: number;
  solved: number;
  solveRate: number;
  lastPracticedAt: number | null;
  frontier: RoadmapFrontierItem[];
  recent: RoadmapDrillItem[];
}

interface RoadmapDomain {
  id: string;
  label: string;
  topics: RoadmapTopic[];
}

interface RoadmapTree {
  taxonomyVersion: number;
  domains: RoadmapDomain[];
}

const CURATED_DOMAINS = new Set(["data-structures", "algorithms"]);

function hasCarriedUnsolved(topic: RoadmapTopic): boolean {
  return topic.frontier.some((f) => f.carriedFrom != null && f.status !== "solved");
}

function statusChip(status: string) {
  if (status === "solved") return <Chip variant="success">solved</Chip>;
  if (status === "practiced") return <Chip variant="warning">practiced</Chip>;
  return <Chip variant="neutral">not started</Chip>;
}

function FrontierStart({ problemId, planItemId }: { problemId: number; planItemId: number }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const { sessionId } = await api<{ sessionId: number }>("/api/ui/sessions", {
        method: "POST",
        body: JSON.stringify({ problemId, planItemId }),
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
      {error && <span className="text-danger">{error}</span>}
    </span>
  );
}

function FrontierList({ items }: { items: RoadmapFrontierItem[] }) {
  return (
    <ul className="roadmap-frontier">
      {items.map((f) => (
        <li key={f.itemId}>
          <a href={`https://leetcode.com/problems/${f.slug}/`} target="_blank" rel="noreferrer">
            {f.title}
          </a>
          {f.difficulty && <Chip variant={difficultyVariant(f.difficulty)}>{f.difficulty}</Chip>}
          {statusChip(f.status)}
          {f.carriedFrom !== null && f.status !== "solved" && (
            <Chip variant="warning" title="Carried unfinished item from a previous plan">
              carried
            </Chip>
          )}
          {f.problemId !== null && <FrontierStart problemId={f.problemId} planItemId={f.itemId} />}
        </li>
      ))}
    </ul>
  );
}

function TopicRow({ topic, number, expanded }: { topic: RoadmapTopic; number: number; expanded: boolean }) {
  const pct = topic.attempts > 0 ? Math.round(topic.solveRate * 100) : 0;
  return (
    <div className="roadmap-topic" data-topic-id={topic.id}>
      <details open={expanded}>
        <summary>
          <span className="roadmap-topic-title">
            {number}. {topic.label}
          </span>
          {topic.frontier.length > 0 && (
            <Chip variant="accent" title="Targeted by your current plan">
              next focus
            </Chip>
          )}
          {hasCarriedUnsolved(topic) && (
            <Chip variant="warning" title="Carried unfinished item from a previous plan">
              carried
            </Chip>
          )}
          <span className="text-muted roadmap-topic-counts">
            {topic.attempts > 0 ? `${topic.solved}/${topic.attempts} solved` : "no practice yet"}
          </span>
        </summary>
        <div className="progress-track roadmap-mastery">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-muted roadmap-mastery-label">
          {topic.attempts > 0
            ? `${pct}% solve rate · last practiced ${new Date(topic.lastPracticedAt ?? 0).toLocaleDateString()}`
            : "Nothing has been practiced here yet."}
        </p>
        {topic.frontier.length > 0 && <FrontierList items={topic.frontier} />}
        {topic.recent.length > 0 && (
          <ul className="roadmap-drill">
            {topic.recent.map((r) => (
              <li key={r.sessionId}>
                <Link to={`/sessions/${r.sessionId}`}>{r.title}</Link>
                {r.difficulty && <Chip variant={difficultyVariant(r.difficulty)}>{r.difficulty}</Chip>}
                <span className="text-muted">{r.outcome ?? "no submissions"}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

function DomainSection({
  domain,
  expandedTopicId,
  topicNumberRef,
}: {
  domain: RoadmapDomain;
  expandedTopicId: string | null;
  topicNumberRef: { current: number };
}) {
  const expanded = domain.topics.some((t) => t.id === expandedTopicId);
  return (
    <details className="roadmap-domain" key={domain.id} data-domain-id={domain.id} open={expanded}>
      <summary>
        <strong>{domain.label}</strong>{" "}
        <span className="text-muted">({domain.topics.length} topics)</span>
      </summary>
      {domain.topics.map((topic) => {
        topicNumberRef.current += 1;
        return (
          <TopicRow
            key={topic.id}
            topic={topic}
            number={topicNumberRef.current}
            expanded={topic.id === expandedTopicId}
          />
        );
      })}
    </details>
  );
}

export function RoadmapPage() {
  const [tree, setTree] = useState<RoadmapTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const expandTopicId = searchParams.get("topic");

  useEffect(() => {
    api<RoadmapTree>("/api/ui/roadmap")
      .then(setTree)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!tree) return <p>Loading roadmap…</p>;

  const curated = tree.domains.filter((d) => CURATED_DOMAINS.has(d.id));
  const other = tree.domains.find((d) => !CURATED_DOMAINS.has(d.id));
  const otherActive = other !== undefined && other.topics.some((t) => t.attempts > 0 || t.frontier.length > 0);

  const totalAttempts = tree.domains.reduce(
    (sum, d) => sum + d.topics.reduce((s, t) => s + t.attempts, 0),
    0,
  );

  const topicNumberRef = { current: 0 };
  return (
    <div>
      <PageHeader title="Roadmap" />
      {totalAttempts === 0 && (
        <EmptyState
          message="No practice sessions recorded yet — your roadmap fills in as you practice."
          actionTo="/bank"
          actionLabel="Start practicing from the problem bank"
        />
      )}
      <div className="roadmap-grid">
        {curated.map((domain) => (
          <DomainSection key={domain.id} domain={domain} expandedTopicId={expandTopicId} topicNumberRef={topicNumberRef} />
        ))}
      </div>
      {otherActive && other && (
        <DomainSection domain={other} expandedTopicId={expandTopicId} topicNumberRef={topicNumberRef} />
      )}
    </div>
  );
}
