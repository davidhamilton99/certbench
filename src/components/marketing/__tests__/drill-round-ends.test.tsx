// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PortEntry } from "@/lib/tools/port-quiz-data";

vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/tools/port-numbers-quiz" }));

// A finished round, as the rounds hook hands it to a drill: the drills draw their end card from it.
vi.mock("@/components/marketing/useDrillRounds", () => ({
  useDrillRounds: ({ tool }: { tool: string }) => ({
    tool,
    ready: true,
    complete: true,
    signedIn: false,
    gated: false,
    roundNumber: 1,
    roundCorrect: 15,
    size: 20,
    answered: 20,
    results: [],
    progress: { items: {}, rounds: 1 },
    account: "none",
    linked: false,
    startedHere: false,
    startNextRound: vi.fn(),
    linkAccount: vi.fn(),
    record: vi.fn(),
    advance: vi.fn(),
    nextItem: () => null,
  }),
}));

import { getRecallDecks } from "@/data/recall";
import { PortQuiz } from "../PortQuiz";
import { AcronymDrill } from "../AcronymDrill";
import { SubnettingPractice } from "../SubnettingPractice";

const ENTRIES: PortEntry[] = [
  { port: "22", protocol: "SSH", service: "Secure Shell", transport: "TCP", explanation: "SSH uses port 22." },
  { port: "53", protocol: "DNS", service: "Domain Name System", transport: "TCP/UDP", explanation: "DNS uses port 53." },
];

/**
 * What CompTIA does not publish about an exam: how much of it a topic is, what
 * the rest of it is made of, or what decides a pass. The end of a drill's
 * round says what CertBench offers next, and none of these.
 */
const EXAM_MAKEUP = /small part of the exam|rest of the exam|consists of scenarios|decided by|one skill in one domain/i;

describe("the card at the end of a drill's round", () => {
  it("leads from the port quiz to the exam's study path without saying what the exam is made of", () => {
    render(<PortQuiz entries={ENTRIES} />);
    const card = screen.getByRole("group", { name: "Port numbers: round 1 result" });
    expect(screen.getByRole("heading", { name: "Continue with your exam's study path" })).toBeInTheDocument();
    expect(card).toHaveTextContent(
      "Your study path works through the exam topic by topic, in short sets of questions like this one, up to a readiness checkpoint that shows where you stand."
    );
    expect(card).not.toHaveTextContent(EXAM_MAKEUP);
  });

  it("does the same after the acronym quiz, which leads to the Security+ study path alone", () => {
    const deck = getRecallDecks("security-plus-sy0-701").find((d) => d.config.tableId === "acronyms")!;
    render(<AcronymDrill deck={deck} />);
    const card = screen.getByRole("group", { name: "Acronyms: round 1 result" });
    expect(screen.getByRole("heading", { name: "Continue with the Security+ study path" })).toBeInTheDocument();
    expect(card).toHaveTextContent(
      "Your Security+ study path covers every objective in short sets of questions like this one, up to a readiness checkpoint that shows where you stand."
    );
    expect(card).not.toHaveTextContent(EXAM_MAKEUP);
  });

  it("does the same after the subnetting drills, and does not place subnetting in a domain", () => {
    render(<SubnettingPractice />);
    const card = screen.getByRole("group", { name: "Subnetting: round 1 result" });
    expect(screen.getByRole("heading", { name: "Continue with your exam's study path" })).toBeInTheDocument();
    expect(card).toHaveTextContent(
      "Your study path works through the exam topic by topic, in short sets of questions like this one, up to a readiness checkpoint that shows where you stand."
    );
    expect(card).not.toHaveTextContent(EXAM_MAKEUP);
  });
});
