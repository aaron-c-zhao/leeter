// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("../web/src/api", () => ({
  ApiError: class ApiError extends Error {},
  api: apiMock,
}));

import { DashboardPage } from "../web/src/pages/DashboardPage";

function SessionProbe() {
  const { id } = useParams();
  return <p>session page {id}</p>;
}

interface ItemOverride {
  status: "solved" | "practiced" | "not_started";
  id: number;
  title: string;
  slug: string;
}

function planItem(overrides: Partial<ItemOverride> & Pick<ItemOverride, "status">) {
  return {
    id: 11,
    planId: 2,
    problemId: 101,
    lcId: 1,
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    reason: "warm-up",
    topics: [{ id: "arrays-hashing", label: "Arrays & Hashing" }],
    ...overrides,
  };
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    createdAt: 1_700_000_000_000,
    horizonDays: 7,
    focus: "**arrays** week",
    notes: null,
    items: [planItem({ status: "solved" })],
    ...overrides,
  };
}

const base = {
  totals: { sessions: 0, solved: 0, activeMs: 0 },
  daily: [],
  topics: [],
  activeSession: null,
  recentSessions: [] as Array<Record<string, unknown>>,
};

// Epoch whose UTC date is 2026-09-10 (matches "today" in the env).
const T0 = Date.UTC(2026, 8, 10, 12, 0, 0);
const DAY = 86_400_000;

beforeEach(() => {
  apiMock.mockReset();
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderPage(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sessions/:id" element={<SessionProbe />} />
        <Route path="/bank" element={<p>bank page</p>} />
        <Route path="/roadmap" element={<p>roadmap page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardPage next up strip (2.1)", () => {
  it("shows the unfinished session with status, active time, and a resume link, ahead of plan items", async () => {
    apiMock.mockResolvedValue({
      ...base,
      totals: { sessions: 1, solved: 0, activeMs: 0 },
      activeSession: {
        id: 7,
        problem: { id: 101, title: "Two Sum", slug: "two-sum", difficulty: "Easy" },
        startedAt: T0,
        activeMs: 12 * 60_000,
        status: "paused",
      },
      plan: plan({ items: [planItem({ status: "not_started" })] }),
      pastPlans: [],
    });
    const { container } = renderPage();

    expect(await screen.findByText("Next up")).toBeTruthy();
    const row = container.querySelector('[data-testid="nextup-session"]')!;
    expect(row.querySelector("a")!.getAttribute("href")).toBe("/sessions/7");
    expect(row.textContent).toContain("paused");
    expect(row.textContent).toContain("12 min active");
    // Plan items stay in the plan section, not the strip.
    expect(container.querySelector('[data-testid="nextup-item"]')).toBeNull();

    await userEvent.click(row.querySelector("a")!);
    expect(await screen.findByText("session page 7")).toBeTruthy();
  });

  it("prefers a carried unsolved plan item over plain not-started items", async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === "/api/ui/dashboard") {
        return Promise.resolve({
          ...base,
          plan: plan({
            items: [
              planItem({ id: 20, slug: "plain", title: "Plain", status: "not_started" }),
              planItem({ id: 21, slug: "carried", title: "Carried Item", status: "practiced", carriedFrom: 5 }),
            ],
          }),
          pastPlans: [],
        });
      }
      if (path === "/api/ui/sessions") return Promise.resolve({ sessionId: 42 });
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    const { container } = renderPage();

    const row = (await screen.findByTestId("nextup-item"))!;
    expect(row.textContent).toContain("Carried Item");
    expect(row.textContent).toContain("carried");

    await userEvent.click(row.querySelector("button")!);
    expect(await screen.findByText("session page 42")).toBeTruthy();
    expect(apiMock).toHaveBeenCalledWith("/api/ui/sessions", {
      method: "POST",
      body: JSON.stringify({ problemId: 101, planItemId: 21 }),
    });
  });

  it("falls back to the first not-started item when nothing is carried", async () => {
    apiMock.mockResolvedValue({
      ...base,
      plan: plan({
        items: [
          planItem({ id: 12, slug: "practiced-one", title: "Practiced One", status: "practiced" }),
          planItem({ id: 13, slug: "fresh", title: "Fresh Item", status: "not_started" }),
        ],
      }),
      pastPlans: [],
    });
    const { container } = renderPage();

    const row = await screen.findByTestId("nextup-item");
    expect(row.textContent).toContain("Fresh Item");
    expect(screen.queryByText("carried")).toBeNull();
  });

  it("shows all-caught-up text when sessions exist but nothing is actionable", async () => {
    apiMock.mockResolvedValue({
      ...base,
      totals: { sessions: 1, solved: 1, activeMs: HOUR() },
      plan: plan({ items: [planItem({ status: "solved" })] }),
      pastPlans: [],
    });
    const { container } = renderPage();

    expect(await screen.findByTestId("nextup-clear")).toBeTruthy();
    // The strip itself has no Start action (the plan section still lists its items).
    expect(container.querySelector(".nextup")!.querySelector("button")).toBeNull();
  });

  it("guides a brand-new user to the problem bank", async () => {
    apiMock.mockResolvedValue({ ...base, plan: null, pastPlans: [] });
    renderPage();

    const link = await screen.findByRole("link", { name: "Open the problem bank" });
    expect(link.getAttribute("href")).toBe("/bank");

    await userEvent.click(link);
    expect(await screen.findByText("bank page")).toBeTruthy();
  });
});

