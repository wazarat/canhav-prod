"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export interface ModalBehaviorOptions {
  /** Called on Escape. */
  onClose: () => void;
  /** The dialog container; Tab focus is trapped inside it. */
  containerRef: RefObject<HTMLElement | null>;
  /** Element to receive initial focus; falls back to first focusable, then the container. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** When false the hook is inert (for always-mounted modals gated on an `open` prop). */
  active?: boolean;
}

/**
 * Shared dialog behavior: Escape-to-close, body scroll lock, Tab focus trap,
 * initial focus, and focus restore on close. Dependency-free by design so
 * every modal in the app (CoinModal, CoinsListModal, ContactModal, and the
 * drill-down panels planned for M6-M9) can share one implementation; a full
 * <Modal> primitive can be layered on top later without changing callers.
 */
export function useModalBehavior({
  onClose,
  containerRef,
  initialFocusRef,
  active = true,
}: ModalBehaviorOptions): void {
  // Callers pass inline closures; track the latest without re-running the
  // effect (a re-run would re-steal focus mid-interaction).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const initial = initialFocusRef?.current ?? focusables()[0] ?? container;
    initial.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Recompute per keypress so conditional content stays trapped.
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        container?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey) {
        if (current === first || !container?.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !container?.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Restore focus only when it is still inside the closing dialog (or fell
      // to body); when one modal chains into another, the next modal's initial
      // focus must win.
      const activeEl = document.activeElement;
      if (
        previouslyFocused?.isConnected &&
        (activeEl === document.body || activeEl === null || container.contains(activeEl))
      ) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}
