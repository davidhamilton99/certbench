// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { itemStatus } from "@/core/drill-rounds/drill-rounds";
import { buildPlan } from "@/core/path/plan";
import { isoInDays } from "@/core/path/checkpoint";
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

// The path reads the session cookie before it loads the sign-in client: in
// these tests the cookie is there exactly when someone is signed in.
vi.mock("@/lib/supabase-lazy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase-lazy")>()),
  hasSessionCookie: () => auth.session !== null,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const track = vi.hoisted(() => vi.fn());
const identifyUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser, resetAnalytics: vi.fn() }));

// The dial animates with rAF; its look isn't under test here.
vi.mock("@/components/instrument/ReadinessDial", () => ({
  ReadinessDial: ({ score, band, readyMark = true }: { score: number; band: { label: string }; readyMark?: boolean }) => (
    <div data-testid="dial" data-label={band.label} data-ready-mark={String(readyMark)}>
      {score}%
    </div>
  ),
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
  /** What saving answers with, when it fails. */
  saveError: null as null | Error,
  /** What reading the account answers with, when the account cannot be reached. */
  readError: null as null | Error,
  calls: [] as { path: string; input: unknown }[],
}));
vi.mock("@/lib/api-client", async () => {
  const { ApiError } = await import("@/contracts/common");
  return {
    api: async (contract: { path: string; method: string }, input: Record<string, unknown>) => {
      server.calls.push({ path: contract.path, input });
      switch (`${contract.method} ${contract.path}`) {
        case "GET /api/path/progress":
          if (server.readError) throw server.readError;
          return {
            progress: server.progress ?? { items: {}, stops: {}, checkpoint: null, goal: null },
            stored: true,
            access: server.access,
            proPlan: server.proPlan,
            certId: "11111111-1111-4111-8111-111111111111",
          };
        case "POST /api/path/progress":
          if (server.saveError) throw server.saveError;
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
            prices: {
              monthly: { original: "$19", discounted: "$19" },
              quarterly: { original: "$39", discounted: "$39" },
              annual: { original: "$149", discounted: "$149" },
            },
          };
        default:
          throw new ApiError("not_found", `unmocked ${contract.path}`);
      }
    },
  };
});

import { PathApp } from "../PathApp";
import { ApiError } from "@/contracts/common";
import { pathRehearsalKey } from "../storage-key";

// Node's own experimental `localStorage` global shadows jsdom's — use a plain
// in-memory Storage so the path's persistence is exercised for real.
const store = new Map<string, string>();
/** When true, the browser refuses every write, as it does with site data blocked. */
const storage = { refuses: false };
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (storage.refuses) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      store.set(k, String(v));
    },
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

/**
 * Answer the rep on screen (right or wrong) and move on. An answer is a plain
 * button, and every answer waits for Continue.
 */
async function answer(right = true) {
  fireEvent.click(screen.getByRole("button", { name: right ? /Right answer/ : /Wrong one/ }));
  fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
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
  server.saveError = null;
  server.readError = null;
  server.calls = [];
  track.mockClear();
  identifyUser.mockClear();
  storage.refuses = false;
  localStorage.clear();
  window.history.replaceState(null, "", "/path/security-plus-sy0-701");
  // What the page, or its inline script, leaves on <html> for the held stage.
  for (const name of ["returning", "wait", "late", "live"]) document.documentElement.removeAttribute(`data-path-${name}`);
});

