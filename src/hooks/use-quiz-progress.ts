"use client";

import { useCallback, useEffect, useState } from "react";
import type { Phase } from "@/components/workspace/study-set/types";

/**
 * localStorage-backed quiz progress for the StudySetDetail practice flow.
 *
 * On mount, reads the saved entry for this study set. If it's recent and
 * points at a partial run, exposes it via `savedProgress` and flags
 * `hasSavedSession` so the UI can offer a "Resume" prompt.
 *
 * While the quiz is active (phase is `practicing` or `revealed`), auto-saves
 * progress on every advance. Callers clear the entry explicitly when the
 * user restarts or finishes the quiz.
 *
 * Non-critical: all localStorage access is wrapped — if it's disabled or
 * the stored value is malformed, we degrade silently.
 */

const QUIZ_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SavedQuizProgress {
  currentIndex: number;
  correctCount: number;
  total: number;
}

interface UseQuizProgressArgs {
  studySetId: string;
  phase: Phase;
  currentIndex: number;
  correctCount: number;
  total: number;
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

  // Read any existing saved session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        currentIndex: number;
        correctCount: number;
        total: number;
        savedAt: number;
      };
      if (Date.now() - saved.savedAt > QUIZ_MAX_AGE_MS) {
        localStorage.removeItem(storageKey);
        return;
      }
      if (saved.currentIndex > 0 && saved.currentIndex < saved.total) {
        setHasSavedSession(true);
        setSavedProgress({
          currentIndex: saved.currentIndex,
          correctCount: saved.correctCount,
          total: saved.total,
        });
      }
    } catch {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save progress whenever the user advances while the quiz is live
  useEffect(() => {
    if (phase !== "practicing" && phase !== "revealed") return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          currentIndex,
          correctCount,
          total,
          savedAt: Date.now(),
        })
      );
    } catch {
      // Non-critical
    }
  }, [phase, currentIndex, correctCount, total, storageKey]);

  /** Remove the stored session and hide the resume prompt. */
  const clearSavedSession = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setHasSavedSession(false);
    setSavedProgress(null);
  }, [storageKey]);

  /** Hide the resume prompt without clearing storage (used when resuming). */
  const dismissResumePrompt = useCallback(() => {
    setHasSavedSession(false);
  }, []);

  return {
    hasSavedSession,
    savedProgress,
    clearSavedSession,
    dismissResumePrompt,
  };
}
