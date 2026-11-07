// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { itemStatus } from "@/core/drill-rounds/drill-rounds";
import { buildPlan } from "@/core/path/plan";
import { recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type ChoiceRep, type PathProgress, type PathStop, type PathStructure, type Rep } from "@/core/path/types";

/** Who the mocked Supabase client says is signed in. */
const auth = vi.hoisted(() => ({ session: null as null | { user: { id: string; email: string } } }));
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: auth.session } }),
      signOut: async () => ({}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signUp: async ({ email }: { email: string }) => {
        const user = { id: "new-user", email };
        return { data: { user, session: { user } }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string }) => ({
        data: { user: { id: "old-user", email } },
        error: null,
      }),
    },
  }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const track = vi.hoisted(() => vi.fn());
const identifyUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser, resetAnalytics: vi.fn() }));

// The dial animates with rAF; its look isn't under test here.
vi.mock("@/components/instrument/ReadinessDial", () => ({
  ReadinessDial: ({ score }: { score: number }) => <div data-testid="dial">{score}%</div>,
}));

// The lab players have their own tests; here a lab only has to report a grade.
vi.mock("@/components/workspace/PbqPlayer", () => ({
  PbqPlayer: ({
    scenario,
    onGraded,
    onBack,
    backLabel,
  }: {
    scenario: { title: string };
    onGraded?: (r: { score: number; totalItems: number; correctItems: number; feedback: string[] }) => void;
    onBack: () => void;
    backLabel?: string;
  }) => (
    <div>
      <h2>{scenario.title}</h2>
      <button onClick={() => onGraded?.({ score: 80, totalItems: 5, correctItems: 4, feedback: [] })}>Submit lab</button>
      <button onClick={onBack}>{backLabel}</button>
    </div>
  ),
}));