function HOUR(): number {
  return 3_600_000;
}

describe("DashboardPage plan section (2.2/2.3)", () => {
  it("renders focus markdown, items with difficulty, reason and status chips per state", async () => {
    apiMock.mockResolvedValue({
      ...base,
      plan: plan({
        items: [
          planItem({ status: "solved" }),
          planItem({ id: 12, problemId: 102, lcId: 2, slug: "add-two-numbers", title: "Add Two", difficulty: "Medium", reason: "practice", status: "practiced" }),
          planItem({ id: 13, problemId: 103, lcId: 3, slug: "three-sum", title: "Three Sum", difficulty: "Hard", reason: "stretch", status: "not_started" }),
        ],
      }),
      pastPlans: [],
    });
    const { container } = renderPage();

    expect(await screen.findByText("The plan")).toBeTruthy();
    expect(screen.getByText("arrays").tagName).toBe("STRONG");
    expect(screen.getByText("Problems").tagName).toBe("H4");
    expect(screen.getByRole("link", { name: "Two Sum" }).getAttribute("href")).toBe(
      "https://leetcode.com/problems/two-sum/",
    );
    // Difficulty chips and reasons live on the plan rows (the strip repeats
    // some of them, so scope to the item list).
    const list = container.querySelector(".plan-list")!;
    expect(list.textContent).toContain("Easy");
    expect(list.textContent).toContain("Medium");
    expect(list.textContent).toContain("Hard");
    expect(list.textContent).toContain("warm-up");
    expect(list.textContent).toContain("practice");
    expect(list.textContent).toContain("stretch");
    expect(list.querySelectorAll(".chip-success")).toHaveLength(1);
    expect(list.querySelectorAll(".chip-warning")).toHaveLength(1);
    expect(list.textContent).toContain("not started");
    expect(container.querySelectorAll(".plan-list .plan-item")).toHaveLength(3);
  });

  it("shows trained-topic chips linking to the roadmap topic", async () => {
    apiMock.mockResolvedValue({
      ...base,
      plan: plan({
        items: [
          planItem({
            topics: [
              { id: "arrays-hashing", label: "Arrays & Hashing" },
              { id: "two-pointers", label: "Two Pointers" },
            ],
          }),
          planItem({ id: 14, slug: "exotic", title: "Exotic", status: "not_started", topics: [] }),
        ],
      }),
      pastPlans: [],
    });
    renderPage();

    await screen.findByText("The plan");
    expect(screen.getByText("trains:")).toBeTruthy();
    const arraysChip = screen.getByRole("link", { name: "Arrays & Hashing" });
    expect(arraysChip.getAttribute("href")).toBe("/roadmap?topic=arrays-hashing");
    expect(screen.getByRole("link", { name: "Two Pointers" }).getAttribute("href")).toBe(
      "/roadmap?topic=two-pointers",
    );
    // Item without topic mapping renders no chips.
    const items = screen.getAllByRole("link", { name: "Two Sum" });
    expect(items).toHaveLength(1);
  });

  it("caps long plan lists with an inline show-all control", async () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      planItem({ id: 30 + i, slug: `p-${i}`, title: `Problem ${i}`, status: "not_started" }),
    );
    apiMock.mockResolvedValue({ ...base, plan: plan({ items }), pastPlans: [] });
    renderPage();

    await screen.findByText("The plan");
    const rows = document.querySelectorAll(".plan-list .plan-item");
    expect(rows).toHaveLength(8);

    await userEvent.click(screen.getByRole("button", { name: "Show all 10 items" }));
    expect(document.querySelectorAll(".plan-list .plan-item")).toHaveLength(10);
  });

  it("shows progress summary, progress bar, and days left derived from horizon", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    const createdAt = T0 - 2 * DAY;
    apiMock.mockResolvedValue({
      ...base,
      plan: plan({
        createdAt,
        horizonDays: 7,
        items: [
          planItem({ status: "solved" }),
          planItem({ id: 12, problemId: 102, lcId: 2, slug: "add-two", title: "Add Two", difficulty: "Medium", reason: "r", status: "solved" }),
          planItem({ id: 13, problemId: 103, lcId: 3, slug: "three-sum", title: "Three Sum", difficulty: "Hard", reason: "r", status: "not_started" }),
        ],
      }),
      pastPlans: [],
    });
    const { container } = renderPage();

    expect(await screen.findByText("2/3 solved")).toBeTruthy();
    expect(screen.getByText("5 days left")).toBeTruthy();
    const fill = container.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("67%");
  });

  it("clamps days left at zero for expired plans", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    apiMock.mockResolvedValue({
      ...base,
      plan: plan({ createdAt: T0 - 30 * DAY, horizonDays: 7 }),
      pastPlans: [],
    });
    renderPage();

    expect(await screen.findByText("0 days left")).toBeTruthy();
  });

  it("start click posts the exact body and navigates to the session detail page", async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === "/api/ui/dashboard") return Promise.resolve({ ...base, plan: plan(), pastPlans: [] });
      if (path === "/api/ui/sessions") return Promise.resolve({ sessionId: 42 });
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    renderPage();

    await screen.findByText("The plan");
    await userEvent.click(screen.getAllByRole("button", { name: "Start" })[0]!);

    expect(await screen.findByText("session page 42")).toBeTruthy();
    expect(apiMock).toHaveBeenCalledWith("/api/ui/sessions", {
      method: "POST",
      body: JSON.stringify({ problemId: 101, planItemId: 11 }),
    });
  });

  it("disables start while in flight and surfaces the error inline on failure", async () => {
    let rejectPost!: (err: unknown) => void;
    apiMock.mockImplementation((path: string) => {
      if (path === "/api/ui/dashboard") return Promise.resolve({ ...base, plan: plan(), pastPlans: [] });
      if (path === "/api/ui/sessions") return new Promise((_res, rej) => (rejectPost = rej));
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    renderPage();

    await screen.findByText("The plan");
    const button = screen.getAllByRole("button", { name: "Start" })[0]! as HTMLButtonElement;
    await userEvent.click(button);
    expect(button.disabled).toBe(true);

    rejectPost(new Error("Plan item 12 not found"));
    expect(await screen.findByText(/Plan item 12 not found/)).toBeTruthy();
    expect(button.disabled).toBe(false);
  });

  it("shows a plan empty state when no current plan exists", async () => {
    apiMock.mockResolvedValue({ ...base, plan: null, pastPlans: [] });
    renderPage();

    expect(await screen.findByText("The plan")).toBeTruthy();
    expect(screen.getByText("No current plan — your agent's next run will post one.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("renders past plans collapsed by default and expands to show items with chips", async () => {
    apiMock.mockResolvedValue({
      ...base,
      plan: plan(),
      pastPlans: [
        plan({
          id: 1,
          createdAt: 1_690_000_000_000,
          focus: "old **focus**",
          items: [
            planItem({ id: 5, title: "Sliding Window Max", slug: "sliding-window-max", status: "practiced" }),
            planItem({ id: 6, title: "Median of Streams", slug: "median-of-streams", status: "not_started" }),
          ],
        }),
      ],
    });
    renderPage();

    expect(await screen.findByText("The plan")).toBeTruthy();
    const details = screen.getByText("Past plans (1)").closest("details")!;
    expect(details.open).toBe(false);

    await userEvent.click(screen.getByText("Past plans (1)"));

    expect(details.open).toBe(true);
    expect(screen.getByText("Sliding Window Max")).toBeTruthy();
    expect(screen.getByText("Median of Streams")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Start" })).toHaveLength(1);
  });
});

describe("DashboardPage record section (2.2)", () => {
  it("shows the compact stat strip with sessions, solved rate, and active time", async () => {
    apiMock.mockResolvedValue({
      ...base,
      totals: { sessions: 4, solved: 3, activeMs: 5 * 3_600_000 },
      plan: null,
      pastPlans: [],
    });
    const { container } = renderPage();

    expect(await screen.findByText("The record")).toBeTruthy();
    const cells = container.querySelectorAll(".stat-cell");
    expect(cells).toHaveLength(3);
    expect(cells[0]!.textContent).toContain("4");
    expect(cells[0]!.textContent).toContain("sessions recorded");
    expect(cells[1]!.textContent).toContain("3");
    expect(cells[1]!.textContent).toContain("75% solve rate");
    expect(cells[2]!.textContent).toContain("5.0 h");
    // No separate large stat cards anymore.
    expect(container.querySelectorAll(".stat-card")).toHaveLength(0);
  });

  it("omits the solve rate when there are no sessions", async () => {
    apiMock.mockResolvedValue({ ...base, plan: null, pastPlans: [] });
    renderPage();

    await screen.findByText("The record");
    expect(screen.getByText("solved")).toBeTruthy();
    expect(screen.queryByText(/solve rate/)).toBeNull();
  });

  it("zero-fills skipped days and distinguishes solved from attempts", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    const today = new Date(T0).toISOString().slice(0, 10); // 2026-09-10
    const yesterday = new Date(T0 - DAY).toISOString().slice(0, 10); // 2026-09-09
    apiMock.mockResolvedValue({
      ...base,
      daily: [{ date: today, attempts: 3, solved: 1, activeMs: 3_600_000 }],
      plan: null,
      pastPlans: [],
    });
    const { container } = renderPage();

    expect(await screen.findByText("Activity (last 30 days)")).toBeTruthy();
    const days = container.querySelectorAll(".activity-day");
    expect(days).toHaveLength(30);

    const activeDay = container.querySelector(`[data-date="${today}"]`)!;
    expect(activeDay.querySelector(".activity-bar-solved")).toBeTruthy();
    expect(activeDay.querySelector(".activity-bar")).toBeTruthy();
    expect(activeDay.getAttribute("title")).toContain("3 attempts");
    expect(activeDay.getAttribute("title")).toContain("1 solved");

    // Skipped day renders an explicit empty bar, not a missing day.
    const gapDay = container.querySelector(`[data-date="${yesterday}"]`)!;
    expect(gapDay.querySelector(".activity-bar-empty")).toBeTruthy();
    expect(gapDay.getAttribute("title")).toContain("0 attempts");
  });

  it("renders topic bars ordered by attempts, linked to roadmap topics, with Other included", async () => {
    apiMock.mockResolvedValue({
      ...base,
      topics: [
        { topic: "arrays-hashing", label: "Arrays & Hashing", attempts: 5, solved: 3 },
        { topic: "linked-list", label: "Linked List", attempts: 2, solved: 1 },
        { topic: "other", label: "Other", attempts: 1, solved: 0 },
      ],
      plan: null,
      pastPlans: [],
    });
    const { container } = renderPage();

    expect(await screen.findByText("Topics practiced")).toBeTruthy();
    const rows = container.querySelectorAll("a.tag-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.getAttribute("href")).toBe("/roadmap?topic=arrays-hashing");
    expect(screen.getByText("Arrays & Hashing")).toBeTruthy();
    expect(screen.getByText("5 attempts (3 solved)")).toBeTruthy();
    expect(screen.getByText("Other")).toBeTruthy();
    // Largest topic has a full-width bar.
    const fills = container.querySelectorAll(".tag-fill") as NodeListOf<HTMLElement>;
    expect(fills[0]!.style.width).toBe("100%");
    expect(fills[1]!.style.width).toBe("40%");
  });

  it("caps topic bars and links to the roadmap for the rest", async () => {
    const topics = Array.from({ length: 10 }, (_, i) => ({
      topic: `t-${i}`,
      label: `Topic ${i}`,
      attempts: 10 - i,
      solved: 0,
    }));
    apiMock.mockResolvedValue({ ...base, topics, plan: null, pastPlans: [] });
    const { container } = renderPage();

    await screen.findByText("Topics practiced");
    expect(container.querySelectorAll("a.tag-row")).toHaveLength(8);
    const seeAll = screen.getByRole("link", { name: "See all topics on the roadmap" });
    expect(seeAll.getAttribute("href")).toBe("/roadmap");
  });

  it("lists recent finished sessions newest-first with outcome links", async () => {
    apiMock.mockResolvedValue({
      ...base,
      totals: { sessions: 2, solved: 0, activeMs: 0 },
      activeSession: null,
      recentSessions: [
        { id: 9, problem: { id: 101, title: "Three Sum", slug: "three-sum", difficulty: "Medium" }, startedAt: T0, activeMs: 0, status: "finished", finishedAt: T0 + DAY, outcome: "Accepted" },
        { id: 8, problem: { id: 102, title: "Two Sum", slug: "two-sum", difficulty: "Easy" }, startedAt: T0 - DAY, activeMs: 0, status: "finished", finishedAt: T0, outcome: null },
      ],
      plan: null,
      pastPlans: [],
    });
    renderPage();

    expect(await screen.findByText("Recent results")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Three Sum" }).getAttribute("href")).toBe("/sessions/9");
    expect(screen.getByRole("link", { name: "Two Sum" }).getAttribute("href")).toBe("/sessions/8");
    expect(screen.getByText("Accepted")).toBeTruthy();
    expect(screen.getByText("no submissions")).toBeTruthy();
    // Newest first in document order.
    const titles = screen.getAllByRole("link").map((a) => a.textContent);
    expect(titles.indexOf("Three Sum")).toBeLessThan(titles.indexOf("Two Sum"));
  });

  it("shows empty states for activity and topics when nothing exists yet", async () => {
    apiMock.mockResolvedValue({ ...base, plan: null, pastPlans: [] });
    renderPage();

    await screen.findByText("The record");
    expect(screen.getByText("No activity yet — sessions you record will appear here.")).toBeTruthy();
    expect(screen.getByText("No topics yet — practice tagged problems to see the distribution.")).toBeTruthy();
    expect(screen.queryByText("Activity (last 30 days)")).toBeNull();
    expect(screen.queryByText("Topics practiced")).toBeNull();
  });
});

describe("DashboardPage layout (2.2)", () => {
  it("renders the three sections: full-width next up strip, then the two-column grid", async () => {
    apiMock.mockResolvedValue({
      totals: { sessions: 3, solved: 1, activeMs: 2 * HOUR() },
      daily: [{ date: new Date().toISOString().slice(0, 10), attempts: 2, solved: 1, activeMs: 3_600_000 }],
      topics: [{ topic: "array", label: "Arrays & Hashing", attempts: 2, solved: 1 }],
      plan: plan(),
      pastPlans: [],
      activeSession: {
        id: 5,
        problem: { id: 101, title: "Two Sum", slug: "two-sum", difficulty: "Easy" },
        startedAt: Date.now(),
        activeMs: 5 * 60_000,
        status: "active",
      },
      recentSessions: [
        { id: 4, problem: { id: 102, title: "Three Sum", slug: "three-sum", difficulty: "Medium" }, startedAt: Date.now() - DAY, activeMs: 0, status: "finished", finishedAt: Date.now() - DAY, outcome: "Accepted" },
      ],
    });
    const { container } = renderPage();

    // Everything renders together: strip, plan, record.
    expect(await screen.findByText("Next up")).toBeTruthy();
    expect(screen.getByText("The plan")).toBeTruthy();
    expect(screen.getByText("The record")).toBeTruthy();
    expect(screen.getByText("Topics practiced")).toBeTruthy();
    expect(screen.getByText("Recent results")).toBeTruthy();

    // Grid structure: strip above, two columns below.
    const grid = container.querySelector(".dashboard-grid")!;
    expect(grid).not.toBeNull();
    expect(grid.children).toHaveLength(2);
    expect(grid.children[0]!.className).toContain("dashboard-plan");
    expect(grid.children[1]!.className).toContain("dashboard-record");
    // The strip is outside the grid (full width).
    expect(container.querySelector(".nextup")!.closest(".dashboard-grid")).toBeNull();

    // Plan focus markdown is rendered inside the theme-aware .md container.
    const md = container.querySelector(".md");
    expect(md!.querySelector("strong")!.textContent).toBe("arrays");

    // Resume link navigates to the session page (the plan item also links to
    // LeetCode with the same title — pick the internal one).
    const resumeLink = screen.getAllByRole("link", { name: "Two Sum" }).find(
      (a) => a.getAttribute("href") === "/sessions/5",
    )!;
    await userEvent.click(resumeLink);
    expect(await screen.findByText("session page 5")).toBeTruthy();
  });

  it("both theme palettes define identical names for every theme-sensitive token (markdown/legibility under both themes)", () => {
    const css = readFileSync(join(__dirname, "..", "web", "src", "styles", "tokens.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    const lightBlock = css.match(/^:root\s*{([\s\S]*?)}/m)![1];
    const darkBlock = css.match(/^:root\[data-theme="dark"\]\s*{([\s\S]*?)}/m)![1];
    // Non-color tokens (fonts, spacing, radii) are intentionally inherited by
    // the dark palette — only theme-sensitive tokens must be redefined.
    const themeSensitive = (block: string) =>
      new Set(
        [...block.matchAll(/(--(?:color|shadow)[a-z0-9-]*)/g)].map((m) => m[1]),
      );
    expect(themeSensitive(darkBlock)).toEqual(themeSensitive(lightBlock));
  });
});
