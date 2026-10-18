import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Build the judge brief for one fixture evaluation. The judge scores the
 * captured planning run against the rubric. It sees the rubric, the seeded
 * ground truth (what the planner could know), and the captured artifacts
 * (what the planner actually produced) — never the planner's own reasoning
 * (design D6).
 *
 *   tsx agent/evals/lib/judge.ts <fixture-name> <workdir>
 *
 * Writes <workdir>/judge-brief.md; run.sh feeds it to opencode, which must
 * write <workdir>/judge.json.
 */

const evRoot = path.dirname(fileURLToPath(import.meta.url)); // agent/evals/lib
const rubricPath = path.join(evRoot, "..", "..", "planning-rubric.md");

const [fixtureName, workdir] = process.argv.slice(2);
if (!fixtureName || !workdir) {
  console.error("usage: tsx agent/evals/lib/judge.ts <fixture-name> <workdir>");
  process.exit(1);
}

const rubric = readFileSync(rubricPath, "utf8");
const groundtruth = readFileSync(path.join(workdir, "groundtruth.json"), "utf8");
const captured = readFileSync(path.join(workdir, "captured.json"), "utf8");
const checks = readFileSync(path.join(workdir, "checks.json"), "utf8");

const brief = `# You are the leeter plan-quality judge

You score ONE captured planning run against the quality rubric below. You did
not run the planner; you see only what the planner could know (the seeded
ground truth) and what it produced (captured artifacts).

## Scoring rules

- Score dimensions 2-9 (grounding, ladder_continuity, targeting, coaching,
  hygiene, reason_quality, memory, efficiency). Dimension 1 (structural
  validity) is checked by the deterministic scripted checks — do not score it.
- 1 (bad) to 5 (excellent), integers only.
- **Evidence rule:** any score <= 3 must cite evidence — a digest field
  value, a quoted memory line, a plan item, a check result. A low score
  without evidence is an invalid judgment.
- Judge the output, not the effort. Use exactly the rubric anchors.

## Scripted checks (authoritative facts, computed from server data)

\`\`\`json
${checks}
\`\`\`

## Captured artifacts (what the planner produced)

\`\`\`json
${captured}
\`\`\`

## Seeded ground truth (what the planner could know)

\`\`\`json
${groundtruth}
\`\`\`

## Rubric (canonical)

${rubric}

## Your output

Write ONLY a JSON object to ${path.join(workdir, "judge.json")} (create or
overwrite it), exactly this shape — no other text in the file:

\`\`\`json
{
  "dimensions": {
    "grounding":        { "score": 1, "evidence": "..." },
    "ladder_continuity":{ "score": 1, "evidence": "..." },
    "targeting":        { "score": 1, "evidence": "..." },
    "coaching":         { "score": 1, "evidence": "..." },
    "hygiene":          { "score": 1, "evidence": "..." },
    "reason_quality":   { "score": 1, "evidence": "..." },
    "memory":           { "score": 1, "evidence": "..." },
    "efficiency":       { "score": 1, "evidence": "..." }
  },
  "notes": "optional overall observations"
}
\`\`\`

All eight dimensions are required. Vacuous-pass cases (e.g. no completed
reviews exist for the coaching dimension) score 5 with a one-line note in
evidence, per the rubric.
`;

writeFileSync(path.join(workdir, "judge-brief.md"), brief);
console.log(`judge brief written: ${path.join(workdir, "judge-brief.md")}`);
