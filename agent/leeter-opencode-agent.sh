#!/usr/bin/env bash
# AGENT_CMD implementation that uses opencode itself as the reviewing agent.
# Called by leeter-agent-run.sh with four trailing arguments:
#   $1 prompt file (task briefing)   $2 session context JSON
#   $3 raw JSONL session log         $4 output file for the review JSON
set -euo pipefail

prompt="$1"; ctx="$2"; log="$3"; out="$4"

opencode run "You are acting as the leeter reviewing agent.
1. Read your full task briefing in $prompt
2. The session context (problem metadata, description, notes, prior reviews) is in $ctx
3. The raw session log (JSONL, schema v1) is in $log
4. Analyze the solving process — draft evolution between snapshots, failed submissions, notes, timing
5. Write ONLY the review JSON object described in the briefing to $out (create/overwrite it)

Do not call the leeter API yourself; the caller posts the review. If the log is missing events, review what exists and say so."
