// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { Chip } from "../web/src/components/Chip";
import { Button } from "../web/src/components/Button";
import { EmptyState } from "../web/src/components/EmptyState";
import { toast } from "../web/src/components/toastBus";
import { ToastHost } from "../web/src/components/Toast";

afterEach(() => {
  cleanup();
});

describe("Chip (1.5)", () => {
  it("renders each variant with its class", () => {
    const { container } = render(
      <div>
        <Chip>plain</Chip>
        <Chip variant="success">solved</Chip>
        <Chip variant="warning">practiced</Chip>
        <Chip variant="diff-easy">Easy</Chip>
        <Chip variant="diff-medium">Medium</Chip>
        <Chip variant="diff-hard">Hard</Chip>
      </div>,
    );
    const spans = container.querySelectorAll("span.chip");
    expect(spans).toHaveLength(6);
    expect(container.querySelector(".chip-success")?.textContent).toBe("solved");
    expect(container.querySelector(".chip-warning")?.textContent).toBe("practiced");
    expect(container.querySelector(".chip-diff-easy")?.textContent).toBe("Easy");
    expect(container.querySelector(".chip-diff-medium")?.textContent).toBe("Medium");
    expect(container.querySelector(".chip-diff-hard")?.textContent).toBe("Hard");
  });

  it("carries an optional title tooltip", () => {
    render(<Chip title="plan reason">from plan</Chip>);
    expect(screen.getByText("from plan").getAttribute("title")).toBe("plan reason");
  });
});

describe("Button (1.5)", () => {
  it("renders secondary by default and primary with the variant class", () => {
    const { container } = render(
      <div>
        <Button>Save</Button>
        <Button variant="primary">Start</Button>
      </div>,
    );
    const [secondary, primary] = container.querySelectorAll("button");
    expect(secondary!.className).toBe("");
    expect(primary!.className).toBe("btn-primary");
  });

  it("passes through click handlers and disabled state", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("EmptyState (1.5)", () => {
  it("shows the message and an optional action link", () => {
    render(
      <MemoryRouter>
        <EmptyState message="No sessions yet" actionTo="/bank" actionLabel="Open the problem bank" />
      </MemoryRouter>,
    );
    expect(screen.getByText("No sessions yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open the problem bank" }).getAttribute("href")).toBe("/bank");
  });
});

describe("Toasts (2.1)", () => {
  beforeEach(() => {
    toast.resetForTest();
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    toast.resetForTest();
  });

  it("emitted toasts render, stack, and auto-dismiss", () => {
    render(<ToastHost />);

    act(() => {
      toast.success("Bank synced");
      toast.error("Sync failed");
    });

    expect(screen.getByText("Bank synced").className).toBe("toast toast-success");
    expect(screen.getByText("Sync failed").className).toBe("toast toast-error");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Bank synced")).toBeNull();
    expect(screen.queryByText("Sync failed")).toBeNull();
  });

  it("clicking a toast dismisses it immediately", () => {
    render(<ToastHost />);

    act(() => {
      toast.success("Saved snapshot");
    });
    act(() => {
      fireEvent.click(screen.getByText("Saved snapshot"));
    });

    expect(screen.queryByText("Saved snapshot")).toBeNull();
  });
});
