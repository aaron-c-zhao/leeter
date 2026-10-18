/*
 * Curated topic taxonomy seed (knowledge-tree D1): a versioned, code-resident
 * two-level tree — ordered topic nodes grouped into Data Structures /
 * Algorithms domains — mapping LeetCode tag slugs to topic nodes. Problems
 * inherit topic membership through their tags; no per-problem curation.
 * Node order encodes the recommended learning roadmap (NeetCode dependency
 * order collapsed into the two domains). Extending the seed is a data edit:
 * add a node, bump the version, keep tags as plausible LC slugs.
 */

/** Bump when the seed's topic set or tag mappings change observably. */
export const TAXONOMY_VERSION = 1;

export const DOMAIN_DATA_STRUCTURES = "data-structures";
export const DOMAIN_ALGORITHMS = "algorithms";

export interface TopicNode {
  id: string;
  label: string;
  domain: string;
  tags: string[];
  /** Global roadmap position (1-based, ascending; drives ordering everywhere). */
  order: number;
}

export interface TaxonomyDomain {
  id: string;
  label: string;
  topics: TopicNode[];
}

/** Explicit bucket for tags that map to no curated node (kept stable). */
export const OTHER_TOPIC = "other";

let nextOrder = 0;
function node(id: string, label: string, domain: string, tags: string[]): TopicNode {
  nextOrder += 1;
  return { id, label, domain, tags, order: nextOrder };
}

/*
 * Ordered topic nodes. Data Structures first (mostly prerequisite-light),
 * then Algorithms in dependency order. Tag sets are curated LC tag slugs;
 * `other` catches everything unmapped so no practice is ever invisible.
 */
const DATA_STRUCTURES: TopicNode[] = [
  node("arrays-hashing", "Arrays & Hashing", DOMAIN_DATA_STRUCTURES, [
    "array", "hash-table", "string", "prefix-sum", "counting", "sorting",
    "matrix", "bucket-sort", "counting-sort", "radix-sort", "quickselect",
    "rolling-hash", "hash-function",
  ]),
  node("two-pointers", "Two Pointers", DOMAIN_DATA_STRUCTURES, ["two-pointers"]),
  node("sliding-window", "Sliding Window", DOMAIN_DATA_STRUCTURES, ["sliding-window"]),
  node("stack-queue", "Stack & Queue", DOMAIN_DATA_STRUCTURES, [
    "stack", "queue", "monotonic-stack", "monotonic-queue",
  ]),
  node("binary-search", "Binary Search", DOMAIN_DATA_STRUCTURES, ["binary-search", "interactive"]),
  node("linked-list", "Linked List", DOMAIN_DATA_STRUCTURES, ["linked-list", "doubly-linked-list"]),
  node("trees", "Trees", DOMAIN_DATA_STRUCTURES, [
    "tree", "binary-tree", "binary-search-tree", "segment-tree", "binary-indexed-tree",
  ]),
  node("tries", "Tries", DOMAIN_DATA_STRUCTURES, ["trie"]),
  node("heap", "Heap / Priority Queue", DOMAIN_DATA_STRUCTURES, ["heap", "priority-queue"]),
  node("design", "Design", DOMAIN_DATA_STRUCTURES, [
    "design", "iterator", "stream", "data-stream", "randomized", "simulation",
  ]),
];

const ALGORITHMS: TopicNode[] = [
  node("backtracking", "Backtracking", DOMAIN_ALGORITHMS, ["backtracking"]),
  node("graphs", "Graphs", DOMAIN_ALGORITHMS, [
    "graph", "depth-first-search", "breadth-first-search", "topological-sort",
    "union-find", "shortest-path", "strongly-connected-component",
  ]),
  node("dynamic-programming", "Dynamic Programming", DOMAIN_ALGORITHMS, [
    "dynamic-programming", "memoization", "bit-memoization",
  ]),
  node("greedy-intervals", "Greedy & Intervals", DOMAIN_ALGORITHMS, ["greedy", "interval"]),
  node("math-bit-manipulation", "Math & Bit Manipulation", DOMAIN_ALGORITHMS, [
    "math", "bit-manipulation", "geometry", "number-theory", "combinatorics",
  ]),
];

export const DOMAIN_ORDER: string[] = [DOMAIN_DATA_STRUCTURES, DOMAIN_ALGORITHMS];

export const TOPIC_NODES: TopicNode[] = [...DATA_STRUCTURES, ...ALGORITHMS];

export const TAXONOMY_DOMAINS: TaxonomyDomain[] = DOMAIN_ORDER.map((id) => ({
  id,
  label: id === DOMAIN_DATA_STRUCTURES ? "Data Structures" : "Algorithms",
  topics: TOPIC_NODES.filter((t) => t.domain === id),
}));

const tagToTopic = new Map<string, string>();
for (const topic of TOPIC_NODES) {
  for (const tag of topic.tags) tagToTopic.set(tag, topic.id);
}

const topicLabels = new Map<string, string>(TOPIC_NODES.map((t) => [t.id, t.label]));

/** Human label for a topic node id (Other bucket included; unknown ids pass through). */
export function topicLabel(id: string): string {
  return id === OTHER_TOPIC ? "Other" : topicLabels.get(id) ?? id;
}

/**
 * Topic node ids for a tag set, in roadmap order. A problem with tags
 * spanning several nodes counts toward every one of them; tags mapping to
 * no node fall back to the explicit `other` bucket.
 */
export function topicsForTags(tags: string[]): string[] {
  const topics = new Set<string>();
  for (const tag of tags) {
    const topic = tagToTopic.get(tag);
    if (topic) topics.add(topic);
  }
  if (topics.size === 0) return [OTHER_TOPIC];
  return TOPIC_NODES.filter((t) => topics.has(t.id)).map((t) => t.id);
}
