// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { buildPlan } from "@/core/path/plan";
import type { ChoiceRep, PathProgress, PathStop, PathStructure, Rep } from "@/core/path/types";

/** Who the mocked Supabase client says is signed in. */
const auth = vi.hoisted(() => ({ session: null as null | { user: { id: string; email: string } } }));
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: auth.session } }),
      signOut: async () => ({}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn(), resetAnalytics: vi.fn() }));

// The dial animates with rAF; its look isn't under test here.
vi.mock("@/components/instrument/ReadinessDial", () => ({
  ReadinessDial: ({ score }: { score: number }) => <div data-testid="dial">{score}%</div>,
}));

/** The API, answered per endpoint path. Tests swap handlers as needed. */
const server = vi.hoisted(() => ({
  progress: null as null | Record<string, unknown>,
  access: "free" as "free" | "pro",
  stopHandler: null as null | ((input: { index: number }) => unknown),
  calls: [] as { path: string; input: unknown }[],
}));
vi.mock("@/lib/api-client", async () => {
  const { ApiError } = await import("@/contracts/common");
  return {
    api: async (contract: { path: string; method: string }, input: Record<string, unknown>) => {
      server.calls.push({ path: contract.path, input });
      switch (`${contract.method} ${contract.path}`) {
        case "GET /api/path/progress":
          return {
            progress: server.progress ?? { items: {}, stops: {}, checkpoint: null, goal: null },
            stored: true,
            access: server.access,
            proPlan: false,
            certId: "11111111-1111-4111-8111-111111111111",
          };
        case "POST /api/path/progress":
          return { ok: true, stored: true };
        case "POST /api/path/stop": {
          const out = server.stopHandler?.(input as { index: number });
          if (out instanceof Error) throw out;
          return out;
        }
        case "POST /api/path/answers":
        case "POST /api/path/enroll":
          return { ok: true, enrolled: true };
        case "GET /api/pricing/region":
          return {
            discountPercent: null,
            prices: { quarterly: { original: "$39", discounted: "$39" } },
          };
        default:
          throw new ApiError("not_found", `unmocked ${contract.path}`);
      }
    },
  };
});

import { PathApp } from "../PathApp";
import { ApiError } from "@/contracts/common";

// Node's own experimental `localStorage` global shadows jsdom's — use a plain
// in-memory Storage so the path's persistence is exercised for real.
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
window.scrollTo = () => {};

const structure: PathStructure = {
  certSlug: "security-plus-sy0-701",
  examName: "Security+",
  examCode: "SY0-701",
  domains: [1, 2].map((d) => ({
    number: `${d}.0`,
    title: `Domain ${d}`,
    weight: 50,
    objectives: [1, 2, 3].map((o) => ({ code: `${d}.${o}`, title: `Objective ${d}.${o}` })),
  })),
};
const plan = buildPlan(structure);

const rep = (id: string, objective: string, tier: ChoiceRep["tier"] = "quick"): ChoiceRep => ({
  id,
  type: "choice",
  label: tier === "exam" ? "Exam style" : "Quick scenario",
  tier,
  objective,
  prompt: `Prompt ${id}`,
  options: ["Right answer", "Wrong one", "Wrong two", "Wrong three"],
  answer: 0,
  takeaway: `Takeaway ${id}`,
});

const warmup = {
  stop: plan.stops[0],
  reps: [rep("a|1.1|w1", "1.1"), rep("a|2.1|w2", "2.1"), rep("a|1.2|w3", "1.2", "exam")] as Rep[],
};

function stopReply(index: number, n = 3) {
  const stop: PathStop = plan.stops[index] ?? { ...plan.stops[0], id: "review", kind: "review", index };
  const objective = stop.objectives[0] ?? "1.1";
  return { stop, reps: Array.from({ length: n }, (_, i) => rep(`a|${objective}|s${index}-${i}`, objective)) };
}

function renderPath() {
  return render(<PathApp cert="security-plus-sy0-701" structure={structure} plan={plan} warmup={warmup} questionCount={842} />);
}

/** Answer the rep on screen (right or wrong) and move on. */
async function answer(right = true) {
  fireEvent.click(screen.getByRole("radio", { name: right ? /Right answer/ : /Wrong one/ }));
  fireEvent.click(await screen.findByRole("button", { name: right ? /^Next/ : /Got it/ }));
}

const done = (ids: string[], extra?: Partial<PathProgress>): PathProgress => ({
  items: {},
  stops: Object.fromEntries(ids.map((id) => [id, { n: 1, c: 3, t: 3, at: 1 }])),
  checkpoint: null,
  goal: null,
  ...extra,
});

beforeEach(() => {
  auth.session = null;
  server.progress = null;
  server.access = "free";
  server.stopHandler = (input) => stopReply(input.index);
  server.calls = [];
  track.mockClear();
  localStorage.clear();
});

