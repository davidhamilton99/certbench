// @vitest-environment jsdom

import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Node 25+ and jsdom both expose `localStorage`, but in this combination
// neither implements the full Storage API reliably (clear() goes missing).
// Install a pure in-memory Storage shim BEFORE importing the hook so its
// module-level reads and every `localStorage.*` call hit this copy.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    key(i: number) {
      return Array.from(data.keys())[i] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
}

const memoryStorage = createMemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: memoryStorage,
});
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: memoryStorage,
});

const { useQuizProgress } = await import("./use-quiz-progress");

const STUDY_SET_ID = "11111111-1111-1111-1111-111111111111";
const storageKey = `certbench_studyset_${STUDY_SET_ID}`;

const store = () => memoryStorage;

function mockFetchOnce(response: {
  ok?: boolean;
  progress: { currentIndex: number; correctCount: number; total: number; savedAt: number } | null;
}) {
  const { ok = true, progress } = response;
  globalThis.fetch = vi.fn(async () =>
    ({
      ok,
      status: ok ? 200 : 500,
      json: async () => ({ progress }),
    }) as unknown as Response
  );
}

function writeLocalProgress(entry: {
  currentIndex: number;
  correctCount: number;
  total: number;
  savedAt: number;
}) {
  store().setItem(storageKey, JSON.stringify(entry));
}

describe("useQuizProgress resume-banner merge", () => {
  beforeEach(() => {
    store().clear();
    vi.restoreAllMocks();
  });

  it("clears stale local state when the server has no progress", async () => {
    // Another device completed the quiz, which DELETEs the server row.
    // The local copy from this device's last save is now stale.
    writeLocalProgress({
      currentIndex: 274,
      correctCount: 200,
      total: 324,
      savedAt: Date.now(),
    });
    mockFetchOnce({ progress: null });

    const { result } = renderHook(() =>
      useQuizProgress({
        studySetId: STUDY_SET_ID,
        phase: "overview",
        currentIndex: 0,
        correctCount: 0,
        total: 324,
      })
    );

    // Local flashes first (prevents a network-blocked banner).
    expect(result.current.hasSavedSession).toBe(true);

    // After the server responds null, the stale banner should disappear.
    await waitFor(() => {
      expect(result.current.hasSavedSession).toBe(false);
    });
    expect(result.current.savedProgress).toBeNull();
    expect(store().getItem(storageKey)).toBeNull();
  });

  it("clears the banner when the server shows a completed run", async () => {
    writeLocalProgress({
      currentIndex: 274,
      correctCount: 200,
      total: 324,
      savedAt: Date.now() - 60_000, // older than server
    });
    mockFetchOnce({
      progress: {
        currentIndex: 324,
        correctCount: 310,
        total: 324,
        savedAt: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useQuizProgress({
        studySetId: STUDY_SET_ID,
        phase: "overview",
        currentIndex: 0,
        correctCount: 0,
        total: 324,
      })
    );

    await waitFor(() => {
      expect(result.current.hasSavedSession).toBe(false);
    });
    expect(result.current.savedProgress).toBeNull();
    // Completed run shouldn't be cached locally.
    expect(store().getItem(storageKey)).toBeNull();
  });

  it("adopts server progress when it is newer than local", async () => {
    writeLocalProgress({
      currentIndex: 50,
      correctCount: 40,
      total: 324,
      savedAt: Date.now() - 60_000,
    });
    mockFetchOnce({
      progress: {
        currentIndex: 180,
        correctCount: 140,
        total: 324,
        savedAt: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useQuizProgress({
        studySetId: STUDY_SET_ID,
        phase: "overview",
        currentIndex: 0,
        correctCount: 0,
        total: 324,
      })
    );

    await waitFor(() => {
      expect(result.current.savedProgress?.currentIndex).toBe(180);
    });
    expect(result.current.hasSavedSession).toBe(true);
  });

  it("keeps local state if the network request fails", async () => {
    writeLocalProgress({
      currentIndex: 50,
      correctCount: 40,
      total: 324,
      savedAt: Date.now(),
    });
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    });

    const { result } = renderHook(() =>
      useQuizProgress({
        studySetId: STUDY_SET_ID,
        phase: "overview",
        currentIndex: 0,
        correctCount: 0,
        total: 324,
      })
    );

    // Give the rejected promise a tick to settle.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.hasSavedSession).toBe(true);
    expect(result.current.savedProgress?.currentIndex).toBe(50);
    // Local copy should still be there — it's all we have until we're online.
    expect(localStorage.getItem(storageKey)).not.toBeNull();
  });
});
