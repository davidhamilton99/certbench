import type {
  QuizConfig,
  QuizEvent,
  QuizSnapshot,
  QuizState,
  QuizStateActive,
} from "./types";

/**
 * Pure quiz state machine. Drives every quiz surface via useReducer in
 * QuizShell; all side effects (persistence, server grading, navigation)
 * live in the component layer reacting to state transitions.
 */

export function initQuizState(now: string): QuizStateActive {
  return {
    status: "active",
    index: 0,
    responses: {},
    flagged: [],
    revealed: [],
    startedAt: now,
  };
}

/** Rehydrate from a persisted snapshot (resume after refresh / other device). */
export function restoreQuizState(snapshot: QuizSnapshot): QuizStateActive {
  return {
    status: "active",
    index: snapshot.index,
    responses: snapshot.responses,
    flagged: snapshot.flagged,
    revealed: snapshot.revealed,
    startedAt: snapshot.startedAt,
  };
}

/** Serialize the resumable part of the state for persistence. */
export function toSnapshot(
  state: QuizState,
  seed: string
): QuizSnapshot | null {
  if (state.status !== "active" && state.status !== "review") return null;
  return {
    index: state.index,
    responses: state.responses,
    flagged: state.flagged,
    revealed: state.revealed,
    startedAt: state.startedAt,
    seed,
  };
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

export function quizReducer(
  config: QuizConfig,
  totalQuestions: number,
  state: QuizState,
  event: QuizEvent
): QuizState {
  switch (state.status) {
    case "active":
    case "review": {
      switch (event.type) {
        case "ANSWER": {
          // Immutable once revealed — immediate-feedback modes lock answers.
          if (state.revealed.includes(event.questionId)) return state;
          return {
            ...state,
            responses: {
              ...state.responses,
              [event.questionId]: {
                value: event.value,
                answeredAt: new Date().toISOString(),
              },
            },
          };
        }
        case "GRADE": {
          const existing = state.responses[event.questionId];
          if (!existing) return state;
          return {
            ...state,
            responses: {
              ...state.responses,
              [event.questionId]: { ...existing, grade: event.grade },
            },
          };
        }
        case "REVEAL": {
          if (config.grading === "server_at_end") return state;
          if (state.revealed.includes(event.questionId)) return state;
          return { ...state, revealed: [...state.revealed, event.questionId] };
        }
        case "NAVIGATE":
          return { ...state, index: clamp(event.to, totalQuestions - 1) };
        case "NEXT":
          return { ...state, index: clamp(state.index + 1, totalQuestions - 1) };
        case "PREV":
          return { ...state, index: clamp(state.index - 1, totalQuestions - 1) };
        case "TOGGLE_FLAG": {
          if (!config.allowFlagging) return state;
          const flagged = state.flagged.includes(event.questionId)
            ? state.flagged.filter((id) => id !== event.questionId)
            : [...state.flagged, event.questionId];
          return { ...state, flagged };
        }
        case "ENTER_REVIEW":
          if (!config.allowReview || state.status === "review") return state;
          return { ...state, status: "review" };
        case "EXIT_REVIEW":
          if (state.status !== "review") return state;
          return { ...state, status: "active" };
        case "SUBMIT_START":
          return { ...state, status: "submitting" };
        default:
          return state;
      }
    }

    case "submitting": {
      switch (event.type) {
        case "SUBMIT_SUCCESS":
          return {
            status: "results",
            responses: state.responses,
            flagged: state.flagged,
          };
        case "SUBMIT_FAILURE":
          return {
            status: "error",
            message: event.message,
            resume: { ...state, status: "active" },
          };
        default:
          return state;
      }
    }

    case "error": {
      if (event.type === "RETRY") return state.resume;
      return state;
    }

    case "results":
      return state;
  }
}

// ---------- Selectors ----------

export function answeredCount(state: QuizState): number {
  if (state.status === "error") return answeredCount(state.resume);
  return Object.keys(state.responses).length;
}

export function isComplete(state: QuizState, totalQuestions: number): boolean {
  return answeredCount(state) >= totalQuestions;
}

export function unansweredIndexes(
  state: QuizState,
  questionIds: string[]
): number[] {
  if (state.status === "results") return [];
  const responses =
    state.status === "error" ? state.resume.responses : state.responses;
  return questionIds
    .map((id, i) => (responses[id] ? -1 : i))
    .filter((i) => i >= 0);
}