describe("a first visit", () => {
  it("starts on the warm-up's first rep with nothing to decide", async () => {
    renderPath();
    await act(async () => {});
    expect(screen.getByText("Prompt a|1.1|w1")).toBeInTheDocument();
    expect(screen.getByText("Warm-up")).toBeInTheDocument();
  });

  it("ends the warm-up on the map, with the save prompt as the way on", async () => {
    renderPath();
    await act(async () => {});
    await answer(true);
    await answer(false);
    await answer(true);
    expect(await screen.findByText(/Warm-up complete/i)).toBeInTheDocument();
    expect(screen.getByText(/1 to revisit/)).toBeInTheDocument();
    expect(screen.getByText("Save your map to keep going")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    // Nothing went to the server: the warm-up needs no account.
    expect(server.calls.filter((c) => c.path === "/api/path/stop")).toHaveLength(0);
    const saved = JSON.parse(localStorage.getItem("cb_path_security-plus-sy0-701")!);
    expect(saved.progress.stops.warmup.n).toBe(1);
    expect(track).toHaveBeenCalledWith("path_started", { cert: "security-plus-sy0-701" });
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "warmup", correct: 2, total: 3, signed_in: false })
    );
  });

  it("shows the takeaway and waits on a miss", async () => {
    renderPath();
    await act(async () => {});
    fireEvent.click(screen.getByRole("radio", { name: /Wrong one/ }));
    expect(await screen.findByText(/It's Right answer\./)).toBeInTheDocument();
    expect(screen.getByText("Takeaway a|1.1|w1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Got it/ })).toBeInTheDocument();
  });

  it("answers from the keyboard", async () => {
    renderPath();
    await act(async () => {});
    fireEvent.keyDown(document, { key: "1" });
    expect(await screen.findByText(/^Right\./)).toBeInTheDocument();
  });
});

describe("a returning visitor", () => {
  it("lands on their map, not the warm-up", async () => {
    localStorage.setItem(
      "cb_path_security-plus-sy0-701",
      JSON.stringify({ v: 1, owner: null, progress: done(["warmup"]) })
    );
    renderPath();
    expect(await screen.findByText("Your Security+ path")).toBeInTheDocument();
    expect(screen.getByText("Save your map to keep going")).toBeInTheDocument();
    expect(screen.queryByText("Prompt a|1.1|w1")).toBeNull();
  });
});

describe("a signed-in learner", () => {
  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
  });

  it("continues to the next stop with one tap", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
    const call = server.calls.find((c) => c.path === "/api/path/stop");
    expect(call?.input).toMatchObject({ cert: "security-plus-sy0-701", index: 1 });
  });

  it("asks one goal question at a time between stops, then plays the stop", async () => {
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Have you booked your Security+ exam?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Not booked yet" }));
    fireEvent.click(screen.getByRole("button", { name: "In 1–2 months" }));
    expect(await screen.findByText("How much time can you give it on most days?")).toBeInTheDocument();
    expect(server.calls.some((c) => c.path === "/api/path/enroll")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "About 20 minutes" }));
    expect(await screen.findByText("Prompt a|1.2|s2-0")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_goal_set", { cert: "security-plus-sy0-701", step: "minutes", value: "20" });
  });

  it("records bank answers against the account at the end of a stop", async () => {
    server.progress = done(["warmup"], { goal: { examDate: null, target: null, minutes: 20, at: 1 } });
    server.stopHandler = () => ({
      stop: plan.stops[1],
      reps: [rep("q|1.1|22222222-2222-4222-8222-222222222222", "1.1", "exam")],
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText(/Prompt q\|1\.1/);
    await answer(false);
    await screen.findByText(/Stop 2 complete/i);
    const recorded = server.calls.find((c) => c.path === "/api/path/answers");
    expect(recorded?.input).toEqual({
      cert: "security-plus-sy0-701",
      answers: [{ questionId: "22222222-2222-4222-8222-222222222222", selectedIndex: 1 }],
    });
  });

  it("runs the checkpoint, reveals the score and makes the one offer", async () => {
    const before = plan.stops.slice(0, plan.freeThrough).map((s) => s.id);
    server.progress = done(before, { goal: { examDate: null, target: null, minutes: 20, at: 1 } });
    server.stopHandler = (input) => ({
      stop: plan.stops[input.index],
      reps: [rep("q|1.1|33333333-3333-4333-8333-333333333333", "1.1", "exam"), rep("q|2.2|44444444-4444-4444-8444-444444444444", "2.2", "exam")],
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Start the checkpoint/ }));
    await screen.findByText(/Prompt q\|1\.1/);
    await answer(true);
    await answer(false);
    expect(await screen.findByTestId("dial")).toHaveTextContent("50%");
    expect(screen.getByText("Unlock the rest of your path")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unlock my path/ })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_checkpoint_completed", { cert: "security-plus-sy0-701", score: 50 });
    expect(track).toHaveBeenCalledWith("path_offer_viewed", { cert: "security-plus-sy0-701", context: "reveal" });
  });

  it("offers the rest of the path when the server says it's Pro-only", async () => {
    const free = plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id);
    server.progress = done(free, {
      checkpoint: { score: 64, at: 1, domains: [{ number: "1.0", correct: 2, total: 3 }] },
    });
    renderPath();
    expect(await screen.findByText("Unlock the rest of your path")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Continue/ })).toBeNull();
  });

  it("shows the reveal with the offer when a stop comes back 402", async () => {
    server.progress = done(["warmup"], {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 40, at: 1, domains: [] },
    });
    server.stopHandler = () => new ApiError("quota_exceeded", "The rest of the path is part of Pro.");
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Unlock the rest of your path")).toBeInTheDocument();
  });

  it("lets a Pro member carry on past the checkpoint", async () => {
    server.access = "pro";
    const free = plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id);
    server.progress = done(free, {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 80, at: 1, domains: [] },
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await waitFor(() =>
      expect(server.calls.find((c) => c.path === "/api/path/stop")?.input).toMatchObject({ index: plan.freeThrough + 1 })
    );
    expect(screen.queryByText("Unlock the rest of your path")).toBeNull();
  });
});
