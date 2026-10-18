import { describe, expect, it } from "vitest";
import {
  OTHER_TOPIC,
  TAXONOMY_DOMAINS,
  TAXONOMY_VERSION,
  TOPIC_NODES,
  topicsForTags,
} from "../server/knowledge/taxonomy";

describe("topic taxonomy seed (1.1)", () => {
  it("maps tags to their topic node", () => {
    expect(topicsForTags(["array", "hash-table"])).toEqual(["arrays-hashing"]);
    expect(topicsForTags(["tree"])).toEqual(["trees"]);
    expect(topicsForTags(["dynamic-programming"])).toEqual(["dynamic-programming"]);
  });

  it("counts a problem once per node its tags map to (multi-node membership)", () => {
    expect(topicsForTags(["array", "two-pointers"])).toEqual(["arrays-hashing", "two-pointers"]);
    // A tag set spanning both domains yields every node, roadmap order kept.
    expect(topicsForTags(["heap", "greedy"])).toEqual(["heap", "greedy-intervals"]);
  });

  it("returns node ids in roadmap order regardless of tag order", () => {
    const forward = topicsForTags(["array", "two-pointers", "hash-table"]);
    const backward = topicsForTags(["two-pointers", "hash-table", "array"]);
    expect(forward).toEqual(backward);
    expect(forward.indexOf("arrays-hashing")).toBeLessThan(forward.indexOf("two-pointers"));
  });

  it("falls back to the Other bucket for unmapped tags", () => {
    expect(topicsForTags(["database", "shell"])).toEqual([OTHER_TOPIC]);
    expect(topicsForTags([])).toEqual([OTHER_TOPIC]);
  });

  it("orders domains Data Structures then Algorithms with ordered topics", () => {
    expect(TAXONOMY_DOMAINS.map((d) => d.id)).toEqual(["data-structures", "algorithms"]);
    expect(TAXONOMY_DOMAINS[0]!.topics[0]!.id).toBe("arrays-hashing");
    const orders = TOPIC_NODES.map((t) => t.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    expect(new Set(orders).size).toBe(orders.length); // strictly increasing
    expect(TOPIC_NODES.length).toBeGreaterThanOrEqual(15);
  });

  it("keeps every node id a non-empty unique slug and label non-empty", () => {
    const ids = new Set<string>();
    for (const t of TOPIC_NODES) {
      expect(t.id).toMatch(/^[a-z0-9-]+$/);
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
    }
  });

  it("maps every tag to exactly one node and every tag is a non-empty plausible slug", () => {
    const seen = new Map<string, string>();
    for (const t of TOPIC_NODES) {
      expect(t.tags.length).toBeGreaterThan(0);
      for (const tag of t.tags) {
        expect(tag).toMatch(/^[a-z0-9-]+$/);
        expect(tag.length).toBeGreaterThan(0);
        expect(seen.has(tag)).toBe(false);
        seen.set(tag, t.id);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(50);
  });

  it("exposes a positive taxonomy version", () => {
    expect(Number.isInteger(TAXONOMY_VERSION)).toBe(true);
    expect(TAXONOMY_VERSION).toBeGreaterThan(0);
  });
});
