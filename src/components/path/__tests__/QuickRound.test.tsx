// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ChoiceRep } from "@/core/path/types";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));

import { QuickRound } from "../QuickRound";

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

const rep = (id: string): ChoiceRep => ({
  id,
  type: "choice",
  label: "Quick scenario",
  tier: "quick",
  objective: "1.1",
  prompt: `Prompt ${id}`,
  options: ["Right answer", "Wrong one", "Wrong two", "Wrong three"],
  answer: 0,
  takeaway: "Takeaway",
});

function play(right: boolean) {
  fireEvent.click(screen.getByRole("radio", { name: right ? /Right answer/ : /Wrong one/ }));
  fireEvent.click(screen.getByRole("button", { name: right ? /^Next/ : /Got it/ }));
}

beforeEach(() => {
  store.clear();
  track.mockClear();
});

describe("QuickRound", () => {
  it("plays the stop inline and counts it on the visitor's path", () => {
    render(
      <QuickRound
        cert="security-plus-sy0-701"
        stopId="1.1"
        examName="Security+"
        reps={[rep("a|1.1|x"), rep("a|1.1|y")]}
        label="Objective 1.1 · Security controls"
        surface="objective_page"
        pitch="That's one of 28 objectives."
      />
    );
    play(true);
    play(false);

    expect(screen.getByText("of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start my Security\+ path/ })).toHaveAttribute(
      "href",
      "/path/security-plus-sy0-701"
    );
    const saved = JSON.parse(store.get("cb_path_security-plus-sy0-701")!);
    expect(Object.keys(saved.progress.items)).toEqual(["a|1.1|x", "a|1.1|y"]);
    expect(saved.progress.stops["1.1"]).toMatchObject({ n: 1, c: 1, t: 2 });
    expect(saved.owner).toBeNull();
    expect(track).toHaveBeenCalledWith("quick_round_completed", {
      cert: "security-plus-sy0-701",
      surface: "objective_page",
      correct: 1,
      total: 2,
    });
  });

  it("keeps an existing owner when adding to a signed-in device's path", () => {
    store.set(
      "cb_path_security-plus-sy0-701",
      JSON.stringify({ v: 1, owner: "user-1", progress: { items: {}, stops: {}, checkpoint: null, goal: null } })
    );
    render(
      <QuickRound
        cert="security-plus-sy0-701"
        stopId="warmup"
        examName="Security+"
        reps={[rep("a|4.5|w1")]}
        label="Security+ warm-up"
        surface="practice_test_page"
        pitch="That's the warm-up."
      />
    );
    play(true);
    const saved = JSON.parse(store.get("cb_path_security-plus-sy0-701")!);
    expect(saved.owner).toBe("user-1");
    expect(saved.progress.stops.warmup.n).toBe(1);
  });
});
