import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { marked } from "marked";
import { diffLines, hasChanges, type DiffLine } from "../lib/diff";
import { ApiError, api } from "../api";
import { useTheme } from "../theme";
import { Chip, difficultyVariant } from "../components/Chip";
import { toast } from "../components/toastBus";

interface TimelineEvent {
  seq: number;
  type: string;
  ts: number;
  payload: Record<string, unknown>;
}

interface Review {
  id: number;
  observations: string;
  strengths: string;
  weaknesses: string;
  recommendedFocus: string;
  overall: string | null;
  createdAt: number;
}

interface PlanOrigin {
  planItemId: number;
  reason: string;
  planId: number;
  planCreatedAt: number;
}

interface SessionDetail {
  id: number;
  problem: { id: number; title: string; slug: string; difficulty: string; tags: string[]; description: string } | null;
  startedAt: number;
  finishedAt: number | null;
  activeMs: number;
  runningSince: number | null;
  status: "active" | "paused" | "finished";
  timeline: TimelineEvent[];
  notes: string;
  reviews: Review[];
  reviewRequestStatus: string | null;
  planOrigin: PlanOrigin | null;
}

const LANGS = [
  { value: "python3", label: "Python", monaco: "python" },
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "typescript", label: "TypeScript", monaco: "typescript" },
  { value: "java", label: "Java", monaco: "java" },
  { value: "cpp", label: "C++", monaco: "cpp" },
  { value: "go", label: "Go", monaco: "go" },
];

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(sec).padStart(2, "0")}s`;
}

function fmtOffset(ts: number, startedAt: number): string {
  return `+${fmtMs(Math.max(0, ts - startedAt))}`;
}

function eventLabel(e: TimelineEvent): string {
  switch (e.type) {
    case "session_started":
      return "Session started";
    case "problem_opened":
      return `Problem opened: ${String(e.payload.problem_slug ?? "")}`;
    case "session_paused":
      return "Paused";
    case "session_resumed":
      return "Resumed";
    case "session_finished":
      return `Finished (active ${fmtMs(Number(e.payload.active_ms ?? 0))})`;
    case "snapshot":
      return `Snapshot${e.payload.label ? ` — ${String(e.payload.label)}` : ""}`;
    case "copy_out":
      return `Copied draft to clipboard (${String(e.payload.language ?? "")})`;
    case "note_change":
      return `Notes updated (${String(e.payload.size ?? 0)} chars)`;
    case "submission":
      return `LC submission: ${String(e.payload.verdict ?? "")}`;
    default:
      return e.type;
  }
}

export function SessionDetailPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const { theme } = useTheme();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python3");
  const [dirty, setDirty] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesPreview, setNotesPreview] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<TimelineEvent | null>(null);
  const [diffA, setDiffA] = useState<number | null>(null);
  const [diffB, setDiffB] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const dirtyRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const d = await api<SessionDetail>(`/api/ui/sessions/${sessionId}`);
      setDetail(d);
      setNotes(d.notes);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live elapsed time ticker.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedMs = useMemo(() => {
    if (!detail) return 0;
    return detail.runningSince !== null ? detail.activeMs + (Date.now() - detail.runningSince) : detail.activeMs;
  }, [detail]);

  const latestSnapshot = useMemo(() => {
    const snaps = detail?.timeline.filter((e) => e.type === "snapshot") ?? [];
    return snaps.length > 0 ? snaps[snaps.length - 1] : null;
  }, [detail]);

  // Initialize pad code once per session load.
  const initialized = useRef(false);
  useEffect(() => {
    if (detail && !initialized.current) {
      initialized.current = true;
      setCode(latestSnapshot ? String(latestSnapshot.payload.code ?? "") : "");
    }
  }, [detail, latestSnapshot]);

  // Autosave snapshot every 30s while dirty and session active.
  useEffect(() => {
    if (detail?.status !== "active") return;
    const t = setInterval(() => {
      if (dirtyRef.current) void saveSnapshot(true);
    }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.status]);

  // Notes debounced incremental persistence.
  useEffect(() => {
    if (!notesDirty) return;
    const t = setTimeout(async () => {
      try {
        await api(`/api/ui/sessions/${sessionId}/notes`, { method: "PUT", body: JSON.stringify({ body: notes }) });
        setNotesDirty(false);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : String(err));
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  async function lifecycle(action: "pause" | "resume" | "finish") {
    try {
      await api(`/api/ui/sessions/${sessionId}/${action}`, { method: "POST" });
      toast.success(action === "pause" ? "Session paused" : action === "resume" ? "Session resumed" : "Session finished");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function saveSnapshot(autosave = false) {
    try {
      await api(`/api/ui/sessions/${sessionId}/snapshots`, {
        method: "POST",
        body: JSON.stringify({ code, language, label: autosave ? "autosave" : undefined }),
      });
      setDirty(false);
      dirtyRef.current = false;
      if (!autosave) toast.success("Snapshot saved");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function copyOut() {
    try {
      await navigator.clipboard.writeText(code);
      await api(`/api/ui/sessions/${sessionId}/copy-out`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
      });
      toast.success("Draft copied to clipboard");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function syncSubmissions() {
    if (!detail?.problem) return;
    setSyncing(true);
    try {
      const result = await api<{ fetched: number; newSubmissions: number }>("/api/ui/sync/submissions", {
        method: "POST",
        body: JSON.stringify({ problemId: detail.problem.id }),
      });
      toast.success(`Submission sync: ${result.fetched} fetched, ${result.newSubmissions} new`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function reviewAction(action: "request" | "cancel") {
    try {
      await api(`/api/ui/sessions/${sessionId}/review-request`, { method: action === "request" ? "POST" : "DELETE" });
      toast.success(action === "request" ? "Review requested" : "Review request cancelled");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    }
  }

  const notesHtml = useMemo(() => marked.parse(notes, { async: false }) as string, [notes]);

  if (!detail && !error) return <p>Loading session…</p>;
  if (error && !detail) return <p className="text-danger">{error}</p>;
  if (!detail) return null;

  const editable = detail.status === "active" || detail.status === "paused";

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>
          {detail.problem ? (
            <a href={`https://leetcode.com/problems/${detail.problem.slug}/`} target="_blank" rel="noreferrer">
              {detail.problem.title}
            </a>
          ) : (
            `Session ${detail.id}`
          )}
        </h2>
        {detail.problem && (
          <Chip variant={difficultyVariant(detail.problem.difficulty)}>{detail.problem.difficulty}</Chip>
        )}
        {detail.planOrigin && (
          <Chip variant="accent" title={`Plan ${detail.planOrigin.planId}: ${detail.planOrigin.reason}`}>
            from plan
          </Chip>
        )}
        <span>Active time: {fmtMs(elapsedMs)}</span>
        <span style={{ fontWeight: "bold" }}>{detail.status}</span>
        {detail.status !== "finished" && (
          <>
            {detail.status === "active" ? (
              <button onClick={() => lifecycle("pause")}>Pause</button>
            ) : (
              <button onClick={() => lifecycle("resume")}>Resume</button>
            )}
            <button onClick={() => lifecycle("finish")}>Finish session</button>
          </>
        )}
        <button onClick={syncSubmissions} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync LC submissions"}
        </button>
        {detail.reviewRequestStatus === "pending" || detail.reviewRequestStatus === "in_progress" ? (
          <button onClick={() => reviewAction("cancel")}>Cancel review request</button>
        ) : (
          detail.status === "finished" && <button onClick={() => reviewAction("request")}>Request agent review</button>
        )}
        {detail.reviewRequestStatus && <span>review: {detail.reviewRequestStatus}</span>}
      </div>
      {error && <p className="text-danger">{error}</p>}

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        {editable && (
          <div style={{ flex: "2 1 480px", minWidth: 420 }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button onClick={() => saveSnapshot(false)} disabled={detail.status !== "active"}>
                Save snapshot
              </button>
              <button onClick={() => saveSnapshot(true)} disabled={detail.status !== "active"}>
                Save (autosave)
              </button>
              <button onClick={copyOut}>Copy out → LeetCode</button>
              <span className="text-muted">{dirty ? "unsaved changes" : ""}</span>
            </div>
            <Editor
              height="480px"
              theme={theme === "dark" ? "vs-dark" : "vs"}
              language={LANGS.find((l) => l.value === language)?.monaco}
              value={code}
              onChange={(v) => {
                setCode(v ?? "");
                setDirty(true);
                dirtyRef.current = true;
              }}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
            <p className="text-muted" style={{ fontSize: "0.85em" }}>
              The pad never executes code — judging happens on leetcode.com. Snapshot on save; autosave every 30s while
              editing.
            </p>
          </div>
        )}

        <div style={{ flex: "1 1 320px", minWidth: 320 }}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <strong>Notes (markdown)</strong>
            <button onClick={() => setNotesPreview((p) => !p)}>{notesPreview ? "Edit" : "Preview"}</button>
          </div>
          {notesPreview ? (
            <div
              className="md"
              style={{ border: "1px solid var(--color-border)", padding: "0.5rem", minHeight: "300px" }}
              dangerouslySetInnerHTML={{ __html: notesHtml }}
            />
          ) : (
            <textarea
              style={{ width: "100%", minHeight: "300px", fontFamily: "monospace" }}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
              placeholder="Markdown notes — saved automatically"
            />
          )}
          <span className="text-muted" style={{ fontSize: "0.85em" }}>{notesDirty ? "saving…" : "saved"}</span>
        </div>
      </div>

      <h3 style={{ marginTop: "1.5rem" }}>Timeline</h3>
      {(() => {
        const snaps = detail.timeline.filter((e) => e.type === "snapshot");
        return snaps.length >= 2 ? (
          <div style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span>Compare snapshots:</span>
            <select value={diffA ?? ""} onChange={(e) => setDiffA(e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {snaps.map((s, idx) => (
                <option key={s.seq} value={s.seq}>
                  #{idx + 1} ({fmtOffset(s.ts, detail.startedAt)}){s.payload.label ? ` ${String(s.payload.label)}` : ""}
                </option>
              ))}
            </select>
            <span>vs</span>
            <select value={diffB ?? ""} onChange={(e) => setDiffB(e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {snaps.map((s, idx) => (
                <option key={s.seq} value={s.seq}>
                  #{idx + 1} ({fmtOffset(s.ts, detail.startedAt)}){s.payload.label ? ` ${String(s.payload.label)}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null;
      })()}
      {diffA !== null && diffB !== null && (
        <SnapshotDiff detail={detail} seqA={diffA} seqB={diffB} />
      )}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {detail.timeline.map((e) => (
          <li key={e.seq} style={{ padding: "0.35rem 0", borderBottom: "1px solid var(--color-border)" }}>
            <span className="text-muted" style={{ marginRight: "0.75rem", fontVariantNumeric: "tabular-nums" }}>
              {fmtOffset(e.ts, detail.startedAt)}
            </span>
            <strong>{eventLabel(e)}</strong>
            {e.type === "snapshot" && (
              <button style={{ marginLeft: "0.5rem" }} onClick={() => setSelectedSnapshot(e)}>
                view code
              </button>
            )}
            {e.type === "submission" && (
              <span style={{ marginLeft: "0.5rem" }}>
                {String(e.payload.runtime ?? "")} {String(e.payload.memory ?? "")}{" "}
                <button onClick={() => setSelectedSnapshot(e)}>view code</button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {selectedSnapshot && (
        <div style={{ marginTop: "1rem" }}>
          <h4>{eventLabel(selectedSnapshot)}</h4>
          <pre
            className="md"
            style={{ background: "var(--color-inset)", padding: "0.75rem", overflow: "auto", maxHeight: 400 }}
          >
            {String(selectedSnapshot.payload.code ?? "")}
          </pre>
          <button onClick={() => setSelectedSnapshot(null)}>Close</button>
        </div>
      )}

      {detail.reviews.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>Agent reviews</h3>
          {detail.reviews.map((r) => (
            <div key={r.id} style={{ border: "1px solid var(--color-border)", padding: "0.75rem", marginBottom: "0.5rem" }}>
              <p className="text-muted" style={{ marginTop: 0 }}>{new Date(r.createdAt).toLocaleString()}</p>
              {(["observations", "strengths", "weaknesses", "recommendedFocus"] as const).map(
                (k) =>
                  r[k] && (
                    <div key={k} className="md" dangerouslySetInnerHTML={{ __html: marked.parse(r[k], { async: false }) }} />
                  ),
              )}
              {r.overall && <p><strong>Overall: {r.overall}</strong></p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function SnapshotDiff({
  detail,
  seqA,
  seqB,
}: {
  detail: SessionDetail;
  seqA: number;
  seqB: number;
}) {
  const a = detail.timeline.find((e) => e.seq === seqA);
  const b = detail.timeline.find((e) => e.seq === seqB);
  if (!a || !b) return null;
  const before = String(a.payload.code ?? "");
  const after = String(b.payload.code ?? "");
  const lines: DiffLine[] = diffLines(before, after);
  return (
    <div style={{ margin: "0.75rem 0" }}>
      <h4>
        Snapshot diff (#{detail.timeline.filter((e) => e.type === "snapshot").findIndex((e) => e.seq === seqA) + 1} vs #
        {detail.timeline.filter((e) => e.type === "snapshot").findIndex((e) => e.seq === seqB) + 1})
      </h4>
      {!hasChanges(lines) && <p className="text-muted">No differences.</p>}
      {hasChanges(lines) && (
        <pre style={{ background: "var(--color-inset)", padding: "0.75rem", overflow: "auto", maxHeight: 400 }}>
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                color: l.marker === "-" ? "var(--color-danger)" : l.marker === "+" ? "var(--color-success)" : "inherit",
                opacity: l.marker === " " ? 0.55 : 1,
              }}
            >
              {l.marker} {l.text}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
