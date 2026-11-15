"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

/**
 * Which player on a page answers the keyboard. A public page can hold more
 * than one: the warm-up at the top and a question deck below it both take
 * 1–4 for an answer, and without a turn a single key press would answer
 * both. The first player to mount holds the keys; clicking or tabbing into
 * another hands them over. Pages with one player are unaffected.
 */
let holder: string | null = null;
const listeners = new Set<() => void>();

function setHolder(next: string | null) {
  if (holder === next) return;
  holder = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Give the keys to a player, e.g. when it starts. */
export function claimKeyboard(id: string) {
  setHolder(id);
}

/**
 * Whether the player rooted at `root` holds the keys now. It takes them if
 * nobody holds them yet, and whenever someone presses or focuses inside it.
 */
export function useKeyboardTurn(id: string, root: RefObject<HTMLElement | null>): boolean {
  useEffect(() => {
    if (holder === null) setHolder(id);
    const el = root.current;
    const take = () => setHolder(id);
    el?.addEventListener("pointerdown", take);
    el?.addEventListener("focusin", take);
    return () => {
      el?.removeEventListener("pointerdown", take);
      el?.removeEventListener("focusin", take);
      if (holder === id) setHolder(null);
    };
  }, [id, root]);
  return useSyncExternalStore(
    subscribe,
    () => holder === id,
    () => false
  );
}
