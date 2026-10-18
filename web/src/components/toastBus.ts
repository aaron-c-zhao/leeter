import { useEffect, useState } from "react";

/*
 * Module-level toast bus. Async action handlers (often plain functions outside
 * React's tree) emit; the single ToastHost in the app shell subscribes and
 * renders.
 */

export type ToastKind = "success" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

const DEFAULT_DURATION_MS = 5000;

class ToastBus {
  private toasts: ToastItem[] = [];
  private listeners = new Set<Listener>();
  private nextId = 1;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snapshot = [...this.toasts];
    for (const listener of this.listeners) listener(snapshot);
  }

  push(kind: ToastKind, message: string, durationMs = DEFAULT_DURATION_MS) {
    const id = this.nextId++;
    this.toasts = [...this.toasts, { id, kind, message }];
    this.emit();
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), durationMs),
    );
  }

  dismiss(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    if (!this.toasts.some((t) => t.id === id)) return;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }

  success(message: string, durationMs?: number) {
    this.push("success", message, durationMs);
  }

  error(message: string, durationMs?: number) {
    this.push("error", message, durationMs);
  }

  /** Test-only: clear pending toasts and timers. */
  resetForTest() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.toasts = [];
    this.emit();
  }
}

const bus = new ToastBus();

export const toast = bus;
