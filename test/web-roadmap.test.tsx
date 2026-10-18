// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("../web/src/api", () => ({
  ApiError: class ApiError extends Error {},
  api: apiMock,
}));

import { RoadmapPage } from "../web/src/pages/RoadmapPage";

function SessionProbe() {
  const { id } = useParams();
  return <p>session page {id}</p>;
}

function topic(overrides: Record<string, unknown> = {}) {
  return {
    id: "arrays-hashing",
    label: "Arrays & Hashing",
    attempts: 0,
    solved: 0,
    solveRate: 0,
    lastPracticedAt: null,
    frontier: [],
    recent: [],
    ...overrides,
  };
}

function tree(overrides: Record<string, unknown> = {}) {
  return {
    taxonomyVersion: 1,
    domains: [
      {
        id: "data-structures",
        label: "Data Structures",
        topics: [
          topic(),
          topic({ id: "two-pointers", label: "Two Pointers" }),
        ],
      },
      {
        id: "algorithms",
        label: "Algorithms",
        topics: [topic({ id: "dynamic-programming", label: "Dynamic Programming" })],
      },
      { id: "other", label: "Other", topics: [topic({ id: "other", label: "Other" })] },
    ],
    ...overrides,
  };
}

const T0 = Date.UTC(2026, 8, 10, 12, 0, 0);

