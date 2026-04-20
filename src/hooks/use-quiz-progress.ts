"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Phase } from "@/components/workspace/study-set/types";

/**
 * Cross-device quiz progress for the StudySetDetail practice flow.
 *
 * Writes to localStorage for instant response AND to the server for cross-
 * device sync. On mount we race-merge both sources: whichever copy is newer
 * wins. While the quiz is active, every advance triggers an immediate
 * localStorage write and a 1s-debounced POST to /api/study-materials/progress.
 *
 * The server is the source of truth when the user signs in on another
 * device — it always has the latest savedAt if the other device was online
 * when it last saved.
 */

const QUIZ_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const SERVER_DEBOUNCE_MS = 1000;

export interface SavedQuizProgress {
  currentIndex: number;
  correctCount: number;
  total: number;
}

interface StoredEntry extends SavedQuizProgress {
  savedAt: number;
}

interface UseQuizProgressArgs {
  studySetId: string;
  phase: Phase;
  currentIndex: number;
  correctCount: number;
  total: number;
}

function readLocal(storageKey: string): StoredEntry | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as StoredEntry;
    if (Date.now() - saved.savedAt > QUIZ_MAX_AGE_MS) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return saved;
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    return null;
  }
}

function writeLocal(storageKey: string, entry: StoredEntry) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Non-critical
  }
}

function clearLocal(storageKey: string) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

export function useQuizProgress({
  studySetId,
  phase,
  currentIndex,
  correctCount,
  total,
}: UseQuizProgressArgs) {
  const storageKey = `certbench_studyset_${studySetId}`;

  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [savedProgress, setSavedProgress] = useState<SavedQuizProgress | null>(
    null
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);

  // On mount: pull both sources in parallel, keep the newer one.
  useEffect(() => {
    let cancelled = false;
    const localEntry = readLocal(storageKey);

    const applyEntry = (entry: StoredEntry) => {
      if (cancelled || dismissedRef.current) return;
      // Only surface as "saved session" if it represents a partial run.
      if (entry.currentIndex > 0 && entry.currentIndex < entry.total) {
        setHasSavedSession(true);
        setSavedProgress({
          currentIndex: entry.currentIndex,
          correctCount: entry.correctCount,
          total: entry.total,
        });
      }
    };

    // Show local immediately (if fresh) so the resume banner isn't blocked
    // on a network round-trip.
    if (localEntry) applyEntry(localEntry);

    (async () => {
      try {
        const res = await fetch(
          `/api/study-materials/progress?studySetId=${encodeURIComponent(studySetId)}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          progress: StoredEntry | null;
        };
        if (cancelled) return;
        const serverEntry = json.progress;
        if (!serverEntry) {
          // Server has no record. If local is stale or we don't want to
          // surface it, drop it.
          return;
        }
        // Keep whichever is newer.
        if (!localEntry || serverEntry.savedAt > localEntry.savedAt) {
          writeLocal(storageKey, serverEntry);
          applyEntry(serverEntry);
        }
      } catch {
        // Network errors are non-critical — local copy still works offline.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySetId]);

  // Auto-save on every advance: localStorage immediate, server debounced.
  useEffect(() => {
    if (phase !== "practicing" && phase !== "revealed") return;

    const entry: StoredEntry = {
      currentIndex,
      correctCount,
      total,
      savedAt: Date.now(),
    };
    writeLocal(storageKey, entry);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch("/api/study-materials/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studySetId,
          currentIndex,
          correctCount,
          totalQuestions: total,
        }),
      }).catch(() => {
        // Non-critical — next save attempt will include this state.
      });
    }, SERVER_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phase, currentIndex, correctCount, total, storageKey, studySetId]);

  /** Remove stored progress (both local and server) and hide the prompt. */
  const clearSavedSession = useCallback(() => {
    clearLocal(storageKey);
    setHasSavedSession(false);
    setSavedProgress(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    fetch(
      `/api/study-materials/progress?studySetId=${encodeURIComponent(studySetId)}`,
      { method: "DELETE", credentials: "include" }
    ).catch(() => {
      // Non-critical
    });
  }, [storageKey, studySetId]);

  /** Hide the resume prompt without clearing storage (used when resuming). */
  const dismissResumePrompt = useCallback(() => {
    dismissedRef.current = true;
    setHasSavedSession(false);
  }, []);

  return {
    hasSavedSession,
    savedProgress,
    clearSavedSession,
    dismissResumePrompt,
  };
}
