// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryRouter } from "react-router-dom";

import { ThemeProvider, THEME_STORAGE_KEY, useTheme } from "../web/src/theme";
import { App } from "../web/src/App";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("../web/src/api", () => ({
  ApiError: class ApiError extends Error {},
  api: apiMock,
}));

function ThemeProbe() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} data-testid="theme">
      {theme}
    </button>
  );
}

function renderProvider() {
  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  apiMock.mockReset();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeProvider (1.3)", () => {
  it("defaults to light when no attribute is set", () => {
    renderProvider();
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("toggling flips the data-theme attribute and persists the choice", async () => {
    renderProvider();

    await userEvent.click(screen.getByTestId("theme"));

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await userEvent.click(screen.getByTestId("theme"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("initializes dark when the bootstrap attribute is already set (stored dark theme)", () => {
    // Simulate exactly what the index.html bootstrap script does for a stored
    // dark preference before React renders.
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    renderProvider();

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("index.html carries the pre-render bootstrap script", () => {
    const html = readFileSync(join(__dirname, "..", "web", "index.html"), "utf8");
    expect(html).toContain('localStorage.getItem("leeter-theme")');
    expect(html).toContain('setAttribute("data-theme", "dark")');
  });
});

describe("App shell (1.4)", () => {
  it("renders nav with app name, links, active link styling, and the theme toggle", async () => {
    apiMock.mockImplementation((path: string) => {
      if (path.startsWith("/api/ui/problems")) return Promise.resolve({ total: 0, problems: [] });
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    render(
      <MemoryRouter initialEntries={["/bank"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("leeter").className).toBe("app-name");
    const active = screen.getByRole("link", { name: "Problem bank" });
    expect(active.className).toBe("nav-link active");
    expect(screen.getByRole("link", { name: "Dashboard" }).className).toBe("nav-link");
    expect(screen.getByRole("link", { name: "History" }).className).toBe("nav-link");
    expect(screen.getByRole("link", { name: "Roadmap" }).className).toBe("nav-link");
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeTruthy();
  });

  it("styles the Roadmap nav link as active on /roadmap", async () => {
    apiMock.mockResolvedValue({
      taxonomyVersion: 1,
      domains: [],
    });
    render(
      <MemoryRouter initialEntries={["/roadmap"]}>
        <App />
      </MemoryRouter>,
    );

    const active = screen.getByRole("link", { name: "Roadmap" });
    expect(active.className).toBe("nav-link active");
    expect(screen.getByRole("link", { name: "History" }).className).toBe("nav-link");
    // The Roadmap page itself rendered below the shell.
    expect(await screen.findByRole("heading", { name: "Roadmap" })).toBeTruthy();
  });

  it("the theme toggle in the shell flips the document theme", async () => {
    apiMock.mockImplementation(() =>
      Promise.resolve({
        totals: { sessions: 0, solved: 0, activeMs: 0 },
        daily: [],
        topics: [],
        plan: null,
        pastPlans: [],
        activeSession: null,
        recentSessions: [],
      }),
    );
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Toggle theme" }).textContent).toBe("Light mode");
  });
});