beforeEach(() => {
  apiMock.mockReset();
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderPage(initialPath = "/roadmap") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/sessions/:id" element={<SessionProbe />} />
        <Route path="/bank" element={<p>bank page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function expandTopic(id: string) {
  const topicEl = document.querySelector(`[data-topic-id="${id}"] details`)!;
  if (!topicEl.open) userEvent.click(topicEl.querySelector("summary")!);
  return topicEl;
}

describe("RoadmapPage (3.1)", () => {
  it("renders collapsible domain sections in roadmap order", async () => {
    apiMock.mockResolvedValue(tree());
    const { container } = renderPage();

    expect(await screen.findByText("Roadmap")).toBeTruthy();
    const domains = container.querySelectorAll("details.roadmap-domain");
    // The curated domains render in the grid; the empty Other bucket is hidden.
    expect(domains).toHaveLength(2);
    expect(domains[0]!.getAttribute("data-domain-id")).toBe("data-structures");
    expect(domains[1]!.getAttribute("data-domain-id")).toBe("algorithms");
    // Sections start collapsed (roadmap order, not a graph).
    expect(domains[0]!.open).toBe(false);
  });

  it("shows mastery bars with counts and zero bars for untouched nodes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    apiMock.mockResolvedValue(
      tree({
        domains: [
          {
            id: "data-structures",
            label: "Data Structures",
            topics: [
              topic({
                attempts: 4,
                solved: 1,
                solveRate: 0.25,
                lastPracticedAt: T0,
              }),
              topic({ id: "two-pointers", label: "Two Pointers" }),
            ],
          },
          { id: "algorithms", label: "Algorithms", topics: [] },
          { id: "other", label: "Other", topics: [] },
        ],
      }),
    );
    const { container } = renderPage();

    await screen.findByText("Roadmap");
    // Global roadmap numbering across domains.
    expect(screen.getByText("1. Arrays & Hashing")).toBeTruthy();
    expect(screen.getByText("2. Two Pointers")).toBeTruthy();
    expect(screen.getByText("1/4 solved")).toBeTruthy();
    expect(screen.getByText("25% solve rate · last practiced 9/10/2026")).toBeTruthy();
    expect(screen.getByText("no practice yet")).toBeTruthy();

    const fills = container.querySelectorAll(".roadmap-topic .progress-fill") as NodeListOf<HTMLElement>;
    expect(fills).toHaveLength(2);
    expect(fills[0]!.style.width).toBe("25%");
    expect(fills[1]!.style.width).toBe("0%");
  });

  it("marks nodes targeted by the current plan as next focus and flags carried items", async () => {
    apiMock.mockResolvedValue(
      tree({
        domains: [
          {
            id: "data-structures",
            label: "Data Structures",
            topics: [
              topic({
                frontier: [{ itemId: 5, title: "Two Sum", slug: "two-sum", difficulty: "Easy", status: "solved", carriedFrom: 2 }],
              }),
              topic({
                id: "two-pointers",
                label: "Two Pointers",
                frontier: [
                  { itemId: 7, title: "Three Sum", slug: "three-sum", difficulty: "Medium", status: "practiced", carriedFrom: 3 },
                ],
              }),
            ],
          },
          {
            id: "algorithms",
            label: "Algorithms",
            topics: [
              // Frontier without carried linkage: next focus but no carried chip.
              topic({
                id: "dynamic-programming",
                label: "Dynamic Programming",
                frontier: [{ itemId: 9, title: "Climbing Stairs", slug: "climbing-stairs", difficulty: "Easy", status: "not_started", carriedFrom: null }],
              }),
            ],
          },
          { id: "other", label: "Other", topics: [] },
        ],
      }),
    );
    renderPage();

    await screen.findByText("Roadmap");
    const focus = screen.getAllByText("next focus");
    expect(focus).toHaveLength(3);
    // "carried" appears twice for two-pointers: the topic-level flag and the
    // frontier item chip. The carried-but-solved item on arrays-hashing is
    // not flagged (only unfinished ladder work is).
    const carried = screen.getAllByText("carried");
    expect(carried).toHaveLength(2);
  });

  it("expands a practiced node listing problems newest-first with difficulty, outcome, and session links", async () => {
    apiMock.mockResolvedValue(
      tree({
        domains: [
          {
            id: "data-structures",
            label: "Data Structures",
            topics: [
              topic({
                attempts: 2,
                solved: 1,
                solveRate: 0.5,
                recent: [
                  { sessionId: 9, title: "Three Sum", slug: "three-sum", difficulty: "Medium", outcome: "Accepted", practicedAt: T0 },
                  { sessionId: 8, title: "Two Sum", slug: "two-sum", difficulty: "Easy", outcome: "Wrong Answer", practicedAt: T0 - 1 },
                ],
              }),
            ],
          },
          { id: "algorithms", label: "Algorithms", topics: [] },
          { id: "other", label: "Other", topics: [] },
        ],
      }),
    );
    renderPage();

    await screen.findByText("Roadmap");
    const details = document.querySelector('[data-topic-id="arrays-hashing"] details')!;
    expect(details.open).toBe(false);

    await userEvent.click(details.querySelector("summary")!);
    expect(details.open).toBe(true);

    const link9 = screen.getByRole("link", { name: "Three Sum" });
    expect(link9.getAttribute("href")).toBe("/sessions/9");
    const link8 = screen.getByRole("link", { name: "Two Sum" });
    expect(link8.getAttribute("href")).toBe("/sessions/8");
    // Newest first in document order.
    const titles = screen.getAllByRole("link").map((a) => a.textContent);
    expect(titles.indexOf("Three Sum")).toBeLessThan(titles.indexOf("Two Sum"));
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("Easy")).toBeTruthy();
    expect(screen.getByText("Accepted")).toBeTruthy();
    expect(screen.getByText("Wrong Answer")).toBeTruthy();

    await userEvent.click(link9);
    expect(await screen.findByText("session page 9")).toBeTruthy();
  });

  it("expanding an untouched node shows nothing-practiced without error", async () => {
    apiMock.mockResolvedValue(tree());
    renderPage();

    await screen.findByText("Roadmap");
    const details = document.querySelector('[data-topic-id="two-pointers"] details')!;
    await userEvent.click(details.querySelector("summary")!);

    expect(details.open).toBe(true);
    expect(details.textContent).toContain("Nothing has been practiced here yet.");
    expect(details.querySelector(".roadmap-drill")).toBeNull();
  });

  it("shows the empty-app state guiding to the problem bank when nothing was practiced", async () => {
    apiMock.mockResolvedValue(tree());
    renderPage();

    const link = await screen.findByRole("link", { name: "Start practicing from the problem bank" });
    expect(link.getAttribute("href")).toBe("/bank");

    await userEvent.click(link);
    expect(await screen.findByText("bank page")).toBeTruthy();
  });

  it("omits the empty state once any practice exists", async () => {
    apiMock.mockResolvedValue(
      tree({
        domains: [
          {
            id: "data-structures",
            label: "Data Structures",
            topics: [topic({ attempts: 1, solved: 0, solveRate: 0, recent: [{ sessionId: 3, title: "Two Sum", slug: "two-sum", difficulty: "Easy", outcome: null, practicedAt: T0 }] })],
          },
          { id: "algorithms", label: "Algorithms", topics: [] },
          { id: "other", label: "Other", topics: [] },
        ],
      }),
    );
    renderPage();

    await screen.findByText("Roadmap");
    expect(screen.queryByText(/No practice sessions recorded yet/)).toBeNull();
  });

  it("renders the curated domains side by side with Other hidden when empty", async () => {
    apiMock.mockResolvedValue(tree());
    const { container } = renderPage();

    await screen.findByText("Roadmap");
    const grid = container.querySelector(".roadmap-grid")!;
    expect(grid).not.toBeNull();
    expect(grid.querySelectorAll("details.roadmap-domain")).toHaveLength(2); // DS + Algorithms
    expect(grid.children[0]!.getAttribute("data-domain-id")).toBe("data-structures");
    expect(grid.children[1]!.getAttribute("data-domain-id")).toBe("algorithms");
    // Empty Other bucket is not rendered.
    expect(container.querySelectorAll('details[data-domain-id="other"]')).toHaveLength(0);
  });

  it("renders the Other bucket only when it has practice or frontier content", async () => {
    apiMock.mockResolvedValue(
      tree({
        domains: [
          { id: "data-structures", label: "Data Structures", topics: [] },
          { id: "algorithms", label: "Algorithms", topics: [] },
          { id: "other", label: "Other", topics: [topic({ id: "other", label: "Other", attempts: 2, solved: 1, solveRate: 0.5 })] },
        ],
      }),
    );
    const { container } = renderPage();

    await screen.findByText("Roadmap");
    const other = container.querySelector('details[data-domain-id="other"]')!;
    expect(other).toBeTruthy();
    expect(other.textContent).toContain("Other");
    // Outside the curated grid.
    expect(other.closest(".roadmap-grid")).toBeNull();
  });

  it("deep-links to a topic: /roadmap?topic=<id> opens that node's drill-down", async () => {
    apiMock.mockResolvedValue(
      tree({
        domains: [
          {
            id: "data-structures",
            label: "Data Structures",
            topics: [
              topic({
                attempts: 2,
                solved: 1,
                solveRate: 0.5,
                recent: [{ sessionId: 9, title: "Three Sum", slug: "three-sum", difficulty: "Medium", outcome: "Accepted", practicedAt: T0 }],
              }),
              topic({ id: "two-pointers", label: "Two Pointers" }),
            ],
          },
          { id: "algorithms", label: "Algorithms", topics: [] },
          { id: "other", label: "Other", topics: [] },
        ],
      }),
    );
    renderPage("/roadmap?topic=arrays-hashing");

    await screen.findByText("Roadmap");
    // The domain and the targeted node are both open on load.
    const domain = document.querySelector('details[data-domain-id="data-structures"]')!;
    expect(domain.open).toBe(true);
    const topicDetails = document.querySelector('[data-topic-id="arrays-hashing"] details')!;
    expect(topicDetails.open).toBe(true);
    expect(screen.getByRole("link", { name: "Three Sum" })).toBeTruthy();

    // Untargeted nodes stay collapsed.
    const untouched = document.querySelector('[data-topic-id="two-pointers"] details')!;
    expect(untouched.open).toBe(false);
  });

  it("deep link with an unknown topic id renders the roadmap normally", async () => {
    apiMock.mockResolvedValue(tree());
    const { container } = renderPage("/roadmap?topic=nonexistent");

    await screen.findByText("Roadmap");
    expect(container.querySelectorAll(".roadmap-topic details[open]")).toHaveLength(0);
  });

  it("offers Start on frontier items, posting the plan-linked session start", async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === "/api/ui/roadmap") {
        return Promise.resolve(
          tree({
            domains: [
              {
                id: "data-structures",
                label: "Data Structures",
                topics: [
                  topic({
                    frontier: [
                      { itemId: 21, problemId: 101, title: "Three Sum", slug: "three-sum", difficulty: "Medium", status: "not_started", carriedFrom: null },
                      { itemId: 22, problemId: null, title: "Ghost Item", slug: "ghost", difficulty: "Easy", status: "not_started", carriedFrom: null },
                    ],
                  }),
                ],
              },
              { id: "algorithms", label: "Algorithms", topics: [] },
              { id: "other", label: "Other", topics: [] },
            ],
          }),
        );
      }
      if (path === "/api/ui/sessions") return Promise.resolve({ sessionId: 42 });
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    renderPage();

    await screen.findByText("Roadmap");
    // Start buttons only for items with a known problem.
    const buttons = screen.getAllByRole("button", { name: "Start" });
    expect(buttons).toHaveLength(1);

    await userEvent.click(buttons[0]!);
    expect(apiMock).toHaveBeenCalledWith("/api/ui/sessions", {
      method: "POST",
      body: JSON.stringify({ problemId: 101, planItemId: 21 }),
    });
    expect(await screen.findByText("session page 42")).toBeTruthy();
  });

  it("surfaces start errors inline on the frontier item", async () => {
    let rejectPost!: (err: unknown) => void;
    apiMock.mockImplementation((path: string) => {
      if (path === "/api/ui/roadmap") {
        return Promise.resolve(
          tree({
            domains: [
              {
                id: "data-structures",
                label: "Data Structures",
                topics: [topic({ frontier: [{ itemId: 21, problemId: 101, title: "Three Sum", slug: "three-sum", difficulty: "Medium", status: "not_started", carriedFrom: null }] })],
              },
              { id: "algorithms", label: "Algorithms", topics: [] },
              { id: "other", label: "Other", topics: [] },
            ],
          }),
        );
      }
      if (path === "/api/ui/sessions") return new Promise((_res, rej) => (rejectPost = rej));
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    renderPage();

    await screen.findByText("Roadmap");
    const button = screen.getByRole("button", { name: "Start" }) as HTMLButtonElement;
    await userEvent.click(button);
    expect(button.disabled).toBe(true);

    rejectPost(new Error("Plan item 21 not found"));
    expect(await screen.findByText(/Plan item 21 not found/)).toBeTruthy();
    expect(button.disabled).toBe(false);
  });
});
