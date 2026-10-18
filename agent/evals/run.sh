#!/usr/bin/env bash
# Leeter planning-prompt eval: for each fixture, seed a scratch instance,
# run the leeter-plan skill against it, capture what it did, run scripted
# checks + the rubric judge, and emit a report.
#
#   agent/evals/run.sh [fixture ...]      # default: all four fixtures
#
# Requires: opencode on PATH (planner and judge), jq. Costs model tokens —
# manual/nightly loop, never part of npm run test.
#
# Results: agent/evals/runs/<timestamp>/<fixture>/{groundtruth,captured,
# checks,judge}.json + report.md + aggregate.json at the run root.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

command -v opencode >/dev/null || { echo "opencode is required on PATH" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

if [[ $# -gt 0 ]]; then
  FIXTURES=("$@")
else
  FIXTURES=(f1-first-run f2-mid-ladder f3-plateau f4-stale-memory)
fi
RUN_ROOT="agent/evals/runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_ROOT"

for fixture in "${FIXTURES[@]}"; do
  work="$RUN_ROOT/$fixture"
  mkdir -p "$work"
  echo "=== $fixture (work: $work)"

  # 1. Boot the seeded scratch instance in the background.
  npx tsx agent/evals/lib/boot.ts "$fixture" "$work" &
  boot_pid=$!
  trap 'kill $boot_pid 2>/dev/null || true' EXIT

  # 2. Wait for the instance to publish its address.
  for _ in $(seq 1 30); do
    [[ -f "$work/instance.json" ]] && break
    sleep 1
  done
  [[ -f "$work/instance.json" ]] || { echo "boot failed for $fixture" >&2; exit 1; }
  base_url="$(jq -r .baseUrl "$work/instance.json")"
  token="$(jq -r .token "$work/instance.json")"

  # 3. Run the planner (the skill IS the prompt under test).
  cat > "$work/planner-brief.md" <<BRIEF
You are acting as the leeter planning agent for one full planning cycle.
Use your leeter-plan skill as your operating procedure.

Leeter instance: $base_url
Token: in the LEETER_TOKEN environment variable (Authorization: Bearer).

Run one cycle end to end:
1. Read the progress digest, your memory, the session list (find paused
   sessions and completed reviews), and the problem bank.
2. Read the quality rubric at agent/planning-rubric.md and hold yourself to
   all nine dimensions.
3. POST one revised training plan (chained via based_on / carried_from).
4. PUT your updated memory notebook.

Everything goes through /api/agent/* endpoints. The instance has no LeetCode
credentials — never trigger a sync.
BRIEF
  if ! LEETER_URL="$base_url" LEETER_TOKEN="$token" opencode run "$(cat "$work/planner-brief.md")"; then
    echo "planner run failed for $fixture" >&2
    kill $boot_pid 2>/dev/null || true
    exit 1
  fi

  kill $boot_pid 2>/dev/null || true
  wait $boot_pid 2>/dev/null || true
  trap - EXIT

  # 4. Capture what was stored, run scripted checks.
  npx tsx agent/evals/lib/capture.ts "$fixture" "$work"
  npx tsx agent/evals/lib/checks.ts "$fixture" "$work"

  # 5. Judge: opencode reads the brief, writes judge.json (retry once).
  npx tsx agent/evals/lib/judge.ts "$fixture" "$work"
  for attempt in 1 2; do
    if opencode run "Read the judge brief at $work/judge-brief.md and follow it exactly: write the required JSON to $work/judge.json. Judge output only."; then
      python3 - "$work/judge.json" <<'PYVALIDATE' && break
import json, sys
path = sys.argv[1]
required = ["grounding", "ladder_continuity", "targeting", "coaching", "hygiene", "reason_quality", "memory", "efficiency"]
d = json.load(open(path))
assert set(d["dimensions"]) == set(required), f"dimensions mismatch: {sorted(d['dimensions'])}"
for k, v in d["dimensions"].items():
    assert isinstance(v.get("score"), int) and 1 <= v["score"] <= 5, f"bad score for {k}"
    if v["score"] <= 3:
        assert isinstance(v.get("evidence"), str) and len(v["evidence"].strip()) >= 5, f"evidence missing for {k}"
PYVALIDATE
      break
    fi
    [[ $attempt == 2 ]] && { echo "judge failed twice for $fixture" >&2; exit 1; }
  done
done

# 6. Report
npx tsx agent/evals/lib/report.ts "$RUN_ROOT"
