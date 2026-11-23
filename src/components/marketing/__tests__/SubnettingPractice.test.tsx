// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (cb: (event: string, s: unknown) => void) => {
        queueMicrotask(() => cb("INITIAL_SESSION", null));
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  }),
}));
vi.mock("@/lib/api-client", () => ({ api: async () => ({ ok: true }) }));
const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/tools/subnetting-practice" }));

import { SubnettingPractice } from "../SubnettingPractice";

// Node's own experimental `localStorage` global shadows jsdom's.
const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const modes = () => within(screen.getByRole("group", { name: "Drill mode" }));
/** The skill named on the card on screen: the one small label that is a span. */
const skill = () => document.querySelector("span.cb-label")?.textContent;
/** The answers of a yes or no question: a group named by the question. */
const yesNo = () => within(screen.getByRole("button", { name: "Yes" }).closest('[role="group"]') as HTMLElement);

beforeEach(() => {
  store.clear();
  track.mockClear();
});

describe("SubnettingPractice", () => {
  it("plays the study path's subnetting card, and a miss opens its worked steps", async () => {
    render(<SubnettingPractice />);
    await waitFor(() => expect(screen.getByText("Subnetting, round 1")).toBeInTheDocument());
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
    expect(modes().getByRole("button", { name: "Network ID" })).toHaveAttribute("aria-pressed", "true");
    expect(skill()).toBe("Network ID");
    expect(screen.getByText("Your pace is shown after three answers.")).toBeInTheDocument();
    // What to do is said at the foot of the card until the question is answered.
    expect(screen.getByText(/^Type your answer and press Enter\. It is marked at once\./)).toBeInTheDocument();

    // The page does not take the focus as it loads: no keyboard opens on a
    // phone, and a screen reader starts at the top of the page.
    const field = screen.getByLabelText("Your answer");
    expect(field).not.toHaveFocus();
    expect(document.body).toHaveFocus();

    fireEvent.change(field, { target: { value: "1.2.3.4" } });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    // The verdict is a sentence, read with the button that takes the focus.
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toHaveFocus();
    expect(next).toHaveAccessibleDescription(/^Incorrect\. The correct answer is \d+\.\d+\.\d+\.\d+\./);
    // The rest of the worked steps are open, not folded away.
    const why = screen.getByText("Read the full explanation").closest("details")!;
    expect(why.open).toBe(true);
    expect(why.querySelector("p")?.textContent?.length).toBeGreaterThan(10);

    // The question that follows an answer takes the focus in its field.
    fireEvent.click(next);
    expect(screen.getByText("Question 2 of 20")).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveFocus();
  });

  it("deals the card again on a new setting, and moves on once it has counted", async () => {
    render(<SubnettingPractice />);
    await waitFor(() => expect(screen.getByText("Question 1 of 20")).toBeInTheDocument());

    // Not answered yet: the same question slot, in the new mode.
    fireEvent.click(modes().getByRole("button", { name: "Same subnet?" }));
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
    expect(skill()).toBe("Same subnet?");
    // Its answers are plain buttons in a group named by the question.
    expect(yesNo().getAllByRole("button").map((b) => b.textContent)).toEqual(["1Yes", "2No"]);

    // Answered: it counted, so a new mode moves on to the next question.
    fireEvent.click(yesNo().getByRole("button", { name: "Yes" }));
    fireEvent.click(modes().getByRole("button", { name: "Binary" }));
    expect(screen.getByText("Question 2 of 20")).toBeInTheDocument();
    expect(skill()).toBe("Binary");

    // The prefix range deals the question on screen again too.
    fireEvent.click(screen.getByRole("button", { name: "/8–/30" }));
    expect(screen.getByRole("button", { name: "/8–/30" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Question 2 of 20")).toBeInTheDocument();
  });

  it("names each question's skill in the mixed mode", async () => {
    render(<SubnettingPractice />);
    await waitFor(() => expect(screen.getByText("Question 1 of 20")).toBeInTheDocument());
    fireEvent.click(modes().getByRole("button", { name: "Mixed" }));
    expect(["Binary", "CIDR and mask", "Network ID", "Broadcast and range", "Host math", "Same subnet?"]).toContain(skill());
  });

  it("holds the card's place while the drill loads, at the height of a typed question", () => {
    render(<SubnettingPractice />);
    // Before the first question is dealt: the same card, saying so.
    expect(screen.getByRole("status")).toHaveTextContent("The drill is loading.");
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
    // The modes are shown and cannot be pressed yet.
    expect(modes().getByRole("button", { name: "Network ID" })).toBeDisabled();
  });
});
