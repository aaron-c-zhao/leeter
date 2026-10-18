/*
 * A focused candidate bank shared by fixtures — real LeetCode problems with
 * real lc_ids, spanning several curated topics so the planner has genuine
 * discovery work. Small by design (the real bank is 4000+ problems); the
 * scenarios only need plausible candidates.
 */

export interface BankEntry {
  lcId: number;
  slug: string;
  difficulty: string;
  tags: string[];
}

export const BANK: BankEntry[] = [
  { lcId: 1, slug: "two-sum", difficulty: "Easy", tags: ["array", "hash-table"] },
  { lcId: 2, slug: "add-two-numbers", difficulty: "Medium", tags: ["linked-list", "math"] },
  { lcId: 3, slug: "longest-substring-without-repeating-characters", difficulty: "Medium", tags: ["hash-table", "string", "sliding-window"] },
  { lcId: 15, slug: "3sum", difficulty: "Medium", tags: ["array", "two-pointers", "sorting"] },
  { lcId: 20, slug: "valid-parentheses", difficulty: "Easy", tags: ["string", "stack"] },
  { lcId: 49, slug: "group-anagrams", difficulty: "Medium", tags: ["hash-table", "string", "sorting"] },
  { lcId: 70, slug: "climbing-stairs", difficulty: "Easy", tags: ["math", "dynamic-programming", "memoization"] },
  { lcId: 121, slug: "best-time-to-buy-and-sell-stock", difficulty: "Easy", tags: ["array", "dynamic-programming"] },
  { lcId: 141, slug: "linked-list-cycle", difficulty: "Easy", tags: ["hash-table", "linked-list", "two-pointers"] },
  { lcId: 167, slug: "two-sum-ii-input-array-is-sorted", difficulty: "Medium", tags: ["array", "two-pointers", "binary-search"] },
  { lcId: 198, slug: "house-robber", difficulty: "Medium", tags: ["array", "dynamic-programming"] },
  { lcId: 206, slug: "reverse-linked-list", difficulty: "Easy", tags: ["linked-list", "recursion"] },
  { lcId: 215, slug: "kth-largest-element-in-an-array", difficulty: "Medium", tags: ["heap", "divide-and-conquer", "sorting"] },
  { lcId: 226, slug: "invert-binary-tree", difficulty: "Easy", tags: ["tree", "depth-first-search", "breadth-first-search"] },
  { lcId: 238, slug: "product-of-array-except-self", difficulty: "Medium", tags: ["array", "prefix-sum"] },
  { lcId: 239, slug: "sliding-window-maximum", difficulty: "Hard", tags: ["sliding-window", "heap", "monotonic-queue"] },
  { lcId: 322, slug: "coin-change", difficulty: "Medium", tags: ["dynamic-programming", "breadth-first-search"] },
  { lcId: 326, slug: "power-of-three", difficulty: "Easy", tags: ["math"] },
  { lcId: 350, slug: "two-sum-iv-input-is-a-bst", difficulty: "Easy", tags: ["hash-table", "two-pointers", "tree", "depth-first-search"] },
  { lcId: 424, slug: "longest-repeating-character-replacement", difficulty: "Medium", tags: ["hash-table", "string", "sliding-window"] },
];

export const bySlug = (slug: string): BankEntry => BANK.find((b) => b.slug === slug)!;

/** Internal problem row ids keyed by slug (seedSession wants row ids, not lc_ids). */
export function pid(ids: Map<string, number>, slug: string): number {
  const id = ids.get(slug);
  if (id === undefined) throw new Error(`problem not seeded: ${slug}`);
  return id;
}
