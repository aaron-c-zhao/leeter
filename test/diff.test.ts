import { describe, expect, it } from "vitest";
import { diffLines, hasChanges } from "../web/src/lib/diff";

describe("diffLines", () => {
  it("marks removed and added lines", () => {
    const d = diffLines("a\nb\nc", "a\nx\nc");
    expect(d).toEqual([
      { marker: " ", text: "a" },
      { marker: "-", text: "b" },
      { marker: "+", text: "x" },
      { marker: " ", text: "c" },
    ]);
    expect(hasChanges(d)).toBe(true);
  });

  it("identical inputs produce only context lines", () => {
    const d = diffLines("same\nlines", "same\nlines");
    expect(d.every((l) => l.marker === " ")).toBe(true);
    expect(hasChanges(d)).toBe(false);
  });

  it("handles pure additions and pure removals", () => {
    expect(diffLines("", "new").map((l) => l.marker)).toEqual(["+"]);
    expect(diffLines("old", "").map((l) => l.marker)).toEqual(["-"]);
    expect(diffLines("a\nb", "a\nb\nc").map((l) => l.marker)).toEqual([" ", " ", "+"]);
  });
});
