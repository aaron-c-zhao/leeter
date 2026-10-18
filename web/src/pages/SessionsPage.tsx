import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api";
import { Chip, difficultyVariant } from "../components/Chip";

interface SessionRow {
  id: number;
  problem: { id: number; title: string; slug: string; difficulty: string; tags: string[] };
  startedAt: number;
  finishedAt: number | null;
  activeMs: number;
  status: string;
  outcome: string | null;
  reviewRequestStatus: string | null;
  reviewCount: number;
}

interface ProblemOption {
  id: number;
  title: string;
}

const difficulties = ["", "Easy", "Medium", "Hard"] as const;
const outcomes = ["", "accepted", "wrong_answer", "unsolved"] as const;

function dayStart(d: string): number | undefined {
  if (!d) return undefined;
  return new Date(`${d}T00:00:00Z`).getTime();
}

function dayEnd(d: string): number | undefined {
  if (!d) return undefined;
  return new Date(`${d}T23:59:59.999Z`).getTime();
}

export function SessionsPage() {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [problemOptions, setProblemOptions] = useState<ProblemOption[]>([]);
  const [problemId, setProblemId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ problems: ProblemOption[] }>("/api/ui/problems?limit=200")
      .then((d) => setProblemOptions(d.problems))
      .catch(() => setProblemOptions([]));
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (problemId) params.set("problemId", problemId);
    if (difficulty) params.set("difficulty", difficulty);
    if (tag) params.set("tag", tag);
    const f = dayStart(from);
    const t = dayEnd(to);
    if (f !== undefined) params.set("from", String(f));
    if (t !== undefined) params.set("to", String(t));
    if (outcome) params.set("outcome", outcome);
    try {
      setRows(await api<SessionRow[]>(`/api/ui/sessions?${params}`));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, [problemId, difficulty, tag, from, to, outcome]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h2>History</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <select value={problemId} onChange={(e) => setProblemId(e.target.value)}>
          <option value="">All problems</option>
          {problemOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d || "All difficulties"}
            </option>
          ))}
        </select>
        <input placeholder="tag (e.g. array)" value={tag} onChange={(e) => setTag(e.target.value)} style={{ width: 140 }} />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          {outcomes.map((o) => (
            <option key={o} value={o}>
              {o || "All outcomes"}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-danger">{error}</p>}
      {!rows && <p>Loading…</p>}
      {rows && rows.length === 0 && <p>No sessions match.</p>}
      {rows && rows.length > 0 && (
        <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left">Date</th>
              <th align="left">Problem</th>
              <th align="left">Difficulty</th>
              <th align="left">Active time</th>
              <th align="left">Outcome</th>
              <th align="left">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td>
                  <Link to={`/sessions/${r.id}`}>{r.problem.title}</Link>
                </td>
                <td>
                  <Chip variant={difficultyVariant(r.problem.difficulty)}>{r.problem.difficulty}</Chip>
                </td>
                <td>{Math.round(r.activeMs / 60000)} min</td>
                <td>{r.outcome ?? "—"}</td>
                <td>
                  {r.reviewRequestStatus ?? "—"}
                  {r.reviewCount > 0 && ` (${r.reviewCount})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows && <p className="text-muted">{rows.length} sessions</p>}
    </div>
  );
}
