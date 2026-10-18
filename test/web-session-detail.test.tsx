// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("../web/src/api", () => ({
  ApiError: class ApiError extends Error {},
  api: apiMock,
}));

vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="monaco-editor" />,
}));

import { SessionDetailPage } from "../web/src/pages/SessionDetailPage";

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    problem: { id: 101, title: "Two Sum", slug: "two-sum", difficulty: "Easy", tags: [], description: "" },
    startedAt: 1000,
    finishedAt: 2000,
    activeMs: 1000,
    runningSince: null,
    status: "finished",
    timeline: [],
    notes: "",
    reviews: [],
    reviewRequestStatus: null,
    planOrigin: null,
    ...overrides,
  };
}

beforeEach(() => {
  apiMock.mockReset();
});

afterEach(() => {
  cleanup();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/sessions/5"]}>
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SessionDetailPage plan provenance badge (3.2)", () => {
  it("shows a from-plan badge carrying the plan reason when provenance exists", async () => {
    apiMock.mockResolvedValue(
      detail({
        planOrigin: { planItemId: 7, reason: "weak on sliding window", planId: 3, planCreatedAt: 1_700_000_000_000 },
      }),
    );
    renderPage();

    const badge = await screen.findByText("from plan");
    expect(badge.getAttribute("title")).toContain("weak on sliding window");
    expect(badge.getAttribute("title")).toContain("Plan 3");
  });

  it("shows no badge for sessions without plan provenance", async () => {
    apiMock.mockResolvedValue(detail());
    renderPage();

    await screen.findByText("Two Sum");
    expect(screen.queryByText("from plan")).toBeNull();
  });
});
