#!/usr/bin/env bash
# leeter agent runner — workstation cron job / manual trigger.
#
# Discovers pending review requests on a leeter instance, fetches each
# session's review context (log + problem metadata), invokes your agent CLI to
# produce a review, and posts the review back to leeter. The app never
# launches agents; this script is the entire integration (design D7).
#
# Required environment:
#   LEETER_URL    e.g. http://leeter.home.lan:8080
#   LEETER_TOKEN  the agent bearer token (DATA_DIR/agent-token on the server)
#   AGENT_CMD     your agent CLI invocation. Placeholders:
#                   {prompt}   -> file with the review instructions
#                   {context}  -> file with session context JSON (log, problem,
#                                 notes, past reviews)
#                   {log}      -> file with the raw JSONL session log
#                   {out}      -> file the agent must write the review JSON to
#                 Placeholders are substituted; if none are present the four
#                 paths are appended as trailing arguments.
#
# Optional:
#   LEETER_SESSION_ID  only process the pending request for this session id
#
# Exit codes: 0 ok (or nothing pending), 1 setup error, 2 agent/review error.
set -euo pipefail

LEETER_URL="${LEETER_URL:?set LEETER_URL (e.g. http://leeter.home.lan:8080)}"
LEETER_TOKEN="${LEETER_TOKEN:?set LEETER_TOKEN}"
AGENT_CMD="${AGENT_CMD:?set AGENT_CMD (agent CLI invocation)}"
ONLY_SESSION="${LEETER_SESSION_ID:-}"

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work_root="${LEETER_WORK_DIR:-$repo_root/data/agent-work}"
mkdir -p "$work_root"
work="$(mktemp -d "$work_root/leeter-review-XXXXXX")"
trap 'rm -rf "$work"' EXIT

auth=(-H "Authorization: Bearer $LEETER_TOKEN")

review_prompt() {
  local ctxf="$1" logf="$2" outf="$3"
  cat <<PROMPT
You are a coding-interview coach reviewing a LeetCode practice session.

The session context file $ctxf contains JSON with:
  - problem: title, difficulty, description (HTML), tags
  - session: notes taken during practice, existing reviews, timing
  - log:     the raw session log (JSONL) — also written standalone to $logf

The log's header line carries the schema_version; each following line is one
event with type, offset_ms and payload. Event types include session lifecycle
markers, "snapshot" (full code at a moment), "copy_out", "note_change", and
"submission" (LeetCode verdict, code, runtime).

Analyze the solving PROCESS: how the draft evolved between snapshots, where the
attempts went, what the notes say, and the final LeetCode verdicts (including
failed submissions).

Write ONLY a JSON object to the file $outf, with
exactly these fields (strings; unknown fields are rejected by the server):
  observations       what happened in the session
  strengths          what went well
  weaknesses         what needs work
  recommended_focus  concrete next steps / practice suggestions
  overall            (optional) short verdict like "good" | "needs_work"
PROMPT
}

process_session() {
  local request_id="$1" session_id="$2"
  local ctx="$work/$session_id-context.json" logf="$work/$session_id-log.jsonl"
  local promptf="$work/$session_id-prompt.md" outf="$work/$session_id-review.json"

  echo "→ claiming review request $request_id (session $session_id)"
  if ! curl -sf "${auth[@]}" -X POST "$LEETER_URL/api/agent/reviews/requests/$request_id/claim" >/dev/null; then
    echo "  ! claim failed, skipping" >&2
    return 1
  fi

  if ! curl -sf "${auth[@]}" "$LEETER_URL/api/agent/sessions/$session_id" >"$ctx"; then
    echo "  ! context fetch failed for session $session_id" >&2
    return 1
  fi
  jq -r '.log' "$ctx" >"$logf"
  review_prompt "$ctx" "$logf" "$outf" >"$promptf"

  local cmd="$AGENT_CMD"
  local has_placeholder=0
  for ph in '{prompt}' '{context}' '{log}' '{out}'; do
    [[ "$cmd" == *"$ph"* ]] && has_placeholder=1
  done
  if [[ "$has_placeholder" == 1 ]]; then
    cmd=${cmd//\{prompt\}/$promptf}
    cmd=${cmd//\{context\}/$ctx}
    cmd=${cmd//\{log\}/$logf}
    cmd=${cmd//\{out\}/$outf}
    eval "$cmd"
  else
    eval "$cmd" "$promptf" "$ctx" "$logf" "$outf"
  fi

  if [[ ! -s "$outf" ]]; then
    echo "  ! agent produced no review file (session $session_id)" >&2
    return 1
  fi

  local status
  status=$(curl -s -o "$work/post-result.json" -w "%{http_code}" "${auth[@]}" \
    -H "Content-Type: application/json" \
    -X POST "$LEETER_URL/api/agent/sessions/$session_id/reviews" \
    -d @"$outf")
  if [[ "$status" != "200" ]]; then
    echo "  ! review post failed (HTTP $status): $(cat "$work/post-result.json")" >&2
    return 1
  fi
  echo "  ✓ review stored for session $session_id"
}

pending=$(curl -sf "${auth[@]}" "$LEETER_URL/api/agent/reviews/pending")
total=$(echo "$pending" | jq 'length')
echo "pending review requests: $total"

echo "$pending" | jq -c '.[]' | while read -r row; do
  request_id=$(echo "$row" | jq -r '.requestId')
  session_id=$(echo "$row" | jq -r '.sessionId')
  if [[ -n "$ONLY_SESSION" && "$session_id" != "$ONLY_SESSION" ]]; then
    continue
  fi
  process_session "$request_id" "$session_id" || echo "  ! session $session_id processing failed" >&2
done
