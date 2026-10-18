export type DiffLine = { marker: " " | "-" | "+"; text: string };

/**
 * Minimal LCS-based line diff between two texts.
 * Produces a unified-ish stream of lines with -, +, and context markers.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.length === 0 ? [] : before.split("\n");
  const b = after.length === 0 ? [] : after.split("\n");

  const n = a.length;
  const m = b.length;
  // LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ marker: " ", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ marker: "-", text: a[i] });
      i++;
    } else {
      out.push({ marker: "+", text: b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ marker: "-", text: a[i] });
    i++;
  }
  while (j < m) {
    out.push({ marker: "+", text: b[j] });
    j++;
  }
  return out;
}

export function hasChanges(diff: DiffLine[]): boolean {
  return diff.some((l) => l.marker !== " ");
}
