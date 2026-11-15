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
/** The skill named on the card on screen. */
const skill = () => document.querySelector(".path-rise > span")?.textContent;

beforeEach(() => {
  store.clear();
  track.mockClear();
});

describe("SubnettingPractice", () => {
  it("plays the path's subnetting card, and a miss opens its worked steps", async () => {
    render(<SubnettingPractice />);
    await waitFor(() => expect(screen.getByText("Subnetting · round 1")).toBeInTheDocument());
    expect(screen.getByText("1 / 20")).toBeInTheDocument();
    expect(modes().getByRole("button", { name: "Network ID" })).toHaveAttribute("aria-pressed", "true");
    expect(skill()).toBe("Network ID");
    expect(screen.getByText("Your pace shows after 3 answers")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "1.2.3.4" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^It's \d+\.\d+\.\d+\.\d+\./);
    // The rest of the worked steps are open, not folded away.
    const why = screen.getByText("Why, in full").closest("details")!;
    expect(why.open).toBe(true);
    expect(why.querySelector("p")?.textContent?.length).toBeGreaterThan(10);
  });

  it("deals the card again on a new setting, and moves on once it has counted", async () => {
    render(<SubnettingPractice />);
    await waitFor(() => expect(screen.getByText("1 / 20")).toBeInTheDocument());

    // Not answered yet: the same question slot, in the new mode.
    fireEvent.click(modes().getByRole("button", { name: "Same subnet?" }));
    expect(screen.getByText("1 / 20")).toBeInTheDocument();
    expect(skill()).toBe("Same subnet?");
    const answers = within(screen.getByRole("radiogroup", { name: "Answers" }));
    expect(answers.getAllByRole("radio").map((r) => r.textContent)).toEqual(["1Yes", "2No"]);

    // Answered: it counted, so a new mode moves on to the next question.
    fireEvent.click(answers.getAllByRole("radio")[0]);
    fireEvent.click(modes().getByRole("button", { name: "Binary" }));
    expect(screen.getByText("2 / 20")).toBeInTheDocument();
    expect(skill()).toBe("Binary");

    // The prefix range deals the question on screen again too.
    fireEvent.click(screen.getByRole("button", { name: "/8–/30" }));
    expect(screen.getByRole("button", { name: "/8–/30" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2 / 20")).toBeInTheDocument();
  });

  it("names each question's skill in the gauntlet", async () => {
    render(<SubnettingPractice />);
    await waitFor(() => expect(screen.getByText("1 / 20")).toBeInTheDocument());
    fireEvent.click(modes().getByRole("button", { name: "Gauntlet" }));
    expect(["Binary", "CIDR ↔ mask", "Network ID", "Broadcast & range", "Host math", "Same subnet?"]).toContain(skill());
  });
});