describe("a first visit", () => {
  it("starts on the warm-up's first rep with nothing to decide", async () => {
    renderPath();
    await act(async () => {});
    expect(screen.getByText("Prompt a|1.1|w1")).toBeInTheDocument();
    expect(screen.getByText("Introductory questions")).toBeInTheDocument();
    // No map to go back to yet, so the exam name isn't a link.
    expect(screen.queryByRole("link", { name: "Security+" })).toBeNull();
  });

  it("ends the warm-up by naming the next step, the save prompt ahead of the map", async () => {
    renderPath();
    await act(async () => {});
    await answer(true);
    await answer(false);
    await answer(true);
    expect(await screen.findByText(/You have completed the introductory questions/i)).toBeInTheDocument();
    expect(screen.getByText(/1 question will be repeated/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your next step: Objective 1.1" })).toBeInTheDocument();
    expect(screen.getByText(/It takes about 4 minutes\./)).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save and continue" });
    expect(comesBefore(save, screen.getByText("Security+ objectives"))).toBe(true);
    // Signing up here plays the next stop in place, and the form says so.
    expect(screen.getByText(/You will stay on this page\./)).toBeInTheDocument();
    // Counted apart from the same ask on a public page.
    expect(track).toHaveBeenCalledWith("path_save_viewed", { cert: "security-plus-sy0-701", surface: "path" });
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
    fireEvent.click(screen.getByRole("button", { name: /Wrong one/ }));
    expect(await screen.findByText(/The correct answer is Right answer\./)).toBeInTheDocument();
    expect(screen.getByText("Takeaway a|1.1|w1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Continue/ })).toBeInTheDocument();
  });

  it("answers from the keyboard", async () => {
    renderPath();
    await act(async () => {});
    // The keys act while the focus is inside the question's card.
    fireEvent.keyDown(screen.getByText("Prompt a|1.1|w1"), { key: "1" });
    expect(await screen.findByText(/^Correct\./)).toBeInTheDocument();
  });
});

describe("a returning visitor", () => {
  it("lands on their map, not the warm-up", async () => {
    localStorage.setItem(
      "cb_path_security-plus-sy0-701",
      JSON.stringify({ v: 1, owner: null, progress: done(["warmup"]) })
    );
    renderPath();
    expect(await screen.findByText("Your Security+ study path")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your next step: Objective 1.1" })).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "long-enough-password" } });
  }

  it("finds their map, the save card and a note after backing out of Google", async () => {
    returning("warmup");
    window.history.replaceState(null, "", "/path/security-plus-sy0-701?signin_cancelled=1");
    renderPath();
    // (The page has other status lines: the note is found by what it says.)
    expect(await screen.findByText(/was not completed/)).toHaveAttribute("role", "status");
    expect(screen.getByRole("heading", { name: "Your next step: Objective 1.1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("plays the step the card named once they have signed up", async () => {
    returning("warmup");
    renderPath();
    expect(await screen.findByRole("heading", { name: "Your next step: Objective 1.1" })).toBeInTheDocument();
    fillIn();
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
    expect(server.calls.find((c) => c.path === "/api/path/stop")?.input).toMatchObject({ index: 1 });
  });

  it("names the readiness checkpoint when it is the step an account opens next", async () => {
    returning("warmup", "1.1");
    renderPath();
    expect(await screen.findByRole("heading", { name: "Your next step: the readiness checkpoint" })).toBeInTheDocument();
    expect(screen.getByText(/It has 12 exam-style questions and gives you a score for each domain\./)).toBeInTheDocument();
  });

  it("goes to the map, not backwards, when they log in to an account that is further along", async () => {
    returning("warmup");
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    await screen.findByRole("heading", { name: "Your next step: Objective 1.1" });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fillIn();
    fireEvent.click(screen.getByRole("button", { name: "Sign in and continue" }));
    expect(await screen.findByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByText("Your Security+ study path")).toBeInTheDocument();
    expect(screen.getAllByText("Readiness checkpoint").length).toBeGreaterThan(0);
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
    expect(await screen.findByRole("heading", { name: "Your full Security+ study path is now open." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/ })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_unlock_viewed", { cert: "security-plus-sy0-701" });
    unmount();

    renderPath();
    expect(await screen.findByRole("heading", { name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your full Security+ study path is now open." })).toBeNull();
  });

  it("does not open with the unlock moment for a free account", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.queryByRole("heading", { name: "Your full Security+ study path is now open." })).toBeNull();
  });

  it("keeps a Pro member on the path: the header leads nowhere else", async () => {
    server.access = "pro";
    server.progress = done(["warmup"]);
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    renderPath();
    await screen.findByRole("heading", { name: "Your Security+ study path" });
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

  it("continues to the next step with one tap", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
    const call = server.calls.find((c) => c.path === "/api/path/stop");
    expect(call?.input).toMatchObject({ cert: "security-plus-sy0-701", index: 1 });
  });

  it("ends a step with the way on ahead of the map", async () => {
    server.progress = done(["warmup"]);
    server.stopHandler = (input) => stopReply(input.index, 1);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    await answer(true);
    await screen.findByText(/You have completed step 2/i);
    const onward = screen.getByRole("button", { name: /Continue/ });
    expect(comesBefore(onward, screen.getByText("Security+ objectives"))).toBe(true);
  });

  it("asks the exam date and daily time right before the checkpoint, then opens it", async () => {
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Have you booked your Security+ exam?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No, I have not booked it yet" }));
    fireEvent.click(screen.getByRole("button", { name: "In one to two months" }));
    expect(await screen.findByText("How much time can you study on most days?")).toBeInTheDocument();
    expect(server.calls.some((c) => c.path === "/api/path/enroll")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "About 20 minutes" }));
    expect(await screen.findByRole("button", { name: /Start the checkpoint/ })).toBeInTheDocument();
  });

  it("asks one goal question at a time between stops, then plays the step", async () => {
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup", "1.1", "checkpoint"], {
      goal: { examDate: null, target: null, minutes: null, at: 1 },
      checkpoint: { score: 60, at: 1, domains: [] },
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("How much time can you study on most days?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "About 20 minutes" }));
    expect(await screen.findByText("Prompt a|1.2|s3-0")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_goal_set", { cert: "security-plus-sy0-701", step: "minutes", value: "20" });
  });

  it("records bank answers against the account at the end of a step", async () => {
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
    await screen.findByText(/You have completed step 2/i);
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
    expect(screen.getByRole("heading", { name: "You are making good progress." })).toBeInTheDocument();
    expect(screen.getByText("Continue your study path with Pro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Pro/ })).toBeInTheDocument();
    // The guarantee states its conditions right on the offer.
    expect(screen.getByText(/If you study with Pro for 30 days or more and do not pass your exam, CertBench refunds your last payment\./)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_checkpoint_completed", { cert: "security-plus-sy0-701", score: 50 });
    expect(track).toHaveBeenCalledWith("path_offer_viewed", { cert: "security-plus-sy0-701", context: "reveal" });
  });

  it("calls a high checkpoint a strong first read, never exam-ready, and shows what is still unstudied", async () => {
    // The warm-up and 1.1 are done: one of the six objectives.
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
    await answer(true);

    const dial = await screen.findByTestId("dial");
    expect(dial).toHaveTextContent("100%");
    // A dozen questions can't call anyone exam-ready: not the label, the mark or the copy.
    expect(dial).toHaveAttribute("data-label", "Strong first result");
    expect(dial).toHaveAttribute("data-ready-mark", "false");
    expect(screen.getByRole("heading", { name: "This is a strong first result." })).toBeInTheDocument();
    // The size of the sample, as a label rather than a paragraph.
    expect(screen.getByText("This result is based on 2 questions, so each answer changes it by about 50 points. The exam itself has up to 90 questions.")).toBeInTheDocument();
    expect(screen.queryByText(/exam[- ]ready/i)).toBeNull();
    expect(screen.queryByText(/in good shape/i)).toBeNull();
    // How much of the exam the path has taught so far, above the offer.
    const studied = screen.getByText("You have studied 1 of 6 objectives.");
    expect(screen.getByText("There are 5 objectives still to study.")).toBeInTheDocument();
    expect(comesBefore(studied, screen.getByText("Continue your study path with Pro"))).toBe(true);
  });

  it("offers the rest of the path when the server says it is Pro-only", async () => {
    const free = plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id);
    server.progress = done(free, {
      checkpoint: { score: 64, at: 1, domains: [{ number: "1.0", correct: 2, total: 3 }] },
    });
    renderPath();
    expect(await screen.findByText("Continue your study path with Pro")).toBeInTheDocument();
    // The offer's own button is the only way on: no plain "Continue" to a step that is not open.
    expect(screen.queryByRole("button", { name: /^Continue$/ })).toBeNull();
  });

  it("shows the reveal with the offer when a step comes back 402", async () => {
    server.progress = done(["warmup"], {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 40, at: 1, domains: [] },
    });
    server.stopHandler = () => new ApiError("quota_exceeded", "The rest of the study path is included with Pro.");
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Continue your study path with Pro")).toBeInTheDocument();
  });

  it("goes back to the map from the exam name in the header", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    fireEvent.click(screen.getByRole("link", { name: "Security+ SY0-701" }));
    expect(await screen.findByText("Your Security+ study path")).toBeInTheDocument();
    expect(screen.queryByText("Prompt a|1.1|s1-0")).toBeNull();
    // Switching exams is still a click away, under the map.
    expect(screen.getByRole("link", { name: "choose another exam" })).toHaveAttribute("href", "/start?pick=1");
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
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
  });

  it("does not offer to sign in before it knows who is there", async () => {
    auth.session = null;
    renderPath();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=/path/security-plus-sy0-701"
    );
  });
});

describe("back from paying", () => {
  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    // Stripe's success link.
    window.history.replaceState(null, "", "/path/security-plus-sy0-701?upgraded=1");
  });

  const landed = () =>
    track.mock.calls.filter(([name]) => name === "path_upgrade_landed").map(([, props]) => props as { waited_ms: number });

  it("opens straight onto the unlock moment when Pro is already on", async () => {
    server.access = "pro";
    renderPath();
    expect(await screen.findByRole("heading", { name: "Your full Security+ study path is now open." })).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(landed()).toEqual([{ cert: "security-plus-sy0-701", waited_ms: 0 }]);
    expect(track).toHaveBeenCalledWith("path_unlock_viewed", { cert: "security-plus-sy0-701" });
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
  });

  it("says the payment went through while Stripe confirms it, never the offer, then opens", async () => {
    renderPath();
    await screen.findByRole("button", { name: "Account" });
    expect(screen.getByRole("heading", { name: "Your Security+ study path is being opened." })).toBeInTheDocument();
    expect(screen.getByText(/Payment received/)).toBeInTheDocument();
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
    expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
    expect(window.location.search).toBe("");

    // The activation webhook lands: the path's next look at the account opens it.
    server.access = "pro";
    expect(
      await screen.findByRole("heading", { name: "Your full Security+ study path is now open." }, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(landed()).toHaveLength(1);
    expect(landed()[0].waited_ms).toBeGreaterThan(0);
  }, 10_000);

  it("says when confirming is slow, and looks again on request", async () => {
    renderPath();
    await screen.findByRole("button", { name: "Account" });
    await act(async () => {});
    // Its own clock says 25 seconds have gone by.
    const realNow = Date.now.bind(Date);
    const later = vi.spyOn(Date, "now").mockImplementation(() => realNow() + 25_000);
    try {
      const again = await screen.findByRole("button", { name: "Check again" }, { timeout: 4000 });
      expect(screen.getByRole("link", { name: "support@certbench.dev" })).toHaveAttribute(
        "href",
        "mailto:support@certbench.dev"
      );
      server.access = "pro";
      fireEvent.click(again);
      expect(await screen.findByRole("heading", { name: "Your full Security+ study path is now open." })).toBeInTheDocument();
    } finally {
      later.mockRestore();
    }
  }, 10_000);

  it("is an ordinary visit when they are not signed in", async () => {
    auth.session = null;
    server.progress = null;
    renderPath();
    expect(await screen.findByRole("button", { name: /Right answer/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your Security+ study path is being opened." })).toBeNull();
    expect(window.location.search).toBe("");
  });
});

describe("keeping a learner's work", () => {
  const key = "cb_path_security-plus-sy0-701";
  /** Every save the page sent to the account, oldest first. */
  const saves = () =>
    server.calls.flatMap((c) =>
      c.path === "/api/path/progress" && "progress" in (c.input as object)
        ? [(c.input as { progress: PathProgress }).progress]
        : []
    );
  /** A device holding stops its account never stored: its saves had been failing. */
  const unsavedOnDevice = (owner: string) =>
    localStorage.setItem(key, JSON.stringify({ v: 1, owner, progress: done(["warmup", "1.1", "1.2", "1.3"]) }));

  it("leaves an account's device copy alone through a signed-out visit, and saves it on signing back in", async () => {
    unsavedOnDevice("u1");
    const signedOut = renderPath();
    // Signing back in comes first, not a blank path.
    expect(await screen.findByRole("heading", { name: "Your Security+ study path is saved in your account." })).toBeInTheDocument();
    expect(screen.getByText(/You have completed 4 steps\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in with email" })).toHaveAttribute(
      "href",
      "/login?next=/path/security-plus-sy0-701"
    );
    expect(track).toHaveBeenCalledWith("path_welcome_back_viewed", { cert: "security-plus-sy0-701" });
    expect(JSON.parse(localStorage.getItem(key)!).progress.stops).toHaveProperty("1.3");
    signedOut.unmount();

    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    await waitFor(() => expect(saves().at(-1)?.stops).toHaveProperty("1.3"));
  });

  it("keeps guest work played beside an account's copy through a Google sign-in, and adds it to the account", async () => {
    unsavedOnDevice("u1");
    const signedOut = renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Continue without signing in" }));
    expect(track).toHaveBeenCalledWith("path_welcome_back_played", { cert: "security-plus-sy0-701" });
    await screen.findByText("Prompt a|1.1|w1");
    await answer();
    await answer();
    // Kept beside the account's copy, which stays as it was.
    const guest = JSON.parse(localStorage.getItem("cb_path_guest_security-plus-sy0-701")!);
    expect(Object.keys(guest.items)).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(key)!).progress.items).toEqual({});
    // Google's sign-in reloads the page.
    signedOut.unmount();

    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    await waitFor(() => expect(saves().at(-1)?.stops).toHaveProperty("1.3"));
    expect(Object.keys(saves().at(-1)!.items)).toEqual(expect.arrayContaining(Object.keys(guest.items)));
    expect(localStorage.getItem("cb_path_guest_security-plus-sy0-701")).toBeNull();
    expect(track).toHaveBeenCalledWith("path_account_linked", { cert: "security-plus-sy0-701", method: "redirect" });
  });

  it("saves rounds a public page handed to a new account, and opens on the way on", async () => {
    // Signed up under an objective page's round: that page handed the device's
    // rounds to the account and opened the path. The account has nothing yet.
    localStorage.setItem(
      key,
      JSON.stringify({ v: 1, owner: "new-user", progress: recordRep(done(["1.1"]), "a|1.1|x", true, 1) })
    );
    auth.session = { user: { id: "new-user", email: "new@example.com" } };
    renderPath();

    await waitFor(() => expect(saves().at(-1)?.stops).toHaveProperty("1.1"));
    expect(saves().at(-1)?.items).toHaveProperty(["a|1.1|x"]);
    // Home, with the path's next stop to play: no save card, no warm-up replay.
    expect(await screen.findByRole("button", { name: /Continue/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save and continue" })).toBeNull();
    // The page that took the signup counted the account; the path doesn't again.
    expect(track).not.toHaveBeenCalledWith("path_account_linked", expect.anything());
  });

  it("keeps it when they log back in on the page, after a warm-up signed out", async () => {
    unsavedOnDevice("old-user");
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Continue without signing in" }));
    await screen.findByText("Prompt a|1.1|w1");
    for (let i = 0; i < 3; i++) await answer();
    await screen.findByText(/You have completed the introductory questions/i);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "sam@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "long-enough-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in and continue" }));
    await waitFor(() => expect(saves().at(-1)?.stops).toHaveProperty("1.3"));
    expect(saves().at(-1)?.stops).toHaveProperty("warmup");
    expect(localStorage.getItem("cb_path_guest_security-plus-sy0-701")).toBeNull();
  });
  it("will not take an exam date that cannot be right, and saves a real one", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Yes, I have booked a date" }));
    const input = screen.getByLabelText("Exam date");
    // What a browser's date input reports when 12092026 is typed into the year first.
    fireEvent.change(input, { target: { value: "120920-02-06" } });
    expect(screen.getByRole("button", { name: /Save the date/ })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("That date is not valid");

    const date = isoInDays(30, Date.now());
    fireEvent.change(input, { target: { value: date } });
    fireEvent.click(screen.getByRole("button", { name: /Save the date/ }));
    expect(await screen.findByText("How much time can you study on most days?")).toBeInTheDocument();
    await waitFor(() => expect(saves().at(-1)?.goal?.examDate).toBe(date));
  });

  it("reports a save the account refuses, once a visit", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup", "1.1", "checkpoint"], {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 60, at: 1, domains: [] },
    });
    server.saveError = new ApiError("validation_failed");
    renderPath();
    for (const [objective, index] of [["1.2", 3], ["1.3", 4]] as const) {
      fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
      await screen.findByText(`Prompt a|${objective}|s${index}-0`);
      for (let i = 0; i < 3; i++) await answer();
      await screen.findByText(new RegExp(`You have completed step ${index + 1}\\.`, "i"));
    }
    expect(saves().length).toBeGreaterThanOrEqual(2);
    expect(track.mock.calls.filter(([event]) => event === "path_save_failed")).toEqual([
      ["path_save_failed", { cert: "security-plus-sy0-701", code: "validation_failed" }],
    ]);
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
    expect(screen.getByText("Hands-on labs and the practice exam are included with Pro.")).toBeInTheDocument();
  });

  it("plays a lab in place and counts it once it is graded", async () => {
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(labPlan.stops.slice(0, lab1).map((s) => s.id), { goal });
    renderLabs();
    expect(await screen.findByText(/Your next step is a hands-on lab of about 6 minutes\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await screen.findByRole("heading", { name: "Lab for domain 1.0" })).toBeInTheDocument();
    expect(screen.getByText(/Hands-on lab for domain 1/)).toBeInTheDocument();
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
    expect(await screen.findByText("Objective 2.1")).toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: "Return to the study path" }));
    expect(await screen.findByRole("heading", { name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.getByText(/Your next step is a hands-on lab/)).toBeInTheDocument();
  });

  it("offers the first lab from the unlock moment", async () => {
    server.access = "pro";
    server.progress = done(["warmup"], { goal });
    renderLabs();
    await screen.findByRole("heading", { name: "Your full Security+ study path is now open." });
    // Both domain labs are still ahead.
    expect(screen.getByText("hands-on labs").nextSibling).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: /You can also try a lab now.*Lab for domain 1.0/ }));
    expect(await screen.findByRole("heading", { name: "Lab for domain 1.0" })).toBeInTheDocument();
  });
});

describe("practice exams", () => {
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
    expect(screen.getByRole("heading", { name: "Every question is answered." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Finish and view my score/ }));
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
    expect(await screen.findByRole("button", { name: "Start: Practice exam" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start: Practice exam" }));

    expect(await screen.findByRole("heading", { name: "Take a full-length practice exam." })).toBeInTheDocument();
    expect(screen.getByText(/with your checkpoint result of 58%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Start the full practice exam/ }));
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
    expect(await screen.findByText("Security+ practice exam")).toBeInTheDocument();
    expect(screen.getByTestId("dial")).toHaveTextContent("75%");
    expect(screen.getByRole("heading", { name: "You met the readiness target, 17 points above your checkpoint." })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("link", { name: "Security+ SY0-701" }));
    expect(await screen.findByText(/Your last practice exam result was 75%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review its answers" }));
    expect(await screen.findByRole("tab", { name: "Missed (1)" })).toBeInTheDocument();
  });

  it("shows a free account the practice exam at the end of the map, as part of Pro", async () => {
    server.access = "free";
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.getByLabelText("Practice exam: part of Pro")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start: Practice exam" })).toBeNull();
  });

  it("brings back a practice exam left mid-way, where it was and with its clock", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    localStorage.setItem(runKey, storedRun({ picks: [0, null, null], i: 1, spentMs: 10 * 60_000 }));
    renderPath();
    expect(await screen.findByText("You have a practice exam in progress.")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 questions answered")).toBeInTheDocument();
    expect(screen.getByText("1:20:00 remaining")).toBeInTheDocument();
    // It waits ahead of the next stop: its clock is waiting.
    expect(comesBefore(screen.getByRole("button", { name: /Resume/ }), screen.getByRole("button", { name: /Continue/ }))).toBe(
      true
    );
    fireEvent.click(screen.getByRole("button", { name: /Resume/ }));
    expect(await screen.findByRole("heading", { name: `Prompt q|2.1|${uuid(2)}` })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument();
  });

  it("never shows one account's practice exam to another on the same device", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    localStorage.setItem(runKey, storedRun({ owner: "someone-else", picks: [0, null, null] }));
    renderPath();
    expect(await screen.findByRole("button", { name: "Start: Practice exam" })).toBeInTheDocument();
    expect(screen.queryByText("You have a practice exam in progress.")).toBeNull();
  });

  it("throws a practice exam away only once that is confirmed", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    localStorage.setItem(runKey, storedRun({ size: "half", limitMs: 45 * 60_000 }));
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Discard this practice exam" }));
    expect(localStorage.getItem(runKey)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Discard the exam" }));
    expect(await screen.findByRole("button", { name: "Start: Practice exam" })).toBeInTheDocument();
    expect(localStorage.getItem(runKey)).toBeNull();
  });

  it("ends the path on the practice exam, and counts it as the last step", async () => {
    const last = plan.stops.at(-1)!;
    server.progress = done(plan.stops.slice(0, -1).map((s) => s.id), { goal, checkpoint });
    renderPath();
    expect(await screen.findByText("Your last step is a full-length timed practice exam.")).toBeInTheDocument();
    // The Continue card already leads there: no second card for it.
    expect(screen.queryByRole("button", { name: "Start: Practice exam" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByText(`Step ${last.index + 1}: practice exam`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Half-length exam: 45 questions/ }));
    await sitIt();

    expect(server.calls.find((c) => c.path === "/api/path/rehearsal")?.input).toMatchObject({ size: "half" });
    expect(track).toHaveBeenCalledWith("path_rehearsal_started", expect.objectContaining({ from: "stop" }));
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "rehearsal", kind: "rehearsal", correct: 2, total: 3 })
    );
    expect(lastSave().stops.rehearsal).toMatchObject({ n: 1, c: 2, t: 3 });
    // The path goes on to review rounds.
    expect(await screen.findByText("You have completed the study path. This is a review round.")).toBeInTheDocument();
  });

  it("offers Pro when the server says practice exams are part of it", async () => {
    server.progress = done(["warmup"], { goal, checkpoint });
    server.rehearsalHandler = () => new ApiError("quota_exceeded", "Timed practice exams on your study path are included with Pro.");
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Start: Practice exam" }));
    server.access = "free";
    fireEvent.click(await screen.findByRole("button", { name: /Start the full practice exam/ }));
    expect(await screen.findByText("Continue your study path with Pro")).toBeInTheDocument();
  });

  it("goes over a practice exam's misses from its result, those first", async () => {
    server.progress = done(["warmup"], { goal, checkpoint, items: recordRep(EMPTY_PATH_PROGRESS, "a|2.2|old", false, 1).items });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Start: Practice exam" }));
    fireEvent.click(await screen.findByRole("button", { name: /Start the full practice exam/ }));
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
    expect(await screen.findByText("Review of questions you answered incorrectly")).toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: "Review: Questions to review" }));
    await waitFor(() =>
      expect(server.calls.find((c) => c.path === "/api/path/stop")?.input).toMatchObject({
        index: plan.stops.length,
        focus: "misses",
        missed: misses,
      })
    );
    expect(track).toHaveBeenCalledWith("path_review_started", { cert: "security-plus-sy0-701", from: "home", reps: 3 });
    expect(await screen.findByText("Review of questions you answered incorrectly")).toBeInTheDocument();

    await answer(true);
    await answer(true);
    await answer(false);
    expect(await screen.findByText("You have completed this review.")).toBeInTheDocument();
    expect(screen.getByText(/^1 more question remains to review\. Questions that you answered correctly will be asked once more in a few days/)).toBeInTheDocument();
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
    expect(await screen.findByText("You have 3 questions to review, 3 at a time.")).toBeInTheDocument();
  });

  it("has nothing to offer with nothing missed", async () => {
    server.progress = done(["warmup"], { goal });
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.queryByRole("button", { name: "Review: Questions to review" })).toBeNull();
  });

  it("leaves a free account's misses to its next steps", async () => {
    server.access = "free";
    server.progress = withMisses();
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.queryByRole("button", { name: "Review: Questions to review" })).toBeNull();
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
    expect(await screen.findByRole("heading", { name: "Hands-on labs for Security+" })).toBeInTheDocument();
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
    expect(screen.getAllByText(/This lab ends the domain on your study path\.$/)).toHaveLength(2);
    expect(screen.getByText("Matching drill, 3 minutes.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Return to the study path" }));
    expect(await screen.findByRole("heading", { name: "Your Security+ study path" })).toBeInTheDocument();
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
    expect(await screen.findByText("Your next lab. Topology, 6 minutes.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Return to the labs" }));
    expect(await screen.findByText("4 of 5")).toBeInTheDocument();
  });

  it("counts a domain's lab played from the library as its step on the path", async () => {
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
    expect(await screen.findByText("There are 4 labs. You have completed 1.")).toBeInTheDocument();
    await openLibrary();
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });

  it("goes home when the server says the labs are part of Pro", async () => {
    server.progress = done(["warmup"], { goal });
    server.labHandler = () => new ApiError("quota_exceeded", "Hands-on labs are part of Pro.");
    renderLibrary();
    await openLibrary();
    server.access = "free";
    fireEvent.click(screen.getByRole("button", { name: /Port matching/ }));
    expect(await screen.findByRole("heading", { name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open: Hands-on labs" })).toBeNull();
  });

  it("keeps the library for Pro, and names every lab in a free account's offer", async () => {
    server.access = "free";
    server.progress = done(
      libPlan.stops.slice(0, libPlan.freeThrough + 1).map((s) => s.id),
      { goal, checkpoint: { score: 60, at: 1, domains: [] } }
    );
    renderLibrary();
    expect(await screen.findByText("All 4 hands-on labs, which work like the exam's performance-based questions")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open: Hands-on labs" })).toBeNull();
  });
});

describe("the account menu", () => {
  it("keeps signing out a step away, and says which account the path saves to", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    renderPath();
    const account = await screen.findByRole("button", { name: "Account" });
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).toBeNull();
    fireEvent.click(account);
    expect(screen.getByRole("menu", { name: "Account" })).toHaveTextContent("Signed in as u1@example.com");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("the map", () => {
  const index = (id: string) => plan.stops.findIndex((s) => s.id === id);
  const stopCalls = () => server.calls.filter((c) => c.path === "/api/path/stop").map((c) => c.input as { index: number; run: number });
  const tileButton = (code: string) => screen.getByRole("button", { name: new RegExp(`^${code.replace(".", "\\.")} Objective`) });

  it("opens a played step's card from its tile, and plays it again with Pro", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    // Pro's first visit opens on the unlock moment; this device has seen it.
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup", "1.1"], { goal: { examDate: null, target: null, minutes: 20, at: 1 } });
    renderPath();
    fireEvent.click(await waitFor(() => tileButton("1.1")));
    const card = screen.getByRole("region", { name: "Objective 1.1" });
    expect(card).toHaveTextContent("You answered 3 of 3 questions correctly");
    expect(track).toHaveBeenCalledWith("path_map_tile_opened", { cert: "security-plus-sy0-701", tile: "1.1", state: "done" });
    fireEvent.click(screen.getByRole("button", { name: /Repeat this step/ }));
    await screen.findByText(`Prompt a|1.1|s${index("1.1")}-0`);
    expect(stopCalls().at(-1)).toMatchObject({ index: index("1.1"), run: 1 });
    expect(track).toHaveBeenCalledWith("path_map_action", { cert: "security-plus-sy0-701", tile: "1.1", action: "replay" });
  });

  it("shows a free learner a played step's score, and that playing it again comes with Pro", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup", "1.1"], { goal: { examDate: null, target: null, minutes: 20, at: 1 } });
    renderPath();
    fireEvent.click(await waitFor(() => tileButton("1.1")));
    const card = screen.getByRole("region", { name: "Objective 1.1" });
    expect(card).toHaveTextContent("You answered 3 of 3 questions correctly");
    expect(card).toHaveTextContent("Repeating a completed step is included with Pro.");
    // Before the checkpoint there's no offer on the page to lead to.
    expect(screen.queryByRole("button", { name: /Repeat this step|See what Pro includes/ })).toBeNull();
    expect(track).toHaveBeenCalledWith("path_map_tile_opened", { cert: "security-plus-sy0-701", tile: "1.1", state: "done" });
  });

  it("tells a free learner a step past the checkpoint opens with Pro, after it", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"], { goal: { examDate: null, target: null, minutes: 20, at: 1 } });
    renderPath();
    fireEvent.click(await waitFor(() => tileButton("1.2")));
    expect(screen.getByRole("region", { name: "Objective 1.2" })).toHaveTextContent("This objective is included with Pro, which is offered after your readiness checkpoint.");
  });

  it("starts the step that is next from its tile, and says how far off a later one is", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup", "1.1", "checkpoint"], {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 60, at: 1, domains: [] },
    });
    renderPath();
    fireEvent.click(await waitFor(() => tileButton("1.3")));
    expect(screen.getByRole("region", { name: "Objective 1.3" })).toHaveTextContent(/This objective is taught/);
    expect(within(screen.getByRole("region", { name: "Objective 1.3" })).queryByRole("button")).toBeNull();
    // A second tap closes it; the next stop's tile has the way on.
    fireEvent.click(tileButton("1.3"));
    expect(screen.queryByRole("region", { name: "Objective 1.3" })).toBeNull();
    fireEvent.click(tileButton("1.2"));
    expect(screen.getByRole("region", { name: "Objective 1.2" })).toHaveTextContent("This objective is taught in your next step.");
    fireEvent.click(within(screen.getByRole("region", { name: "Objective 1.2" })).getByRole("button", { name: /^Start/ }));
    await screen.findByText(`Prompt a|1.2|s${index("1.2")}-0`);
  });

  it("shows a free learner what Pro opens past the checkpoint, and leads to the offer", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    const free = plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id);
    server.progress = done(free, {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 70, domains: [], at: 1 } as unknown as PathProgress["checkpoint"],
    });
    renderPath();
    const later = plan.stops.find((s, i) => s.kind === "learn" && i > plan.freeThrough)!;
    fireEvent.click(await waitFor(() => tileButton(later.objectives[0])));
    expect(screen.getByRole("region", { name: `Objective ${later.objectives[0]}` })).toHaveTextContent("This objective is included with Pro.");
    fireEvent.click(screen.getByRole("button", { name: /See what Pro includes/ }));
    expect(track).toHaveBeenCalledWith(
      "path_map_action",
      expect.objectContaining({ tile: later.objectives[0], action: "offer" })
    );

    // A stop they played leads there too, past the checkpoint (what a replay showed them tapping).
    fireEvent.click(tileButton("1.1"));
    expect(screen.getByRole("region", { name: "Objective 1.1" })).toHaveTextContent("Repeating a completed step is included with Pro.");
    expect(screen.getByRole("button", { name: /See what Pro includes/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Repeat this step/ })).toBeNull();
  });

});