/** The API, answered per endpoint path. Tests swap handlers as needed. */
const server = vi.hoisted(() => ({
  progress: null as null | object,
  access: "free" as "free" | "pro",
  proPlan: false,
  /** What enrolling answers: false when a Pro member already has another exam. */
  enrolls: true,
  stopHandler: null as null | ((input: { index: number }) => unknown),
  rehearsalHandler: null as null | ((input: { size: string }) => unknown),
  labHandler: null as null | ((input: { id: string }) => unknown),
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
            proPlan: server.proPlan,
            certId: "11111111-1111-4111-8111-111111111111",
          };
        case "POST /api/path/progress":
          return { ok: true, stored: true };
        case "POST /api/path/stop": {
          const out = server.stopHandler?.(input as { index: number });
          if (out instanceof Error) throw out;
          // As the contract's parse would: nothing retired unless the reply says so.
          return { retired: [], ...(out as object) };
        }
        case "POST /api/path/rehearsal": {
          const out = server.rehearsalHandler?.(input as { size: string });
          if (out instanceof Error) throw out;
          return out;
        }
        case "POST /api/path/lab": {
          const out = server.labHandler?.(input as { id: string });
          if (out instanceof Error) throw out;
          return out;
        }
        case "POST /api/path/answers":
          return { ok: true };
        case "POST /api/path/enroll":
          // A Pro plan with this exam claimed opens the whole path.
          if (server.enrolls && server.proPlan) server.access = "pro";
          return { enrolled: server.enrolls };
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

/** Whether one element is ahead of another on the page. */
const comesBefore = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

const done = (ids: string[], extra?: Partial<PathProgress>): PathProgress => ({
  items: {},
  stops: Object.fromEntries(ids.map((id) => [id, { n: 1, c: 3, t: 3, at: 1 }])),
  checkpoint: null,
  rehearsals: [],
  labs: {},
  goal: null,
  ...extra,
});

beforeEach(() => {
  auth.session = null;
  server.progress = null;
  server.access = "free";
  server.proPlan = false;
  server.enrolls = true;
  server.stopHandler = (input) => stopReply(input.index);
  server.rehearsalHandler = null;
  server.labHandler = null;
  server.calls = [];
  track.mockClear();
  identifyUser.mockClear();
  localStorage.clear();
});

describe("a first visit", () => {
  it("starts on the warm-up's first rep with nothing to decide", async () => {
    renderPath();
    await act(async () => {});
    expect(screen.getByText("Prompt a|1.1|w1")).toBeInTheDocument();
    expect(screen.getByText("Warm-up")).toBeInTheDocument();
    // No map to go back to yet, so the exam name isn't a link.
    expect(screen.queryByRole("link", { name: "Security+" })).toBeNull();
  });

  it("ends the warm-up by naming the next stop, the save prompt ahead of the map", async () => {
    renderPath();
    await act(async () => {});
    await answer(true);
    await answer(false);
    await answer(true);
    expect(await screen.findByText(/Warm-up complete/i)).toBeInTheDocument();
    expect(screen.getByText(/1 to revisit/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next up: Objective 1.1" })).toBeInTheDocument();
    expect(screen.getByText(/About 4 minutes of quick questions\./)).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save and continue" });
    expect(comesBefore(save, screen.getByText("Your Security+ map"))).toBe(true);
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
    expect(screen.getByRole("heading", { name: "Next up: Objective 1.1" })).toBeInTheDocument();
    expect(screen.queryByText("Prompt a|1.1|w1")).toBeNull();
  });

  /** A visitor whose device has these stops done, no account yet. */
  function returning(...stops: string[]) {
    localStorage.setItem(
      "cb_path_security-plus-sy0-701",
      JSON.stringify({ v: 1, owner: null, progress: done(stops) })
    );
  }

  function fillIn(email = "sam@example.com") {
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-enough-password" } });
  }

  it("finds their map, the save card and a note after backing out of Google", async () => {
    returning("warmup");
    window.history.replaceState(null, "", "/path/security-plus-sy0-701?signin_cancelled=1");
    renderPath();
    expect(await screen.findByRole("status")).toHaveTextContent(/didn.t finish/);
    expect(screen.getByRole("heading", { name: "Next up: Objective 1.1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("plays the stop the card named once they've signed up", async () => {
    returning("warmup", "1.1");
    renderPath();
    expect(await screen.findByRole("heading", { name: "Next up: Objective 1.2" })).toBeInTheDocument();
    fillIn();
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    expect(await screen.findByText("Prompt a|1.2|s2-0")).toBeInTheDocument();
    expect(server.calls.find((c) => c.path === "/api/path/stop")?.input).toMatchObject({ index: 2 });
  });

  it("goes to the map, not backwards, when they log in to an account that's further along", async () => {
    returning("warmup");
    server.progress = done(["warmup", "1.1", "1.2"]);
    renderPath();
    await screen.findByRole("heading", { name: "Next up: Objective 1.1" });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    fillIn();
    fireEvent.click(screen.getByRole("button", { name: "Log in and keep going" }));
    expect(await screen.findByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByText("Your Security+ path")).toBeInTheDocument();
    expect(screen.getByText("Objective 1.3")).toBeInTheDocument();
    expect(server.calls.filter((c) => c.path === "/api/path/stop")).toHaveLength(0);
  });
});

describe("a signed-in learner", () => {
  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
  });

  /** How many times the page asked for this account's progress and access. */
  const accessReads = () =>
    server.calls.filter((c) => c.path === "/api/path/progress" && !("progress" in (c.input as object))).length;

  it("claims this exam for a Pro member who bought before picking one, and opens it", async () => {
    server.proPlan = true;
    server.progress = done(["warmup"]);
    renderPath();
    await waitFor(() => expect(server.access).toBe("pro"));
    const claims = server.calls.filter((c) => c.path === "/api/path/enroll");
    expect(claims).toHaveLength(1);
    expect(claims[0].input).toEqual({ cert: "security-plus-sy0-701", examDate: null });
    // Then it reads access again, so the whole path opens without a reload.
    await waitFor(() => expect(accessReads()).toBe(2));
  });

  it("leaves a Pro member's other exam alone", async () => {
    server.proPlan = true;
    server.enrolls = false;
    server.progress = done(["warmup"]);
    renderPath();
    await waitFor(() => expect(server.calls.some((c) => c.path === "/api/path/enroll")).toBe(true));
    await act(async () => {});
    expect(server.access).toBe("free");
    expect(accessReads()).toBe(1);
  });

  it("opens Pro with what it opened, once on a device", async () => {
    server.access = "pro";
    server.proPlan = true;
    server.progress = done(["warmup"]);
    const { unmount } = renderPath();
    expect(await screen.findByRole("heading", { name: "Your whole path is open." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/ })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_unlock_viewed", { cert: "security-plus-sy0-701" });
    unmount();

    renderPath();
    expect(await screen.findByRole("heading", { name: "Your Security+ path" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your whole path is open." })).toBeNull();
  });

  it("doesn't open with the unlock moment for a free account", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.queryByRole("heading", { name: "Your whole path is open." })).toBeNull();
  });

  it("keeps a Pro member on the path: the header leads nowhere else", async () => {
    server.access = "pro";
    server.progress = done(["warmup"]);
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    renderPath();
    await screen.findByRole("heading", { name: "Your Security+ path" });
    const header = screen.getByRole("banner");
    expect([...header.querySelectorAll("a")].map((a) => a.getAttribute("href"))).not.toContain("/dashboard");
    // What the path doesn't hold yet is still one quiet link away.
    expect(screen.getByRole("link", { name: "study tools" })).toHaveAttribute("href", "/dashboard");
  });

  it("claims nothing for a free account", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(server.calls.some((c) => c.path === "/api/path/enroll")).toBe(false);
  });

  it("ties them to their account, however they arrived", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(identifyUser).toHaveBeenCalledWith("u1", { email: "u1@example.com" });
  });

  it("continues to the next stop with one tap", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
    const call = server.calls.find((c) => c.path === "/api/path/stop");
    expect(call?.input).toMatchObject({ cert: "security-plus-sy0-701", index: 1 });
  });

  it("ends a stop with the way on ahead of the map", async () => {
    server.progress = done(["warmup"]);
    server.stopHandler = (input) => stopReply(input.index, 1);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    await answer(true);
    await screen.findByText(/Stop 2 complete/i);
    const onward = screen.getByRole("button", { name: /Continue/ });
    expect(comesBefore(onward, screen.getByText("Your Security+ map"))).toBe(true);
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
    // Displayed order is shuffled: shown option 1 is the bank's option 3.
    server.stopHandler = () => ({
      stop: plan.stops[1],
      reps: [{ ...rep("q|1.1|22222222-2222-4222-8222-222222222222", "1.1", "exam"), order: [2, 3, 0, 1] }],
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText(/Prompt q\|1\.1/);
    await answer(false);
    await screen.findByText(/Stop 2 complete/i);
    const recorded = server.calls.find((c) => c.path === "/api/path/answers");
    expect(recorded?.input).toEqual({
      cert: "security-plus-sy0-701",
      answers: [{ questionId: "22222222-2222-4222-8222-222222222222", selectedIndex: 3 }],
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
    // The guarantee states its conditions right on the offer.
    expect(screen.getByText(/Study with Pro for 30\+ days and don't pass\? We refund your last payment\./)).toBeInTheDocument();
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

  it("goes back to the map from the exam name in the header", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    fireEvent.click(screen.getByRole("link", { name: "Security+" }));
    expect(await screen.findByText("Your Security+ path")).toBeInTheDocument();
    expect(screen.queryByText("Prompt a|1.1|s1-0")).toBeNull();
    // Switching exams is still a click away, under the map.
    expect(screen.getByRole("link", { name: "Studying for a different exam?" })).toHaveAttribute("href", "/start?pick=1");
  });

  it("clears a miss the server says can never come back", async () => {
    const gone = "r|1.1|net-cables|0a1b2c3d";
    server.progress = done(["warmup"], { items: recordRep(EMPTY_PATH_PROGRESS, gone, false, 1).items });
    server.stopHandler = (input) => ({ ...stopReply(input.index), retired: [gone] });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    const saves = server.calls.filter((c) => c.path === "/api/path/progress" && (c.input as { progress?: unknown }).progress);
    const saved = (saves.at(-1)?.input as { progress: PathProgress }).progress;
    expect(itemStatus(saved.items[gone])).toBe("got");
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

describe("labs on the path", () => {
  const labStructure: PathStructure = {
    ...structure,
    domains: structure.domains.map((d) => ({
      ...d,
      lab: { id: `lab-${d.number}`, title: `Lab for domain ${d.number}`, minutes: 6 },
    })),
  };
  // warm-up, 1.1–1.3, d1, 2.1, checkpoint, lab1, 2.2, 2.3, d2, lab2
  const labPlan = buildPlan(labStructure);
  const lab1 = labPlan.stops.findIndex((s) => s.id === "lab1");
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };

  const renderLabs = () =>
    render(
      <PathApp cert="security-plus-sy0-701" structure={labStructure} plan={labPlan} warmup={warmup} questionCount={842} />
    );

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.stopHandler = (input) => {
      const stop = labPlan.stops[input.index];
      if (stop?.kind === "lab") {
        return {
          stop,
          reps: [],
          lab: { type: "ordering", id: `lab-${stop.domain}`, title: stop.title, domain_number: stop.domain },
        };
      }
      const objective = stop?.objectives[0] ?? "1.1";
      return { stop, reps: [rep(`a|${objective}|x${input.index}`, objective)] };
    };
  });

  it("shows each domain's lab on the map, as part of Pro for a free account", async () => {
    server.progress = done(["warmup"]);
    renderLabs();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.getAllByLabelText(/hands-on lab, Lab for domain .*: part of Pro/)).toHaveLength(2);
    expect(screen.getByText("Hands-on lab, with Pro")).toBeInTheDocument();
  });

  it("plays a lab in place and counts it once it's graded", async () => {
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(labPlan.stops.slice(0, lab1).map((s) => s.id), { goal });
    renderLabs();
    expect(await screen.findByText(/Next · hands-on lab · about 6 min/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await screen.findByRole("heading", { name: "Lab for domain 1.0" })).toBeInTheDocument();
    expect(screen.getByText(/Hands-on lab · Domain 1/)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_lab_started", {
      cert: "security-plus-sy0-701",
      stop: "lab1",
      scenario: "lab-1.0",
      from: "path",
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit lab" }));
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "lab1", kind: "lab", correct: 4, total: 5 })
    );
    // It's done, so the way on is the stop after it.
    expect(await screen.findByText("Objective 2.2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await waitFor(() =>
      expect(server.calls.filter((c) => c.path === "/api/path/stop").at(-1)?.input).toMatchObject({ index: lab1 + 1 })
    );
  });

  it("goes back to the map from a lab without counting it", async () => {
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(labPlan.stops.slice(0, lab1).map((s) => s.id), { goal });
    renderLabs();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Back to my map" }));
    expect(await screen.findByRole("heading", { name: "Your Security+ path" })).toBeInTheDocument();
    expect(screen.getByText(/Next · hands-on lab/)).toBeInTheDocument();
  });

  it("offers the first lab from the unlock moment", async () => {
    server.access = "pro";
    server.progress = done(["warmup"], { goal });
    renderLabs();
    await screen.findByRole("heading", { name: "Your whole path is open." });
    // Both domain labs are still ahead.
    expect(screen.getByText("hands-on labs").nextSibling).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: /Or try a lab now.*Lab for domain 1.0/ }));
    expect(await screen.findByRole("heading", { name: "Lab for domain 1.0" })).toBeInTheDocument();
  });
});

describe("exam rehearsals", () => {
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };
  const checkpoint = { score: 58, at: 1, domains: [] };
  const uuid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  // Shown shuffled: the first option on screen is the bank's second.
  const bankRep = (n: number, objective: string): ChoiceRep => ({
    ...rep(`q|${objective}|${uuid(n)}`, objective, "exam"),
    lettered: true,
    order: [1, 0, 2, 3],
  });
  const drawn = [bankRep(1, "1.1"), bankRep(2, "2.1"), bankRep(3, "1.2")];
  const runKey = "cb_path_rehearsal_security-plus-sy0-701";
  const lastSave = () =>
    (
      server.calls.filter((c) => c.path === "/api/path/progress" && (c.input as { progress?: unknown }).progress).at(-1)
        ?.input as { progress: PathProgress }
    ).progress;
  const storedRun = (extra: object) =>
    JSON.stringify({
      v: 1,
      owner: "u1",
      size: "full",
      asStop: false,
      reps: drawn,
      picks: [null, null, null],
      flagged: [],
      i: 0,
      spentMs: 0,
      limitMs: 90 * 60_000,
      startedAt: 5,
      done: null,
      ...extra,
    });

  /** Answer the three drawn questions (right, right, wrong) and score them. */
  async function sitIt() {
    expect(await screen.findByRole("heading", { name: `Prompt q|1.1|${uuid(1)}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Right answer/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Right answer/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Wrong one/ }));
    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));
    expect(screen.getByRole("heading", { name: "Every question answered" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /See my score/ }));
  }

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.rehearsalHandler = () => ({ reps: drawn, minutes: 90 });
  });

  it("lets a Pro member sit the whole exam from their map, and scores it on the dial", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    renderPath();
    expect(await screen.findByRole("button", { name: "Start: Exam rehearsal" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start: Exam rehearsal" }));

    expect(await screen.findByRole("heading", { name: "Sit the whole exam, start to finish." })).toBeInTheDocument();
    expect(screen.getByText(/set against your checkpoint's 58%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Start the full rehearsal/ }));
    await sitIt();

    expect(server.calls.find((c) => c.path === "/api/path/rehearsal")?.input).toMatchObject({
      cert: "security-plus-sy0-701",
      size: "full",
    });
    expect(track).toHaveBeenCalledWith("path_rehearsal_started", {
      cert: "security-plus-sy0-701",
      size: "full",
      from: "home",
    });

    // Domain 1 half right, domain 2 all right, weighted evenly: 75.
    expect(await screen.findByText("Exam rehearsal · Security+")).toBeInTheDocument();
    expect(screen.getByTestId("dial")).toHaveTextContent("75%");
    expect(screen.getByRole("heading", { name: "Up 17, and exam-ready on this run." })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Missed (1)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(`Prompt q|1.2|${uuid(3)}`)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "path_rehearsal_completed",
      expect.objectContaining({ score: 75, answered: 3, total: 3, timed_out: false })
    );

    // The answers count on the account, against the bank's own option order.
    expect(server.calls.find((c) => c.path === "/api/path/answers")?.input).toEqual({
      cert: "security-plus-sy0-701",
      answers: [
        { questionId: uuid(1), selectedIndex: 1 },
        { questionId: uuid(2), selectedIndex: 1 },
        { questionId: uuid(3), selectedIndex: 0 },
      ],
    });
    const saved = lastSave();
    expect(saved.rehearsals.map((r) => r.score)).toEqual([75]);
    expect(itemStatus(saved.items[`q|1.2|${uuid(3)}`])).toBe("missed");
    // Taken early, it doesn't stand in for the path's last stop.
    expect(saved.stops.rehearsal).toBeUndefined();

    // Home again, the latest reading is the rehearsal's, and its answers are a tap away.
    fireEvent.click(screen.getByRole("link", { name: "Security+" }));
    expect(await screen.findByText(/last rehearsal 75%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "see its answers" }));
    expect(await screen.findByRole("tab", { name: "Missed (1)" })).toBeInTheDocument();
  });

  it("shows a free account the rehearsal at the end of the map, as part of Pro", async () => {
    server.access = "free";
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.getByLabelText("Exam rehearsal: part of Pro")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start: Exam rehearsal" })).toBeNull();
  });

  it("brings back a rehearsal left mid-way, where it was and with its clock", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    localStorage.setItem(runKey, storedRun({ picks: [0, null, null], i: 1, spentMs: 10 * 60_000 }));
    renderPath();
    expect(await screen.findByText("Exam rehearsal · in progress")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument();
    expect(screen.getByText("1:20:00 left")).toBeInTheDocument();
    // It waits ahead of the next stop: its clock is waiting.
    expect(comesBefore(screen.getByRole("button", { name: /Resume/ }), screen.getByRole("button", { name: /Continue/ }))).toBe(
      true
    );
    fireEvent.click(screen.getByRole("button", { name: /Resume/ }));
    expect(await screen.findByRole("heading", { name: `Prompt q|2.1|${uuid(2)}` })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument();
  });

  it("never shows one account's rehearsal to another on the same device", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    localStorage.setItem(runKey, storedRun({ owner: "someone-else", picks: [0, null, null] }));
    renderPath();
    expect(await screen.findByRole("button", { name: "Start: Exam rehearsal" })).toBeInTheDocument();
    expect(screen.queryByText("Exam rehearsal · in progress")).toBeNull();
  });

  it("throws a rehearsal away only once that's confirmed", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    localStorage.setItem(runKey, storedRun({ size: "half", limitMs: 45 * 60_000 }));
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Discard this rehearsal" }));
    expect(localStorage.getItem(runKey)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Discard it" }));
    expect(await screen.findByRole("button", { name: "Start: Exam rehearsal" })).toBeInTheDocument();
    expect(localStorage.getItem(runKey)).toBeNull();
  });

  it("ends the path on the rehearsal, and counts it as the last stop", async () => {
    const last = plan.stops.at(-1)!;
    server.progress = done(plan.stops.slice(0, -1).map((s) => s.id), { goal, checkpoint });
    renderPath();
    expect(await screen.findByText("Last stop · the whole exam, timed")).toBeInTheDocument();
    // The Continue card already leads there: no second card for it.
    expect(screen.queryByRole("button", { name: "Start: Exam rehearsal" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByText(`Stop ${last.index + 1} · Exam rehearsal`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Half: 45 questions/ }));
    await sitIt();

    expect(server.calls.find((c) => c.path === "/api/path/rehearsal")?.input).toMatchObject({ size: "half" });
    expect(track).toHaveBeenCalledWith("path_rehearsal_started", expect.objectContaining({ from: "stop" }));
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "rehearsal", kind: "rehearsal", correct: 2, total: 3 })
    );
    expect(lastSave().stops.rehearsal).toMatchObject({ n: 1, c: 2, t: 3 });
    // The path goes on to review rounds.
    expect(await screen.findByText("Path complete · review round")).toBeInTheDocument();
  });

  it("offers Pro when the server says rehearsals are part of it", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    server.rehearsalHandler = () => new ApiError("quota_exceeded", "Exam rehearsals are part of Pro.");
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Start: Exam rehearsal" }));
    server.access = "free";
    fireEvent.click(await screen.findByRole("button", { name: /Start the full rehearsal/ }));
    expect(await screen.findByText("Unlock the rest of your path")).toBeInTheDocument();
  });

  it("goes over a rehearsal's misses from its result, those first", async () => {
    server.progress = done(["warmup"], { goal, checkpoint, items: recordRep(EMPTY_PATH_PROGRESS, "a|2.2|old", false, 1).items });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Start: Exam rehearsal" }));
    fireEvent.click(await screen.findByRole("button", { name: /Start the full rehearsal/ }));
    await sitIt();
    fireEvent.click(await screen.findByRole("button", { name: /Review 1/ }));
    await waitFor(() =>
      expect(server.calls.filter((c) => c.path === "/api/path/stop").at(-1)?.input).toMatchObject({
        index: plan.stops.length,
        focus: "misses",
        missed: [`q|1.2|${uuid(3)}`, "a|2.2|old"],
      })
    );
    expect(track).toHaveBeenCalledWith("path_review_started", expect.objectContaining({ from: "rehearsal" }));
    expect(await screen.findByText("Review · your misses")).toBeInTheDocument();
  });
});

describe("reviewing misses", () => {
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };
  const objectiveOf = (id: string) => id.split("|")[1];
  const misses = ["a|1.1|m1", "a|2.1|m2", "a|1.2|m3"];
  const withMisses = () =>
    done(["warmup"], { goal, items: misses.reduce((p, id) => recordRep(p, id, false, 5), EMPTY_PATH_PROGRESS).items });

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.stopHandler = (input) => {
      const { index, missed, focus } = input as { index: number; missed: string[]; focus?: string };
      if (focus !== "misses") return stopReply(index);
      return {
        stop: { ...plan.stops[0], id: "review", kind: "review", title: "Keep practicing", index },
        reps: missed.map((id) => rep(id, objectiveOf(id))),
      };
    };
  });

  it("goes over them from a Pro home, and says when the right ones come back", async () => {
    server.progress = withMisses();
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Review: Your misses" }));
    await waitFor(() =>
      expect(server.calls.find((c) => c.path === "/api/path/stop")?.input).toMatchObject({
        index: plan.stops.length,
        focus: "misses",
        missed: misses,
      })
    );
    expect(track).toHaveBeenCalledWith("path_review_started", { cert: "security-plus-sy0-701", from: "home", reps: 3 });
    expect(await screen.findByText("Review · your misses")).toBeInTheDocument();

    await answer(true);
    await answer(true);
    await answer(false);
    expect(await screen.findByText("Review complete")).toBeInTheDocument();
    expect(screen.getByText(/^1 more to review\. The ones you got right come back once more in a few days/)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "review", kind: "review", focus: "misses", correct: 2, total: 3 })
    );
    // Got right, the objective is covered again on the map.
    expect(screen.getByLabelText(/^1\.1 Objective 1\.1: covered/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Review 1 more/ }));
    await waitFor(() =>
      expect(server.calls.filter((c) => c.path === "/api/path/stop").at(-1)?.input).toMatchObject({ missed: ["a|1.2|m3"] })
    );
  });

  it("shows how many there are on the home", async () => {
    server.progress = withMisses();
    renderPath();
    expect(await screen.findByText("3 misses to go over, 3 at a time")).toBeInTheDocument();
  });

  it("has nothing to offer with nothing missed", async () => {
    server.progress = done(["warmup"], { goal });
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.queryByRole("button", { name: "Review: Your misses" })).toBeNull();
  });

  it("leaves a free account's misses to its next stops", async () => {
    server.access = "free";
    server.progress = withMisses();
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.queryByRole("button", { name: "Review: Your misses" })).toBeNull();
  });
});

describe("the lab library", () => {
  const libStructure: PathStructure = {
    ...structure,
    domains: structure.domains.map((d) => ({
      ...d,
      lab: { id: `lab-${d.number}`, title: `Lab for domain ${d.number}`, minutes: 6 },
    })),
    library: [
      { id: "lab-1.0", title: "Lab for domain 1.0", minutes: 6, type: "simulation", domain: "1.0" },
      { id: "drill-1", title: "Port matching", minutes: 3, type: "matching", domain: "1.0" },
      { id: "lab-2.0", title: "Lab for domain 2.0", minutes: 6, type: "topology", domain: "2.0" },
      { id: "drill-2", title: "Attack ordering", minutes: 3, type: "ordering", domain: "2.0" },
    ],
  };
  const libPlan = buildPlan(libStructure);
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };
  const lastSave = () =>
    (
      server.calls.filter((c) => c.path === "/api/path/progress" && (c.input as { progress?: unknown }).progress).at(-1)
        ?.input as { progress: PathProgress }
    ).progress;
  const renderLibrary = () =>
    render(
      <PathApp cert="security-plus-sy0-701" structure={libStructure} plan={libPlan} warmup={warmup} questionCount={842} />
    );
  /** From the home, into the library. */
  async function openLibrary() {
    fireEvent.click(await screen.findByRole("button", { name: "Open: Hands-on labs" }));
    expect(await screen.findByRole("heading", { name: "Every lab for Security+" })).toBeInTheDocument();
  }

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.labHandler = (input) => {
      const lab = libStructure.library!.find((l) => l.id === input.id)!;
      return { lab: { type: "ordering", id: lab.id, title: lab.title, domain_number: lab.domain } };
    };
  });

  it("opens every lab the exam has from a Pro home, domain by domain", async () => {
    server.progress = done(["warmup"], { goal });
    renderLibrary();
    expect(await screen.findByRole("button", { name: "Open: Hands-on labs" })).toBeInTheDocument();
    await openLibrary();
    expect(track).toHaveBeenCalledWith("path_labs_viewed", { cert: "security-plus-sy0-701" });
    expect(screen.getByRole("heading", { name: "Domain 1: Domain 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Domain 2: Domain 2" })).toBeInTheDocument();
    expect(screen.getAllByText(/· closes the domain$/)).toHaveLength(2);
    expect(screen.getByText("Matching drill · 3 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to my map" }));
    expect(await screen.findByRole("heading", { name: "Your Security+ path" })).toBeInTheDocument();
  });

  it("plays any lab in the path's stage, keeps its score, and offers the next one", async () => {
    server.progress = done(["warmup"], { goal });
    renderLibrary();
    await openLibrary();
    fireEvent.click(screen.getByRole("button", { name: /Port matching/ }));
    expect(await screen.findByRole("heading", { name: "Port matching" })).toBeInTheDocument();
    expect(server.calls.find((c) => c.path === "/api/path/lab")?.input).toEqual({
      cert: "security-plus-sy0-701",
      id: "drill-1",
    });
    expect(track).toHaveBeenCalledWith("path_lab_started", {
      cert: "security-plus-sy0-701",
      stop: "library",
      scenario: "drill-1",
      from: "library",
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit lab" }));
    expect(track).toHaveBeenCalledWith("path_lab_completed", {
      cert: "security-plus-sy0-701",
      scenario: "drill-1",
      from: "library",
      correct: 4,
      total: 5,
    });
    await waitFor(() => expect(lastSave().labs["drill-1"]).toMatchObject({ n: 1, c: 4, t: 5 }));
    // A lab that closes no domain finishes no stop.
    expect(Object.keys(lastSave().stops)).toEqual(["warmup"]);

    // Next is the next one not played yet.
    expect(await screen.findByText("Next lab · Topology · 6 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to the labs" }));
    expect(await screen.findByText("4/5")).toBeInTheDocument();
  });

  it("counts a domain's lab played from the library as its stop on the path", async () => {
    server.progress = done(["warmup"], { goal });
    renderLibrary();
    await openLibrary();
    fireEvent.click(screen.getByRole("button", { name: /Lab for domain 1\.0/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Submit lab" }));
    await waitFor(() => expect(lastSave().stops.lab1).toMatchObject({ n: 1, c: 4, t: 5 }));
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "lab1", kind: "lab", correct: 4, total: 5 })
    );
  });

  it("shows a domain's lab played on the path as done in the library", async () => {
    server.progress = done(["warmup", "lab1"], { goal });
    renderLibrary();
    expect(await screen.findByText("4 labs · 1 done")).toBeInTheDocument();
    await openLibrary();
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("goes home when the server says the labs are part of Pro", async () => {
    server.progress = done(["warmup"], { goal });
    server.labHandler = () => new ApiError("quota_exceeded", "Hands-on labs are part of Pro.");
    renderLibrary();
    await openLibrary();
    server.access = "free";
    fireEvent.click(screen.getByRole("button", { name: /Port matching/ }));
    expect(await screen.findByRole("heading", { name: "Your Security+ path" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open: Hands-on labs" })).toBeNull();
  });

  it("keeps the library for Pro, and names every lab in a free account's offer", async () => {
    server.access = "free";
    server.progress = done(
      libPlan.stops.slice(0, libPlan.freeThrough + 1).map((s) => s.id),
      { goal, checkpoint: { score: 60, at: 1, domains: [] } }
    );
    renderLibrary();
    expect(await screen.findByText("All 4 hands-on PBQ labs, one closing every domain")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open: Hands-on labs" })).toBeNull();
  });
});
