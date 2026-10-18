import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../api";
import { toast } from "../components/toastBus";
import { Chip, difficultyVariant } from "../components/Chip";

interface ProblemRow {
  id: number;
  lcId: number;
  title: string;
  slug: string;
  difficulty: string;
  tags: string[];
  hasDescription: boolean;
}

interface ProblemsResponse {
  total: number;
  problems: ProblemRow[];
}

interface BankSyncResult {
  fetched: number;
  stored: number;
  updated: number;
}

interface SubmissionSyncResult {
  fetched: number;
  newSubmissions: number;
}

const difficulties = ["", "Easy", "Medium", "Hard"] as const;

export function BankPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProblemsResponse | null>(null);
  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [syncingBank, setSyncingBank] = useState(false);
  const [syncingSub, setSyncingSub] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (difficulty) params.set("difficulty", difficulty);
    params.set("limit", "100");
    try {
      setData(await api<ProblemsResponse>(`/api/ui/problems?${params}`));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, { error: { message: String(err) } }));
    }
  }, [q, difficulty]);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncBankNow() {
    setSyncingBank(true);
    setError(null);
    try {
      const result = await api<BankSyncResult>("/api/ui/sync/bank", { method: "POST" });
      toast.success(
        `Bank sync: ${result.fetched} fetched, ${result.stored} new, ${result.updated} updated. Descriptions enrich in the background.`,
      );
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : String(err);
      toast.error(`Bank sync failed: ${message}`);
      setError(err instanceof ApiError ? err : new ApiError(500, { error: { message } }));
    } finally {
      setSyncingBank(false);
    }
  }

  async function syncSubmissions(problemId: number) {
    setSyncingSub(problemId);
    try {
      const result = await api<SubmissionSyncResult>("/api/ui/sync/submissions", {
        method: "POST",
        body: JSON.stringify({ problemId }),
      });
      toast.success(`Submission sync: ${result.fetched} fetched, ${result.newSubmissions} new`);
    } catch (err) {
      toast.error(`Submission sync failed: ${err instanceof ApiError ? err.message : String(err)}`);
    } finally {
      setSyncingSub(null);
    }
  }

  async function startSession(problemId: number) {
    try {
      const { sessionId } = await api<{ sessionId: number }>("/api/ui/sessions", {
        method: "POST",
        body: JSON.stringify({ problemId }),
      });
      navigate(`/sessions/${sessionId}`);
    } catch (err) {
      toast.error(`Could not start session: ${err instanceof ApiError ? err.message : String(err)}`);
    }
  }

  return (
    <div>
      <h2>Problem bank</h2>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
        <input
          placeholder="Search title or slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d || "All difficulties"}
            </option>
          ))}
        </select>
        <button onClick={syncBankNow} disabled={syncingBank}>
          {syncingBank ? "Syncing..." : "Sync bank"}
        </button>
      </div>

      {error && (
        <div className="text-danger" style={{ marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
          Sync failed ({error.kind ?? "http"}): {error.message}
        </div>
      )}

      {!data && <p>Loading bank…</p>}
      {data && data.total === 0 && <p>Bank is empty — run "Sync bank" to pull from LeetCode.</p>}
      {data && data.total > 0 && (
        <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left">#</th>
              <th align="left">Title</th>
              <th align="left">Difficulty</th>
              <th align="left">Tags</th>
              <th align="left"></th>
            </tr>
          </thead>
          <tbody>
            {data.problems.map((p) => (
              <tr key={p.id}>
                <td>{p.lcId}</td>
                <td>
                  <a href={`https://leetcode.com/problems/${p.slug}/`} target="_blank" rel="noreferrer">
                    {p.title}
                  </a>
                  {p.hasDescription ? "" : " (no description yet)"}
                </td>
                <td>
                  <Chip variant={difficultyVariant(p.difficulty)}>{p.difficulty}</Chip>
                </td>
                <td className="text-muted" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.tags.join(", ")}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => startSession(p.id)}>Start session</button>{" "}
                  <button onClick={() => syncSubmissions(p.id)} disabled={syncingSub === p.id}>
                    {syncingSub === p.id ? "Syncing..." : "Sync submissions"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && <p className="text-muted">{data.total} problems in bank (showing {data.problems.length})</p>}
    </div>
  );
}