describe("a practice exam finished on the exam's public page", () => {
  const KEY = pathRehearsalKey("security-plus-sy0-701-practice-test");
  const uuid = (i: number) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`;
  const examReps = Array.from({ length: 12 }, (_, i) => rep(`q|1.1|${uuid(i)}`, "1.1", "exam"));
  const saved = () =>
    server.calls.flatMap((c) =>
      c.path === "/api/path/progress" && "progress" in (c.input as object)
        ? [(c.input as { progress: PathProgress }).progress]
        : []
    );

  /** `extra`: for example the account the public page showed the score to (`claimedBy`). */
  function finishedExam(at = Date.now() - 600_000, extra: object = {}) {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...extra,
        v: 1,
        owner: "public",
        size: "half",
        asStop: false,
        reps: examReps,
        picks: examReps.map((_, i) => (i < 8 ? 0 : 1)),
        flagged: [],
        i: 0,
        spentMs: 900_000,
        limitMs: 2_700_000,
        startedAt: at - 900_000,
        done: {
          result: { score: 67, at, domains: [{ number: "1.0", correct: 8, total: 12 }], size: "half", answered: 12, total: 12, seconds: 900 },
          before: null,
          timedOut: false,
        },
      })
    );
  }

  it("counts as the checkpoint, and opens on its reveal with the offer", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    finishedExam();
    window.history.replaceState(null, "", "/path/security-plus-sy0-701?from=practice-test");
    renderPath();

    expect(await screen.findByText("Security+ practice exam")).toBeInTheDocument();
    expect(screen.getByText("Continue your study path with Pro")).toBeInTheDocument();
    expect(screen.getByText("This result is based on 12 questions, so each answer changes it by about 8 points. The exam itself has up to 90 questions.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_checkpoint_completed", {
      cert: "security-plus-sy0-701",
      score: 67,
      source: "practice_exam",
    });
    expect(window.location.search).toBe("");

    await waitFor(() => expect(saved().at(-1)?.checkpoint?.score).toBe(67));
    expect(saved().at(-1)?.rehearsals).toHaveLength(1);
    expect(saved().at(-1)?.stops.checkpoint).toMatchObject({ c: 8, t: 12 });
    const answers = server.calls.find((c) => c.path === "/api/path/answers")?.input as { answers: unknown[] } | undefined;
    expect(answers?.answers).toHaveLength(12);
  });

  it("leaves a checkpoint already taken in place, and keeps the exam as a practice exam", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup", "1.1", "checkpoint"], { checkpoint: { score: 55, at: 1, domains: [] } });
    finishedExam();
    renderPath();
    await waitFor(() => expect(saved().at(-1)?.rehearsals).toHaveLength(1));
    expect(saved().at(-1)?.checkpoint?.score).toBe(55);
    expect(screen.queryByText("Security+ practice exam")).toBeNull();
    expect(track).not.toHaveBeenCalledWith("path_checkpoint_completed", expect.objectContaining({ source: "practice_exam" }));
  });

  it("waits for an account: a signed-out visitor's path does not take it", async () => {
    finishedExam();
    renderPath();
    await screen.findByText(/Introductory questions/);
    expect(saved()).toHaveLength(0);
    expect(screen.queryByText("Security+ practice exam")).toBeNull();
  });

  // A public page keeps an exam for the device and not for a person, so on a
  // shared computer it must not go to whoever opens the study path next.
  describe("on a shared computer", () => {
    const PATH = "cb_path_security-plus-sy0-701";
    const TAKEN = "cb_path_exam_taken_security-plus-sy0-701";
    const imported = () => saved().some((p) => p.rehearsals.length > 0);
    /** The device holds another account's study path. */
    const someoneElsesDevice = () =>
      localStorage.setItem(PATH, JSON.stringify({ v: 1, owner: "someone-else", progress: done(["warmup", "1.1"]) }));

    beforeEach(() => {
      auth.session = { user: { id: "u1", email: "u1@example.com" } };
      server.progress = done(["warmup"]);
    });

    it("leaves an exam whose score was shown to another account where it is", async () => {
      finishedExam(undefined, { claimedBy: "someone-else" });
      renderPath();
      await screen.findByRole("button", { name: /^Continue/ });
      expect(imported()).toBe(false);
      expect(screen.queryByText("Security+ practice exam")).toBeNull();
      expect(track).not.toHaveBeenCalledWith(
        "path_checkpoint_completed",
        expect.objectContaining({ source: "practice_exam" })
      );
    });

    it("takes an exam whose score was shown to this account, whatever the device held", async () => {
      someoneElsesDevice();
      finishedExam(undefined, { claimedBy: "u1" });
      renderPath();
      expect(await screen.findByText("Security+ practice exam")).toBeInTheDocument();
      await waitFor(() => expect(saved().at(-1)?.checkpoint?.score).toBe(67));
      expect(JSON.parse(localStorage.getItem(TAKEN)!)).toMatchObject({ by: "u1" });
    });

    it("sets aside an exam that nobody claimed when the device held another account's study path, and keeps it set aside", async () => {
      someoneElsesDevice();
      finishedExam();
      const first = renderPath();
      await screen.findByRole("button", { name: /^Continue/ });
      expect(imported()).toBe(false);
      expect(screen.queryByText("Security+ practice exam")).toBeNull();
      expect(JSON.parse(localStorage.getItem(TAKEN)!)).toMatchObject({ by: null });
      first.unmount();

      // The device's copy is this account's now, and the exam is still not theirs.
      expect(JSON.parse(localStorage.getItem(PATH)!).owner).toBe("u1");
      renderPath();
      await screen.findByRole("button", { name: /^Continue/ });
      expect(imported()).toBe(false);
    });

    it("gives an exam that nobody claimed to one account only", async () => {
      finishedExam();
      const first = renderPath();
      await waitFor(() => expect(imported()).toBe(true));
      expect(JSON.parse(localStorage.getItem(TAKEN)!)).toMatchObject({ by: "u1" });
      first.unmount();

      // The next person to sign in on this device, on two visits: the second
      // time the device's copy is their own, and the exam is still not theirs.
      auth.session = { user: { id: "u2", email: "u2@example.com" } };
      for (let visit = 0; visit < 2; visit++) {
        server.calls = [];
        const next = renderPath();
        await screen.findByRole("button", { name: /^Continue/ });
        await act(async () => {});
        expect(imported()).toBe(false);
        next.unmount();
      }
      expect(JSON.parse(localStorage.getItem(TAKEN)!)).toMatchObject({ by: "u1" });
    });

    it("waits until the account has been reached, so that an exam never replaces a checkpoint the account holds", async () => {
      server.readError = new ApiError("internal");
      finishedExam();
      renderPath();
      await screen.findByText(/Your account could not be reached/);
      expect(saved()).toHaveLength(0);
      expect(localStorage.getItem(TAKEN)).toBeNull();

      server.readError = null;
      server.progress = done(["warmup", "1.1", "checkpoint"], { checkpoint: { score: 55, at: 1, domains: [] } });
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(saved().at(-1)?.rehearsals).toHaveLength(1));
      expect(saved().at(-1)?.checkpoint?.score).toBe(55);
    });
  });
});

describe("coming back during the introductory questions", () => {
  const key = "cb_path_security-plus-sy0-701";
  const EARLIER = /introductory questions earlier/;
  /** A visitor's device with these introductory questions answered and the step not finished. */
  const partWay = (...answers: [id: string, correct: boolean][]) =>
    localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        owner: null,
        progress: answers.reduce((p, [id, ok], n) => recordRep(p, id, ok, n + 1), EMPTY_PATH_PROGRESS),
      })
    );

  it("carries on from the next question after a reload, and asks for no account before the step is done", async () => {
    const first = renderPath();
    await act(async () => {});
    await answer(true);
    expect(screen.getByText("Prompt a|2.1|w2")).toBeInTheDocument();
    // The phone discards the tab, and the page loads afresh.
    first.unmount();

    renderPath();
    expect(await screen.findByText("Prompt a|2.1|w2")).toBeInTheDocument();
    expect(
      screen.getByText("You answered 1 of the 3 introductory questions earlier. The questions continue from here.")
    ).toBeInTheDocument();
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
    // Not the account wall, and not the first question again.
    expect(screen.queryByText("Your Security+ study path")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save and continue" })).toBeNull();
    expect(screen.queryByText("Prompt a|1.1|w1")).toBeNull();

    await answer(false);
    // The line said where the questions continued: it is not repeated.
    expect(screen.queryByText(EARLIER)).toBeNull();
    await answer(true);
    // The step ends with the whole score, and only now the save ask.
    expect(await screen.findByText(/You have completed the introductory questions/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You answered 2 of 3 questions correctly." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "warmup", correct: 2, total: 3, signed_in: false })
    );
    expect(server.calls.filter((c) => c.path === "/api/path/stop")).toHaveLength(0);
  });

  it("copes with any questions answered already, such as the home page's sample questions", async () => {
    // The second introductory question was answered on the home page.
    partWay(["a|2.1|w2", true]);
    renderPath();
    expect(
      await screen.findByText("You answered 1 of the 3 introductory questions earlier. The questions continue from here.")
    ).toBeInTheDocument();
    expect(screen.getByText("Prompt a|1.1|w1")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    await answer(true);
    // The question that has an answer is passed over.
    expect(await screen.findByText("Prompt a|1.2|w3")).toBeInTheDocument();
    expect(screen.getByText("Question 3 of 3")).toBeInTheDocument();
    await answer(false);
    expect(await screen.findByRole("heading", { name: "You answered 2 of 3 questions correctly." })).toBeInTheDocument();
  });

  it("counts the step at once when every introductory question has an answer already", async () => {
    partWay(["a|1.1|w1", true], ["a|2.1|w2", false], ["a|1.2|w3", true]);
    renderPath();
    expect(await screen.findByRole("heading", { name: "You answered 2 of 3 questions correctly." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(key)!).progress.stops.warmup).toMatchObject({ n: 1, c: 2, t: 3 });
  });

  it("gives the introductory questions, not an account wall, to a visitor who has only played rounds on public pages", async () => {
    localStorage.setItem(
      key,
      JSON.stringify({ v: 1, owner: null, progress: recordRep(done(["1.1"]), "a|1.1|x", true, 1) })
    );
    renderPath();
    expect(await screen.findByText("Prompt a|1.1|w1")).toBeInTheDocument();
    await act(async () => {});
    expect(screen.getByText("Prompt a|1.1|w1")).toBeInTheDocument();
    expect(screen.queryByText(EARLIER)).toBeNull();
    expect(screen.queryByRole("button", { name: "Save and continue" })).toBeNull();
  });

  it("asks a visitor who has finished the introductory questions to save them, as before", async () => {
    localStorage.setItem(key, JSON.stringify({ v: 1, owner: null, progress: done(["warmup"]) }));
    renderPath();
    expect(await screen.findByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    expect(screen.getByText("Your Security+ study path")).toBeInTheDocument();
  });

  it("continues them for a learner who signs in after answering some", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    partWay(["a|2.1|w2", true]);
    // The server builds the first step from the same introductory questions.
    server.stopHandler = () => ({ stop: plan.stops[0], reps: warmup.reps });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    expect(
      await screen.findByText("You answered 1 of the 3 introductory questions earlier. The questions continue from here.")
    ).toBeInTheDocument();
    expect(screen.getByText("Prompt a|1.1|w1")).toBeInTheDocument();
  });

  it("keeps a learner on the question they have answered when their own screen arrives late", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    renderPath();
    // The first question is answered before the account has been read.
    fireEvent.click(screen.getByRole("button", { name: /Right answer/ }));
    await screen.findByRole("button", { name: "Account" });
    await act(async () => {});
    // They are not sent to the path's home, and the answer is theirs.
    expect(screen.getByText(/^Correct\./)).toBeInTheDocument();
    expect(screen.queryByText("Your Security+ study path")).toBeNull();
    const saves = server.calls.flatMap((c) =>
      c.path === "/api/path/progress" && "progress" in (c.input as object)
        ? [(c.input as { progress: PathProgress }).progress]
        : []
    );
    expect(saves.at(-1)?.items).toHaveProperty(["a|1.1|w1"]);
    expect(saves.at(-1)?.stops).toHaveProperty("warmup");
  });
});

describe("the held stage", () => {
  const key = "cb_path_security-plus-sy0-701";
  const html = document.documentElement;
  const body = () => document.querySelector(".path-stage > .path-stage-body")!;

  it("keeps a returning learner's first-visit question from being read, focused or pressed until their own screen is ready", async () => {
    localStorage.setItem(key, JSON.stringify({ v: 1, owner: null, progress: done(["warmup"]) }));
    renderPath();
    // Before the device has been read, the stage is held.
    expect(html).toHaveAttribute("data-path-returning");
    expect(document.querySelector(".path-stage")).toHaveAttribute("data-ready", "false");
    expect(body()).toHaveAttribute("inert");
    // The two sentences are in the page; the style rules decide when each is seen.
    expect(screen.getByText("Your study path is loading.")).toHaveAttribute("role", "status");
    expect(screen.getByText(/^Your study path could not be loaded\. Please check your connection and/)).toHaveAttribute(
      "role",
      "alert"
    );
    // An empty address is this page's own address: the link reloads it without any script.
    expect(screen.getByText("reload the page").closest("a")).toHaveAttribute("href", "");

    expect(await screen.findByText("Your Security+ study path")).toBeInTheDocument();
    expect(document.querySelector(".path-stage")).toHaveAttribute("data-ready", "true");
    expect(body()).not.toHaveAttribute("inert");
    expect(screen.queryByText("Your study path is loading.")).toBeNull();
    expect(screen.queryByText(/could not be loaded/)).toBeNull();
  });

  it("leaves a first visit's question in use, and marks the page's scripts as running", async () => {
    // The inline script found the page late: its scripts had not started.
    html.setAttribute("data-path-late", "");
    renderPath();
    expect(html).not.toHaveAttribute("data-path-returning");
    expect(html).toHaveAttribute("data-path-live");
    expect(html).not.toHaveAttribute("data-path-late");
    expect(body()).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: /Right answer/ })).toBeEnabled();
    await act(async () => {});
  });

  it("is held for someone who is signed in: their account may hold a path that this device does not", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    // The sign-in client's session cookie, which the page can read before its scripts load.
    document.cookie = "sb-abcdefgh-auth-token=session";
    try {
      renderPath();
      expect(html).toHaveAttribute("data-path-returning");
      expect(body()).toHaveAttribute("inert");
      expect(await screen.findByText("Your Security+ study path")).toBeInTheDocument();
      expect(body()).not.toHaveAttribute("inert");
    } finally {
      document.cookie = "sb-abcdefgh-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  });

  it("says that it is loading after half a second when the page was opened from inside the app", async () => {
    localStorage.setItem(key, JSON.stringify({ v: 1, owner: null, progress: done(["warmup"]) }));
    vi.useFakeTimers();
    try {
      const page = renderPath();
      expect(html).not.toHaveAttribute("data-path-wait");
      act(() => void vi.advanceTimersByTime(500));
      expect(html).toHaveAttribute("data-path-wait");
      // Leaving the page resets the clock for the next study path.
      page.unmount();
      expect(html).not.toHaveAttribute("data-path-wait");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("when the account cannot be reached", () => {
  const key = "cb_path_security-plus-sy0-701";
  const NOT_REACHED = "Your account could not be reached. The progress saved on this device is shown.";
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };
  /** The device of someone past the checkpoint: a member's, for all the page can tell. */
  const pastCheckpoint = () =>
    localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        owner: "u1",
        progress: done(
          plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id),
          { goal, checkpoint: { score: 64, at: 1, domains: [{ number: "1.0", correct: 2, total: 3 }] } }
        ),
      })
    );

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.readError = new ApiError("internal", "The connection was lost. Please check your connection and try again.");
  });

  it("offers nothing and locks nothing, says what is shown, and asks again on request", async () => {
    pastCheckpoint();
    renderPath();
    expect(await screen.findByText(NOT_REACHED)).toBeInTheDocument();
    expect(screen.getByText("Your Security+ study path")).toBeInTheDocument();
    // A member must not be asked to buy what they have: no offer and no lock,
    // and the way on is a plain Continue that asks the server.
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
    expect(screen.queryByText(/included with Pro/i)).toBeNull();
    expect(screen.getByRole("button", { name: /^Continue/ })).toBeInTheDocument();

    // The account answers: a member.
    server.readError = null;
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText(NOT_REACHED)).toBeNull());
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
    expect(await screen.findByRole("button", { name: "Start: Practice exam" })).toBeInTheDocument();
  });

  it("makes the offer once the server has said that the account does not have Pro", async () => {
    pastCheckpoint();
    server.stopHandler = () => new ApiError("quota_exceeded", "The rest of the study path is included with Pro.");
    renderPath();
    await screen.findByText(NOT_REACHED);
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(await screen.findByText("Continue your study path with Pro")).toBeInTheDocument();
    // The account itself has still not been read, and the page still says so.
    expect(screen.getByText(NOT_REACHED)).toBeInTheDocument();
  });

  it("offers Pro to a free account as before once the account has answered", async () => {
    pastCheckpoint();
    server.readError = null;
    renderPath();
    expect(await screen.findByText("Continue your study path with Pro")).toBeInTheDocument();
    expect(screen.queryByText(NOT_REACHED)).toBeNull();
  });

  it("says when the latest answers were not saved, until a save succeeds", async () => {
    server.readError = null;
    server.progress = done(["warmup"]);
    server.saveError = new ApiError("internal");
    server.stopHandler = (input) => stopReply(input.index, 1);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    await answer(true);
    const line = "Your latest answers are kept on this device and will be saved to your account when the connection returns.";
    expect(await screen.findByText(line)).toBeInTheDocument();

    server.saveError = null;
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(screen.queryByText(line)).toBeNull());
  });

  it("tells a visitor when the browser is not keeping their progress", async () => {
    auth.session = null;
    storage.refuses = true;
    renderPath();
    expect(
      await screen.findByText("This browser is not saving your progress. Create a free account to keep it.")
    ).toBeInTheDocument();
    // The questions still work in this tab.
    await answer(true);
    expect(screen.getByText("Prompt a|2.1|w2")).toBeInTheDocument();
  });
});
