// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MissedQuestion } from "@/server/data/review";

const state = vi.hoisted(() => ({ missed: [] as unknown[] }));

vi.mock("@/server/auth", () => ({
  requireProPage: async () => ({ db: {}, user: { id: "u1" } }),
}));
vi.mock("@/server/data/enrollments", () => ({
  listEnrollments: async () => [{ certificationId: "c1", examDate: null }],
}));
vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async () => null,
  listActiveCertifications: async () => [
    { id: "c1", slug: "network-plus-n10-009", name: "Network+", examCode: "N10-009" },
  ],
}));
vi.mock("@/server/data/review", () => ({ listMissedQuestions: async () => state.missed }));
// "Report a problem with this question" is on the page; it is not used here.
vi.mock("@/lib/api-client", () => ({ api: vi.fn() }));

import ReviewPage from "../review/page";

/** A Network+ question whose explanation names two answers by their letters. */
const LETTERED: MissedQuestion = {
  question: {
    id: "q1",
    certification_id: "c1",
    domain_id: "d1",
    sub_objective_id: null,
    question_text: "Which device forwards frames by MAC address?",
    options: [
      { text: "Hub", is_correct: false },
      { text: "Switch", is_correct: true },
      { text: "Router", is_correct: false },
      { text: "Repeater", is_correct: false },
    ],
    correct_index: 1,
    explanation:
      "A switch (option B) forwards frames by MAC address, and a router (option C) forwards packets between networks.",
    difficulty: 2,
  },
  timesSeen: 3,
  timesCorrect: 1,
  lastSeenAt: "2026-11-20T00:00:00.000Z",
};

async function page() {
  return render(await ReviewPage({ searchParams: Promise.resolve({}) }));
}

/** The lettered answers of each listed question, as they are read. */
function answers(container: HTMLElement): string[][] {
  return [...container.querySelectorAll("details")].map((question) =>
    [...question.querySelectorAll("p")].map((p) => p.textContent ?? "").filter((text) => /^[A-F]\. /.test(text))
  );
}

beforeEach(() => {
  state.missed = [LETTERED];
});

describe("the page of missed questions", () => {
  it("letters each answer in its stored order, so that the letter in an explanation names the answer under it", async () => {
    const { container } = await page();
    expect(screen.getByRole("heading", { level: 1, name: "Review" })).toBeInTheDocument();
    // The explanation says "A switch (option B)" and "a router (option C)".
    expect(answers(container)).toEqual([["A. Hub", "B. Correct answer: Switch", "C. Router", "D. Repeater"]]);
    expect(screen.getByText(LETTERED.question.explanation)).toBeInTheDocument();
    expect(screen.getByText("1 of 3 correct")).toBeInTheDocument();
  });

  it("says so when there is nothing to review", async () => {
    state.missed = [];
    await page();
    expect(
      screen.getByText("You have no questions to review. A question that you answer incorrectly is listed here.")
    ).toBeInTheDocument();
  });
});
