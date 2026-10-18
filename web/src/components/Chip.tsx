import type { ReactNode } from "react";

/** Status/difficulty pill. Variant names map to the .chip-* classes in global.css. */
export type ChipVariant =
  | "neutral"
  | "success"
  | "warning"
  | "accent"
  | "diff-easy"
  | "diff-medium"
  | "diff-hard";

/** Maps a LeetCode difficulty string to the matching chip variant. */
export function difficultyVariant(difficulty: string): ChipVariant {
  if (difficulty === "Easy") return "diff-easy";
  if (difficulty === "Medium") return "diff-medium";
  if (difficulty === "Hard") return "diff-hard";
  return "neutral";
}

const variantClass: Record<ChipVariant, string> = {
  neutral: "chip",
  success: "chip chip-success",
  warning: "chip chip-warning",
  accent: "chip chip-accent",
  "diff-easy": "chip chip-diff-easy",
  "diff-medium": "chip chip-diff-medium",
  "diff-hard": "chip chip-diff-hard",
};

export function Chip({ variant = "neutral", title, children }: { variant?: ChipVariant; title?: string; children: ReactNode }) {
  return (
    <span className={variantClass[variant]} title={title}>
      {children}
    </span>
  );
}
