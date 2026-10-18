import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/*
 * Merge checks + judge outputs for every fixture in a run root into
 * report.md, and validate judge output (all eight dimensions, integer
 * scores 1..5, evidence for scores <= 3).
 *
 *   tsx agent/evals/lib/report.ts <run-root>
 *
 * Expects <run-root>/<fixture>/{checks.json,judge.json}.
 */

const DIMENSIONS = [
  "grounding",
  "ladder_continuity",
  "targeting",
  "coaching",
  "hygiene",
  "reason_quality",
  "memory",
  "efficiency",
] as const;

const [runRoot] = process.argv.slice(2);
if (!runRoot) {
  console.error("usage: tsx agent/evals/lib/report.ts <run-root>");
  process.exit(1);
}

const rubricText = readFileSync("agent/planning-rubric.md", "utf8");
const rubricVersion = (rubricText.match(/\*\*Version:\*\*\s*(\d+)/) ?? [])[1] ?? "unknown";
const skillText = readFileSync("agent/skills/leeter-plan/SKILL.md", "utf8");
const fingerprint = createHash("sha256")
  .update(rubricText)
  .update(skillText)
  .digest("hex")
  .slice(0, 12);

const fixtureDirs = ["f1-first-run", "f2-mid-ladder", "f3-plateau", "f4-stale-memory"].filter((f) => {
  try {
    readFileSync(path.join(runRoot, f, "checks.json"));
    return true;
  } catch {
    return false;
  }
});

interface DimScore {
  score: number;
  evidence: string;
}
interface JudgeOut {
  dimensions: Record<string, DimScore>;
  notes?: string;
}

const lines: string[] = [];
const perDimension: Record<string, number[]> = {};
let totalCells = 0;
let filledCells = 0;

lines.push(`# Planning eval report`);
lines.push("");
lines.push(`- Run root: \`${runRoot}\``);
lines.push(`- Rubric version: ${rubricVersion}`);
lines.push(`- Rubric + skill fingerprint: ${fingerprint}`);

for (const fixture of fixtureDirs) {
  const dir = path.join(runRoot, fixture);
  lines.push("");
  lines.push(`## ${fixture}`);

  // Scripted checks
  const checks = JSON.parse(readFileSync(path.join(dir, "checks.json"), "utf8"));
  lines.push("");
  lines.push(`**Scripted checks:** ${checks.passed}/${checks.total} passed.`);
  for (const c of checks.checks as Array<{ name: string; pass: boolean; detail: string; dimension?: number }>) {
    if (!c.pass || c.dimension === undefined) {
      lines.push(`- ${c.pass ? "pass" : "FAIL"} \`${c.name}\`${c.dimension ? ` (dim ${c.dimension})` : ""}: ${c.detail}`);
    }
  }

  // Judge scores
  let judge: JudgeOut;
  try {
    judge = JSON.parse(readFileSync(path.join(dir, "judge.json"), "utf8"));
  } catch {
    lines.push("");
    lines.push(`**Judge:** MISSING or malformed — fixture not scored.`);
    continue;
  }

  lines.push("");
  lines.push("**Judge scores:**");
  lines.push("");
  lines.push("| dimension | score | evidence |");
  lines.push("|---|---|---|");
  for (const dim of DIMENSIONS) {
    const cell = judge.dimensions[dim];
    totalCells += 1;
    if (!cell) {
      lines.push(`| ${dim} | MISSING | (judge did not return this dimension) |`);
      continue;
    }
    filledCells += 1;
    if (cell.score <= 3 && (!cell.evidence || cell.evidence.trim().length < 5)) {
      lines.push(`| ${dim} | ${cell.score} | INVALID: score <= 3 without evidence |`);
      continue;
    }
    lines.push(`| ${dim} | ${cell.score} | ${(cell.evidence ?? "").slice(0, 140)} |`);
  }
  if (judge.notes) {
    lines.push("");
    lines.push(`Judge notes: ${judge.notes}`);
  }
}

// Aggregates
const sums: Record<string, { total: number; count: number }> = {};
for (const fixture of fixtureDirs) {
  try {
    const judge = JSON.parse(readFileSync(path.join(runRoot, fixture, "judge.json"), "utf8")) as JudgeOut;
    for (const dim of DIMENSIONS) {
      const cell = judge.dimensions[dim];
      if (!cell) continue;
      if (cell.score <= 3 && (!cell.evidence || cell.evidence.trim().length < 5)) continue;
      sums[dim] ??= { total: 0, count: 0 };
      sums[dim]!.total += cell.score;
      sums[dim]!.count += 1;
    }
  } catch {
    // fixture without a valid judge output: skipped in aggregates
  }
}

const averages = DIMENSIONS.map((dim) => ({
  dim,
  avg: sums[dim] && sums[dim]!.count > 0 ? sums[dim]!.total / sums[dim]!.count : null,
  count: sums[dim]?.count ?? 0,
}));

const scored = averages.filter((a) => a.avg !== null);
const weakest = scored.length > 0 ? scored.reduce((a, b) => (a.avg! <= b.avg! ? a : b)) : null;

lines.push("");
lines.push("## Aggregate");
lines.push("");
lines.push("| dimension | avg | fixtures scored |");
lines.push("|---|---|---|");
for (const a of averages) {
  lines.push(`| ${a.dim} | ${a.avg === null ? "—" : a.avg.toFixed(2)} | ${a.count} |`);
}
if (weakest) {
  lines.push("");
  lines.push(`**Weakest dimension:** ${weakest.dim} (avg ${weakest.avg!.toFixed(2)} over ${weakest.count} fixtures) — first prompt-iteration target.`);
}

lines.push("");
lines.push(`Cells scored: ${filledCells}/${totalCells}.`);

const out = { averages, weakest: weakest?.dim ?? null, filledCells, totalCells };
writeFileSync(path.join(runRoot, "aggregate.json"), JSON.stringify(out, null, 1));
writeFileSync(path.join(runRoot, "report.md"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
