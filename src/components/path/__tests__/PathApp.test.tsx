// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { itemStatus } from "@/core/drill-rounds/drill-rounds";
import { buildPlan } from "@/core/path/plan";
import { isoInDays } from "@/core/path/checkpoint";
import { recordRep } from "@/core/path/progress";
import type { FreeOnPublicPages } from "@/core/path/free-labs";
import { EMPTY_PATH_PROGRESS, type ChoiceRep, type PathProgress, type PathStop, type PathStructure, type Rep } from "@/core/path/types";

/**
 * Who the mocked Supabase client says is signed in. `ended`: the sign-in
 * service no longer knows the session (it was ended on another device). The
 * client learns that only when it asks the service, and drops its cookie then.
 */
const auth = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  ended: false,
}));
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: auth.session } }),
      getUser: async () => {
        if (auth.ended || !auth.session) {
          auth.session = null;
          return { data: { user: null }, error: { name: "AuthSessionMissingError", status: 400 } };
        }
        return { data: { user: auth.session.user }, error: null };
      },
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

// The score counts up with requestAnimationFrame; its look is not under test
// here (PathReveal.test.tsx and the score level's own tests hold that). The
// bars beside it stay real.
vi.mock("@/components/instrument/ScoreLevel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/instrument/ScoreLevel")>()),
  ScoreLevel: ({ score, band, readyMark = true }: { score: number; band: { label: string }; readyMark?: boolean }) => (
    <div data-testid="score" data-label={band.label} data-ready-mark={String(readyMark)}>
      {score}%
    </div>
  ),
}));

/**
 * Everything the question card was handed, render by render, so that a test
 * can see whether its handlers were made again and whether it was told to take
 * the focus. The card itself is the real one.
 */
const cards = vi.hoisted(
  () => [] as { rep: { id: string }; onAnswer: unknown; onNext: unknown; takeFocus?: boolean }[]
);
vi.mock("../RepCard", async (importOriginal) => {
  const real = await importOriginal<typeof import("../RepCard")>();
  return {
    ...real,
    RepCard: (props: Parameters<typeof real.RepCard>[0]) => {
      cards.push(props);
      return <real.RepCard {...props} />;
    },
  };
});

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

// Loading the page again is watched, not done: the test page cannot navigate.
const reloadPage = vi.hoisted(() => vi.fn());
vi.mock("../reload-page", () => ({ reloadPage }));

// The background fetch of the schemas that read the server's answers is
// watched here, and nothing is fetched. The rest of the module stays real.
const warmContracts = vi.hoisted(() => vi.fn());
vi.mock("@/contracts/lazy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/contracts/lazy")>()),
  warmContracts,
}));

// The early fetch of a lab's large player is watched here; the rest of the
// module stays real. (Nothing is fetched: the player above stands in for all of them.)
const preloadLab = vi.hoisted(() => vi.fn());
vi.mock("@/components/workspace/pbq-host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/workspace/pbq-host")>()),
  preloadLab,
}));

/** The API, answered per endpoint path. Tests swap handlers as needed. */
const server = vi.hoisted(() => ({
  progress: null as null | object,
  access: "free" as "free" | "pro",
  proPlan: false,
  /** The account's last payment did not go through (it has no Pro while the payment is owed). */
  pastDue: false,
  /** The offer's prices for the learner's region, when the account's answer carries them. */
  pricing: null as null | object,
  /** What enrolling answers: false when a Pro member already has another exam. */
  enrolls: true,
  /** When set, the request that makes this the account's exam waits for it before it answers. */
  enrollWaits: null as null | Promise<unknown>,
  /** What a request for a step answers. It may answer later (a promise), as a slow server does. */
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
            // As the server does: sent only when it is true.
            ...(server.pastDue ? { paymentPastDue: true } : {}),
            ...(server.pricing ? { pricing: server.pricing } : {}),
          };
        case "POST /api/path/progress":
          if (server.saveError) throw server.saveError;
          return { ok: true, stored: true };
        case "POST /api/path/stop": {
          const out = await server.stopHandler?.(input as { index: number });
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
          if (server.enrollWaits) await server.enrollWaits;
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

import { ContinueCard, PathApp } from "../PathApp";
import { QuickRound } from "../QuickRound";
import { ApiError } from "@/contracts/common";
import { pathRehearsalKey } from "../storage-key";
import { oweStartEvent } from "../path-start";

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

/**
 * What the exam gives away on its public pages, as the study path's page works
 * it out on the server: where the free practice exam is, where the free labs
 * are, and which labs they are (none of this exam's test labs, unless a test says so).
 */
const free: FreeOnPublicPages = {
  examHref: "/security-plus-practice-test",
  labsHref: "/security-plus-pbq-examples",
  labIds: [],
};

function renderPath(freeParts: FreeOnPublicPages = free) {
  return render(
    <PathApp
      cert="security-plus-sy0-701"
      structure={structure}
      plan={plan}
      warmup={warmup}
      questionCount={842}
      free={freeParts}
    />
  );
}

/**
 * The exam's name in the header, which leads back to the home screen of the
 * study path. It reads "Your Security+ SY0-701 study path" (the first and last
 * words are for a screen reader); the test library's own naming drops the
 * spaces between its parts, so it is found by the part that is always there.
 */
function headerLink(): HTMLElement {
  const link = within(screen.getByRole("banner")).getByRole("link", { name: /Security\+/ });
  expect(link.textContent).toBe("Your Security+ SY0-701 study path");
  return link;
}

/**
 * A row of the course outline, found by the words it shows. A row has no label
 * of its own, so its text is its name; the test library's own naming drops the
 * spaces that a browser keeps between the parts of a row.
 */
function outlineRow(start: string): HTMLElement {
  const rows = [...document.querySelectorAll<HTMLElement>(".path-stage-body li")];
  const found = rows.find((row) => (row.textContent ?? "").startsWith(start));
  if (!found) throw new Error(`No row of the outline begins "${start}". Rows: ${rows.map((r) => r.textContent).join(" | ")}`);
  return found;
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
  auth.ended = false;
  server.progress = null;
  server.access = "free";
  server.proPlan = false;
  server.pastDue = false;
  server.pricing = null;
  server.enrolls = true;
  server.enrollWaits = null;
  cards.length = 0;
  server.stopHandler = (input) => stopReply(input.index);
  server.rehearsalHandler = null;
  server.labHandler = null;
  server.saveError = null;
  server.readError = null;
  server.calls = [];
  track.mockClear();
  identifyUser.mockClear();
  preloadLab.mockClear();
  reloadPage.mockClear();
  warmContracts.mockClear();
  storage.refuses = false;
  localStorage.clear();
  window.history.replaceState(null, "", "/path/security-plus-sy0-701");
  // What the page, or its inline script, leaves on <html> for the held stage.
  for (const name of ["returning", "wait", "late", "live"]) document.documentElement.removeAttribute(`data-path-${name}`);
});

// The page gives back the history entry it added when a learner returns to the
// home screen, and the test DOM carries that out a moment later. It is let
// through here, while the page is still mounted, so that it cannot move the
// next test's address.
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
});

/** The browser's Back, and the moment it takes to arrive. */
async function goBack() {
  await act(async () => {
    const arrived = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
    window.history.back();
    await arrived;
  });
}

/** Every save of the study path that the page sent to the account, oldest first. */
const savedProgress = () =>
  server.calls.flatMap((c) =>
    c.path === "/api/path/progress" && "progress" in (c.input as object)
      ? [(c.input as { progress: PathProgress }).progress]
      : []
  );

/** The requests for a step that the page has made, oldest first. */
const stepRequests = () =>
  server.calls.filter((c) => c.path === "/api/path/stop").map((c) => c.input as { index: number; focus?: string });

describe("a first visit", () => {
  it("starts on the warm-up's first rep with nothing to decide", async () => {
    renderPath();
    await act(async () => {});
    expect(screen.getByText("Prompt a|1.1|w1")).toBeInTheDocument();
    // The step's name is the screen's title, and the question is the heading under it.
    expect(screen.getByRole("heading", { level: 1, name: "Introductory questions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Prompt a|1.1|w1" })).toBeInTheDocument();
    // No home screen to go back to yet, so the exam name is not a link.
    expect(screen.queryByRole("link", { name: /Security\+.*study path/ })).toBeNull();
    // The page's one main region, which the skip link at the top of the document leads to.
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("ends the warm-up by naming the next step, the save prompt ahead of the map", async () => {
    renderPath();
    await act(async () => {});
    await answer(true);
    await answer(false);
    await answer(true);
    expect(await screen.findByText(/You have completed the introductory questions/i)).toBeInTheDocument();
    expect(screen.getByText(/1 question will be repeated/)).toBeInTheDocument();
    // The result is the screen's title, then the save ask, then the outline with the domains under it.
    expect(screen.getByRole("heading", { level: 1, name: "You answered 2 of 3 questions correctly." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Your next step: Objective 1.1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Security+ objectives" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Domain 1: Domain 1" })).toBeInTheDocument();
    // What the questions changed in the outline, in the outline's own words. No
    // objective is "Complete" on the strength of an introductory question.
    expect(
      screen.getByText("These questions marked 3 objectives: 3 are started. In all, you have started 3 of 6 objectives.")
    ).toBeInTheDocument();
    expect(outlineRow("1.2")).toHaveTextContent("1.2 Objective 1.2, Started");
    expect(screen.queryByText("Complete")).toBeNull();
    // What a free account opens, in the pricing page's words.
    expect(
      screen.getByText(/A free account saves your progress and opens your first study step and the readiness checkpoint\./)
    ).toBeInTheDocument();
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

  // The page decides where a learner belongs as the progress hook learns who
  // is here, in the same render: the held stage never opens on the first
  // visit's question and then moves on.
  it("opens the held stage on their map, never on the first visit's question", async () => {
    returning("warmup");
    const shown: string[] = [];
    const observer = new MutationObserver(() => {
      if (document.querySelector(".path-stage")?.getAttribute("data-ready") !== "true") return;
      shown.push(screen.queryByText("Prompt a|1.1|w1") ? "the first visit's question" : "their own screen");
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    try {
      renderPath();
      expect(await screen.findByText("Your Security+ study path")).toBeInTheDocument();
    } finally {
      observer.disconnect();
    }
    expect(shown).toContain("their own screen");
    expect(shown).not.toContain("the first visit's question");
  });

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

  it("opens Pro with what it opened once they are back on the map, when Pro arrives partway through a step", async () => {
    server.proPlan = true;
    server.progress = done(["warmup"]);
    let confirm = () => {};
    server.enrollWaits = new Promise((resolve) => {
      confirm = () => resolve(undefined);
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    // One answer: the step has begun when Pro is confirmed.
    fireEvent.click(screen.getByRole("button", { name: /Right answer/ }));
    await act(async () => confirm());
    await waitFor(() => expect(accessReads()).toBe(2));
    await act(async () => {});
    expect(screen.getByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your full Security+ study path is now open." })).toBeNull();

    // The rest of the step, and the screen that ends it: still the step's own screens.
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await answer();
    await answer();
    expect(await screen.findByText(/You have completed step 2./i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your full Security+ study path is now open." })).toBeNull();
    expect(track).not.toHaveBeenCalledWith("path_unlock_viewed", expect.anything());

    // Back on the map, the unlock moment opens in its place.
    fireEvent.click(headerLink());
    expect(await screen.findByRole("heading", { name: "Your full Security+ study path is now open." })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_unlock_viewed", { cert: "security-plus-sy0-701" });
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

  // A learn step is built from its own objective's questions, and a seen id
  // names its objective: the rest of a long history only made the request
  // larger. A step drawn from the whole exam still gets every seen id.
  it("sends a learn step only its own objective's seen questions, and the checkpoint all of them", async () => {
    const seenAcross = (progress: PathProgress) =>
      ["q|1.1|aaa", "q|2.1|bbb", "a|1.2|ccc", "r|1.1|net-ports|1a2b3c4d"].reduce((p, id, n) => recordRep(p, id, true, n + 1), progress);
    const sent = () =>
      server.calls.filter((c) => c.path === "/api/path/stop").map((c) => c.input as { index: number; seen: string[] });

    server.progress = seenAcross(done(["warmup"]));
    const first = renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    expect(sent()[0].index).toBe(1);
    expect([...sent()[0].seen].sort()).toEqual(["q|1.1|aaa", "r|1.1|net-ports|1a2b3c4d"]);
    first.unmount();

    server.calls = [];
    server.progress = seenAcross(done(["warmup", "1.1"], { goal: { examDate: null, target: null, minutes: 20, at: 1 } }));
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Start the checkpoint/ }));
    await waitFor(() => expect(sent()).toHaveLength(1));
    expect(sent()[0].index).toBe(2);
    expect([...sent()[0].seen].sort()).toEqual(["a|1.2|ccc", "q|1.1|aaa", "q|2.1|bbb", "r|1.1|net-ports|1a2b3c4d"]);
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
    // The step taught objective 1.1 and nothing is left to review, so it is
    // complete: the sentence above the outline says what the step changed, and
    // the row under it says the same.
    expect(
      screen.getByText("This step marked 1 objective: it is complete. In all, you have started 1 of 6 objectives.")
    ).toBeInTheDocument();
    expect(outlineRow("1.1")).toHaveTextContent("1.1 Objective 1.1, Complete");
    // The way on names the step that is next, as a heading under the result.
    expect(screen.getByRole("heading", { level: 2, name: "Readiness checkpoint" })).toBeInTheDocument();
  });

  it("says when a step left an objective to review", async () => {
    server.progress = done(["warmup"]);
    server.stopHandler = (input) => stopReply(input.index, 2);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    await answer(true);
    await answer(false);
    await screen.findByText(/You have completed step 2/i);
    expect(
      screen.getByText("This step marked 1 objective: it is to review. In all, you have started 1 of 6 objectives.")
    ).toBeInTheDocument();
    expect(outlineRow("1.1")).toHaveTextContent("1.1 Objective 1.1, To review");
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

  it("counts and passes a step with nothing to ask that arrives after the goal questions, and returns home", async () => {
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup", "1.1", "checkpoint"], {
      goal: { examDate: null, target: null, minutes: null, at: 1 },
      checkpoint: { score: 60, at: 1, domains: [] },
    });
    server.stopHandler = (input) => stopReply(input.index, 0);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: "About 20 minutes" }));
    // Not a screen that counts "Question 1 of 0" with nothing to press.
    expect(await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.queryByText(/Question 1 of 0/)).toBeNull();
    await waitFor(() => expect(savedProgress().at(-1)?.stops["1.2"]).toMatchObject({ n: 1, c: 0, t: 0 }));
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
    expect(await screen.findByTestId("score")).toHaveTextContent("50%");
    expect(screen.getByRole("heading", { name: "You are making good progress." })).toBeInTheDocument();
    expect(screen.getByText("Continue your study path with Pro")).toBeInTheDocument();
    // The offer's own button says where it leads.
    expect(await screen.findByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
    // The guarantee states its conditions right on the offer.
    expect(screen.getByText(/If you study with Pro for 30 days or more and do not pass your exam, CertBench refunds your last payment\./)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_checkpoint_completed", { cert: "security-plus-sy0-701", score: 50 });
    expect(track).toHaveBeenCalledWith("path_offer_viewed", { cert: "security-plus-sy0-701", context: "reveal" });
  });

  // The offer used to show no price until a request of its own had answered.
  it("makes the offer at the regional prices that came with the account's answer, and asks for no prices", async () => {
    server.pricing = {
      discountPercent: 40,
      prices: {
        monthly: { original: "$19", discounted: "$11.40" },
        quarterly: { original: "$39", discounted: "$23.40" },
        annual: { original: "$99", discounted: "$59.40" },
      },
    };
    server.progress = done(["warmup", "1.1", "checkpoint"], {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 50, at: 1, domains: [] },
    });
    renderPath();
    expect(await screen.findByText("$11.40")).toBeInTheDocument();
    expect(screen.queryByText("$19")).toBeNull();
    expect(server.calls.some((c) => c.path === "/api/pricing/region")).toBe(false);
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

    const score = await screen.findByTestId("score");
    expect(score).toHaveTextContent("100%");
    // A dozen questions can't call anyone exam-ready: not the label, the mark or the copy.
    expect(score).toHaveAttribute("data-label", "Strong first result");
    expect(score).toHaveAttribute("data-ready-mark", "false");
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
    fireEvent.click(headerLink());
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

  it("takes the flag off the address before it records the landing", async () => {
    server.access = "pro";
    const addresses: string[] = [];
    track.mockImplementation((name: string) => {
      if (name === "path_upgrade_landed") addresses.push(window.location.search);
    });
    try {
      renderPath();
      expect(await screen.findByRole("heading", { name: "Your full Security+ study path is now open." })).toBeInTheDocument();
      expect(addresses).toEqual([""]);
    } finally {
      track.mockReset();
    }
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

  // A payment held up longer than the page asks for (or Pro held on another
  // exam) left the buyer on this screen with only a reload to get out.
  it("offers the way back to the study path once confirming is slow", async () => {
    renderPath();
    await screen.findByRole("button", { name: "Account" });
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Return to the study path" })).toBeNull();
    const realNow = Date.now.bind(Date);
    const later = vi.spyOn(Date, "now").mockImplementation(() => realNow() + 25_000);
    try {
      const back = await screen.findByRole("button", { name: "Return to the study path" }, { timeout: 4000 });
      back.focus();
      fireEvent.click(back);
      const title = await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" });
      expect(screen.queryByRole("heading", { name: "Your Security+ study path is being opened." })).toBeNull();
      // The button that was pressed has gone with its screen: the focus moves to the title of the one in its place.
      await waitFor(() => expect(document.activeElement).toBe(title));
    } finally {
      later.mockRestore();
    }
  }, 10_000);

  // A bank's approval step can reopen the site in another browser, where the
  // buyer has no session. They were shown the first visit's questions with no
  // mention of the payment.
  it("tells a buyer who returns signed out that the payment was received, and asks them to sign in", async () => {
    auth.session = null;
    server.progress = null;
    renderPath();
    expect(await screen.findByRole("heading", { level: 1, name: "Your payment was received." })).toBeInTheDocument();
    expect(screen.getByText("Please sign in to open your study path.")).toBeInTheDocument();
    // Neither the first visit's questions nor the wait for a confirmation that nobody is signed in to receive.
    expect(screen.queryByRole("button", { name: /Right answer/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Your Security+ study path is being opened." })).toBeNull();
    // Signing in comes back to this address, still marked as a return from
    // paying, so the wait for the confirmation begins there.
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in with email" })).toHaveAttribute(
      "href",
      "/login?next=%2Fpath%2Fsecurity-plus-sy0-701%3Fupgraded%3D1"
    );
    // The flag stays on the address: a reload says the same thing.
    expect(window.location.search).toBe("?upgraded=1");
    expect(landed()).toEqual([]);
  });

  it("lets someone who is not signed in carry on as a visitor", async () => {
    auth.session = null;
    server.progress = null;
    renderPath();
    const onward = await screen.findByRole("button", { name: "Continue without signing in" });
    onward.focus();
    fireEvent.click(onward);
    expect(await screen.findByRole("button", { name: /Right answer/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your payment was received." })).toBeNull();
    expect(window.location.search).toBe("");
    // The button that was pressed has gone with its screen. The question that
    // takes its place follows a press, so it takes the focus and is read.
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Prompt a|1.1|w1" }));
  });

  it("gives the focus to the title of the home screen when a visitor who has finished the introductory questions carries on without signing in", async () => {
    auth.session = null;
    server.progress = null;
    localStorage.setItem(
      "cb_path_security-plus-sy0-701",
      JSON.stringify({ v: 1, owner: null, progress: done(["warmup"]) })
    );
    renderPath();
    const onward = await screen.findByRole("button", { name: "Continue without signing in" });
    onward.focus();
    fireEvent.click(onward);
    const title = await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" });
    await waitFor(() => expect(document.activeElement).toBe(title));
  });

  // A full page load is hydrated from the server's HTML, which is drawn without
  // the address (the inline script holds the stage meanwhile). The flag is read
  // once the page runs, and the wait goes on after it comes off the address.
  it("waits for the confirmation on a page hydrated from the server's HTML, with nothing mismatched", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recovered = vi.fn();
    const page = (
      <PathApp cert="security-plus-sy0-701" structure={structure} plan={plan} warmup={warmup} questionCount={842} free={free} />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(page);
    document.body.appendChild(container);
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      expect(within(container).getByRole("heading", { level: 2, name: "Prompt a|1.1|w1" })).toBeInTheDocument();
      root = await act(async () => hydrateRoot(container, page, { onRecoverableError: recovered }));
      expect(await within(container).findByRole("button", { name: "Account" })).toBeInTheDocument();
      expect(
        within(container).getByRole("heading", { level: 1, name: "Your Security+ study path is being opened." })
      ).toBeInTheDocument();
      expect(window.location.search).toBe("");
      expect(landed()).toEqual([]);
      expect(recovered).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await act(async () => root?.unmount());
      errors.mockRestore();
      container.remove();
    }
  });

  it("takes the flag off the address for someone who is signed in, so that a reload is an ordinary visit", async () => {
    renderPath();
    // The account control appears once the page knows who is here.
    await screen.findByRole("button", { name: "Account" });
    expect(screen.getByRole("heading", { level: 1, name: "Your Security+ study path is being opened." })).toBeInTheDocument();
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

  const renderLabs = (freeParts: FreeOnPublicPages = free) =>
    render(
      <PathApp
        cert="security-plus-sy0-701"
        structure={labStructure}
        plan={labPlan}
        warmup={warmup}
        questionCount={842}
        free={freeParts}
      />
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

  // The home page and the pricing page say that one practice exam and 12 labs
  // are free. The outline used to call all of them "Included with Pro".
  it("shows a free account which labs are free and which Pro includes, and leads to the free ones", async () => {
    server.progress = done(["warmup"]);
    // The first domain's lab is one of the labs on the exam's public page of labs.
    renderLabs({ ...free, labIds: ["lab-1.0"] });
    await screen.findByRole("button", { name: /Continue/ });
    expect(outlineRow("Lab, Lab for domain 1.0")).toHaveTextContent("Lab, Lab for domain 1.0, Free");
    expect(outlineRow("Lab, Lab for domain 2.0")).toHaveTextContent("Lab, Lab for domain 2.0, Included with Pro");
    // Fewer than the usual number of free labs here, so the sentence under the outline states this exam's own count.
    expect(
      screen.getByText("One practice exam and 1 lab are free. Further labs and practice exams are included with Pro.")
    ).toBeInTheDocument();

    // The free lab's row leads to the public page where it is free.
    fireEvent.click(within(outlineRow("Lab, Lab for domain 1.0")).getByRole("button"));
    const freeLab = screen.getByRole("region", { name: "Lab for domain 1.0" });
    expect(freeLab).toHaveTextContent("It is free, and it opens on the page of free Security+ labs.");
    expect(freeLab).not.toHaveTextContent("included with Pro");
    // What the lab is, in CertBench's own terms, and nothing about how the exam's questions work.
    expect(freeLab).toHaveTextContent(
      "This hands-on lab is CertBench's practice for the exam's performance-based questions, and it is graded with partial credit."
    );
    expect(freeLab).not.toHaveTextContent(/works? like/);
    expect(within(freeLab).getByRole("link", { name: "Open the free labs" })).toHaveAttribute(
      "href",
      "/security-plus-pbq-examples"
    );
    expect(track).toHaveBeenCalledWith("path_map_tile_opened", {
      cert: "security-plus-sy0-701",
      tile: "lab:1.0",
      state: "free",
    });

    // The other lab is included with Pro. Before the checkpoint there is no offer to lead to.
    fireEvent.click(within(outlineRow("Lab, Lab for domain 2.0")).getByRole("button"));
    const proLab = screen.getByRole("region", { name: "Lab for domain 2.0" });
    expect(proLab).toHaveTextContent("It is included with Pro.");
    expect(within(proLab).queryByRole("button")).toBeNull();
    expect(within(proLab).queryByRole("link")).toBeNull();
  });

  it("says that the exam's 12 free labs are free, in the outline's own sentence", async () => {
    server.progress = done(["warmup"]);
    renderLabs({ ...free, labIds: Array.from({ length: 12 }, (_, i) => (i === 0 ? "lab-1.0" : `other-${i}`)) });
    await screen.findByRole("button", { name: /Continue/ });
    expect(
      screen.getByText("One practice exam and 12 labs are free. Further labs and practice exams are included with Pro.")
    ).toBeInTheDocument();
  });

  it("claims no free labs for an exam that has no public page of labs", async () => {
    server.progress = done(["warmup"]);
    // As for Security+ SY0-801 today: a free practice exam, and no page of free labs.
    renderLabs({ examHref: "/security-plus-sy0-801-practice-test", labsHref: null, labIds: [] });
    await screen.findByRole("button", { name: /Continue/ });
    expect(outlineRow("Lab, Lab for domain 1.0")).toHaveTextContent("Included with Pro");
    expect(
      screen.getByText("One practice exam is free. Hands-on labs and further practice exams are included with Pro.")
    ).toBeInTheDocument();
  });

  it("does not offer a visitor without an account to save their progress under a row that an account does not open", async () => {
    auth.session = null;
    localStorage.setItem(
      "cb_path_security-plus-sy0-701",
      JSON.stringify({ v: 1, owner: null, progress: done(["warmup"]) })
    );
    renderLabs({ ...free, labIds: ["lab-1.0"] });
    await screen.findByRole("button", { name: "Save and continue" });

    // A lab that Pro includes: no "Save my progress", which would not open it.
    fireEvent.click(within(outlineRow("Lab, Lab for domain 2.0")).getByRole("button"));
    expect(within(screen.getByRole("region", { name: "Lab for domain 2.0" })).queryByRole("button")).toBeNull();

    // An objective past the readiness checkpoint: said plainly, with nothing to press.
    fireEvent.click(within(outlineRow("2.1")).getByRole("button"));
    const later = screen.getByRole("region", { name: "Objective 2.1" });
    expect(later).toHaveTextContent(
      "This objective is taught later in the study path. The steps after the readiness checkpoint are included with Pro."
    );
    expect(within(later).queryByRole("button")).toBeNull();

    // The first study step is what a free account opens: its row offers to save, and leads to the form.
    fireEvent.click(within(outlineRow("1.1")).getByRole("button"));
    const first = screen.getByRole("region", { name: "Objective 1.1" });
    expect(first).toHaveTextContent(
      "A free account saves your progress and opens your first study step and the readiness checkpoint."
    );
    fireEvent.click(within(first).getByRole("button", { name: "Save my progress" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Email address"));
    expect(track).toHaveBeenCalledWith("path_map_action", { cert: "security-plus-sy0-701", tile: "1.1", action: "save" });
  });

  it("plays a lab in place and counts it once it is graded", async () => {
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(labPlan.stops.slice(0, lab1).map((s) => s.id), { goal });
    renderLabs();
    expect(await screen.findByText(/Your next step is a hands-on lab of about 6 minutes\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // The lab's screen: its title names the domain, and the lab's own name is the heading under it.
    expect(await screen.findByRole("heading", { level: 1, name: /^Hands-on lab for domain 1/ })).toBeInTheDocument();
    // (The lab's player is fetched when a lab opens, so it arrives a moment after its screen.)
    expect(await screen.findByRole("heading", { level: 2, name: "Lab for domain 1.0" })).toBeInTheDocument();
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
    // On the study path the exam is a screen of its own: the line that names it
    // is the screen's title, and the question is the heading under it.
    expect(await screen.findByRole("heading", { level: 2, name: `Prompt q|1.1|${uuid(1)}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "SY0-701 practice exam" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
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

    // The screen before the exam has its own title.
    expect(await screen.findByRole("heading", { level: 1, name: "Take a full-length practice exam." })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
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
    expect(screen.getByTestId("score")).toHaveTextContent("75%");
    // The result is the title of its screen on the study path, and the list of answers is the heading under it.
    expect(
      screen.getByRole("heading", { level: 1, name: "You met the readiness target, 17 points above your checkpoint." })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Your answers" })).toBeInTheDocument();
    // The filter of the list is two buttons in a named group, of which one is pressed: they are not tabs.
    const filter = screen.getByRole("group", { name: "Which answers to show" });
    expect(within(filter).getByRole("button", { name: "Missed (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(within(filter).getByRole("button", { name: "All (3)" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText(`Prompt q|1.2|${uuid(3)}`)).toBeInTheDocument();
    expect(screen.queryByText(`Prompt q|1.1|${uuid(1)}`)).toBeNull();
    fireEvent.click(within(filter).getByRole("button", { name: "All (3)" }));
    expect(within(filter).getByRole("button", { name: "All (3)" })).toHaveAttribute("aria-pressed", "true");
    expect(within(filter).getByRole("button", { name: "Missed (1)" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(`Prompt q|1.1|${uuid(1)}`)).toBeInTheDocument();
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
    fireEvent.click(headerLink());
    expect(await screen.findByText(/Your last practice exam result was 75%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review its answers" }));
    expect(await screen.findByRole("button", { name: "Missed (1)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("tells a free account that one practice exam is free, and leads to it on the exam's public page", async () => {
    server.access = "free";
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    const row = outlineRow("Exam, Full-length timed practice exam");
    expect(row).toHaveTextContent("Exam, Full-length timed practice exam, One practice exam is free.");
    expect(row).not.toHaveTextContent("Included with Pro");
    // The practice exams on the study path itself are included with Pro.
    expect(screen.queryByRole("button", { name: "Start: Practice exam" })).toBeNull();
    // An exam with no labs on its study path: the sentence under the outline names none.
    expect(screen.getByText("One practice exam is free. Further practice exams are included with Pro.")).toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button"));
    const detail = screen.getByRole("region", { name: "Practice exam" });
    expect(detail).toHaveTextContent(
      "The practice exam has 90 questions and a time limit of 90 minutes. One practice exam is free, and it opens on its own page. Further practice exams are included with Pro."
    );
    expect(within(detail).getByRole("link", { name: "Open the free practice exam" })).toHaveAttribute(
      "href",
      "/security-plus-practice-test"
    );
    // The row does not offer to save progress or to see an offer: neither would open it.
    expect(within(detail).queryByRole("button")).toBeNull();
    expect(track).toHaveBeenCalledWith("path_map_tile_opened", {
      cert: "security-plus-sy0-701",
      tile: "rehearsal",
      state: "free",
    });
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

  it("brings back the practice exam of the account that signs in on the page, and none before", async () => {
    // A visitor, on a device where an account left a practice exam mid-way.
    auth.session = null;
    server.progress = null;
    localStorage.setItem(runKey, storedRun({ owner: "old-user", picks: [0, null, null], i: 1 }));
    renderPath();
    await screen.findByText("Prompt a|1.1|w1");
    for (let i = 0; i < 3; i++) await answer();
    await screen.findByText(/You have completed the introductory questions/i);
    expect(screen.queryByText("You have a practice exam in progress.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "sam@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "long-enough-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in and continue" }));
    // The step that the card named is played first. The practice exam waits on the map.
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
    fireEvent.click(headerLink());
    expect(await screen.findByText("You have a practice exam in progress.")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 questions answered")).toBeInTheDocument();
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
    // The study path goes on to review, which has one name everywhere.
    expect(await screen.findByText("You have completed the study path. Your next step is a review.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Review" })).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { level: 1, name: "Review" })).toBeInTheDocument();
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
    // A review has one name: the screen's title here, the button that opened it, and the step that ends the study path.
    expect(await screen.findByRole("heading", { level: 1, name: "Review" })).toBeInTheDocument();

    await answer(true);
    await answer(true);
    await answer(false);
    expect(await screen.findByText("You have completed this review.")).toBeInTheDocument();
    expect(screen.getByText(/^1 more question remains to review\. Questions that you answered correctly will be asked once more in a few days/)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "path_stop_completed",
      expect.objectContaining({ stop: "review", kind: "review", focus: "misses", correct: 2, total: 3 })
    );
    // The outline counts as the sentence above it does. These objectives' own
    // steps have not been taken, so an objective answered correctly is
    // "Started", never "Complete", and the one with a miss is to review.
    expect(outlineRow("2.1")).toHaveTextContent("2.1 Objective 2.1, Started");
    expect(outlineRow("1.2")).toHaveTextContent("1.2 Objective 1.2, Started");
    // The objective whose own step comes next says so, whatever other questions have touched it.
    expect(outlineRow("1.1")).toHaveTextContent("1.1 Objective 1.1, Next step");
    // The review moved no objective from one standing to another, so the line
    // above the outline gives the running count alone.
    expect(screen.getByText("In all, you have started 3 of 6 objectives.")).toBeInTheDocument();

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
      <PathApp
        cert="security-plus-sy0-701"
        structure={libStructure}
        plan={libPlan}
        warmup={warmup}
        questionCount={842}
        free={free}
      />
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
    // What the labs are, in CertBench's own terms.
    expect(
      screen.getByText("There are 4 labs. They are CertBench's practice for the exam's performance-based questions.")
    ).toBeInTheDocument();
    await openLibrary();
    expect(track).toHaveBeenCalledWith("path_labs_viewed", { cert: "security-plus-sy0-701" });
    expect(screen.getByRole("heading", { name: "Domain 1: Domain 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Domain 2: Domain 2" })).toBeInTheDocument();
    expect(screen.getAllByText(/This lab ends the domain on your study path\.$/)).toHaveLength(2);
    expect(screen.getByText("Matching drill, 3 minutes.")).toBeInTheDocument();
    // A row is named by the words printed on it, in the order they are printed: it has no label of its own.
    const row = screen.getByRole("button", { name: /Port matching/ });
    expect(row).not.toHaveAttribute("aria-label");
    expect(row.textContent).toBe("Port matching. Matching drill, 3 minutes.");
    // The list's title is the screen's title, and each domain is a heading under it.
    expect(screen.getByRole("heading", { level: 1, name: "Hands-on labs for Security+" })).toBeInTheDocument();
    expect(screen.getByText("0 of 2 complete.", { selector: "section:first-of-type p" })).toBeInTheDocument();
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
    // A topology lab is called a network diagram, as on the public lab pages.
    expect(await screen.findByText("Your next lab. Network diagram, 6 minutes.")).toBeInTheDocument();
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

  // A simulation, a topology and a threat hunt each have a large player. It is
  // fetched beside the lab's own screen, not after it: the page starts the fetch
  // when a lab's row is hovered or takes the focus, and as a lab is about to open.
  describe("fetching a lab's player early", () => {
    it("starts when a lab's row in the list is hovered or takes the focus, with the lab's kind", async () => {
      server.progress = done(["warmup"], { goal });
      renderLibrary();
      await openLibrary();
      expect(preloadLab).not.toHaveBeenCalled();

      fireEvent.pointerEnter(screen.getByRole("button", { name: /Lab for domain 1\.0/ }));
      expect(preloadLab).toHaveBeenLastCalledWith("simulation");
      fireEvent.focus(screen.getByRole("button", { name: /Lab for domain 2\.0/ }));
      expect(preloadLab).toHaveBeenLastCalledWith("topology");
      // A drill's kind is passed on in the same way: the loader itself knows that a drill needs no fetch.
      fireEvent.pointerEnter(screen.getByRole("button", { name: /Port matching/ }));
      expect(preloadLab).toHaveBeenLastCalledWith("matching");
      expect(preloadLab).toHaveBeenCalledTimes(3);
    });

    it("starts as a lab from the list is about to open, before the server has answered with the lab", async () => {
      server.progress = done(["warmup"], { goal });
      let send: () => void = () => {};
      server.labHandler = (input) =>
        new Promise((resolve) => {
          send = () => resolve({ lab: { type: "topology", id: input.id, title: "Lab for domain 2.0", domain_number: "2.0" } });
        });
      renderLibrary();
      await openLibrary();
      fireEvent.click(screen.getByRole("button", { name: /Lab for domain 2\.0/ }));
      // The lab has been asked for and has not arrived; its player is on the way already.
      expect(await screen.findByText("The lab is opening.")).toBeInTheDocument();
      expect(preloadLab).toHaveBeenCalledWith("topology");
      await act(async () => send());
      expect(await screen.findByRole("heading", { level: 2, name: "Lab for domain 2.0" })).toBeInTheDocument();
    });

    it("starts from a lab's row in the course outline, for a learner whom the row leads to the lab", async () => {
      server.progress = done(["warmup"], { goal });
      renderLibrary();
      await screen.findByRole("button", { name: "Open: Hands-on labs" });
      fireEvent.pointerEnter(within(outlineRow("Lab, Lab for domain 1.0")).getByRole("button"));
      expect(preloadLab).toHaveBeenLastCalledWith("simulation");
      fireEvent.focus(within(outlineRow("Lab, Lab for domain 2.0")).getByRole("button"));
      expect(preloadLab).toHaveBeenLastCalledWith("topology");
      // An objective's row opens no lab.
      fireEvent.pointerEnter(within(outlineRow("1.2")).getByRole("button"));
      expect(preloadLab).toHaveBeenCalledTimes(2);
    });

    it("fetches nothing from the outline for an account without Pro, whose lab rows lead to a public page or to the offer", async () => {
      server.access = "free";
      server.progress = done(["warmup"], { goal });
      renderLibrary();
      await screen.findByRole("button", { name: /^Continue/ });
      fireEvent.pointerEnter(within(outlineRow("Lab, Lab for domain 1.0")).getByRole("button"));
      fireEvent.focus(within(outlineRow("Lab, Lab for domain 2.0")).getByRole("button"));
      expect(preloadLab).not.toHaveBeenCalled();
    });

    it("starts as the lab that is the next step is about to open, before the server has answered", async () => {
      const lab1 = libPlan.stops.findIndex((s) => s.id === "lab1");
      server.progress = done(libPlan.stops.slice(0, lab1).map((s) => s.id), { goal });
      let send: () => void = () => {};
      server.stopHandler = (input) =>
        new Promise((resolve) => {
          send = () =>
            resolve({
              stop: libPlan.stops[input.index],
              reps: [],
              lab: { type: "simulation", id: "lab-1.0", title: "Lab for domain 1.0", domain_number: "1.0" },
            });
        });
      renderLibrary();
      expect(await screen.findByText(/Your next step is a hands-on lab/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
      // The exam's list of labs says what kind the domain's lab is, so nothing waits for the server.
      expect(await screen.findByText("Your next step is being prepared.")).toBeInTheDocument();
      expect(preloadLab).toHaveBeenCalledWith("simulation");
      expect(preloadLab).toHaveBeenCalledTimes(1);

      // When the lab arrives, the fetch is asked for again by the lab's own kind. It is the same fetch.
      await act(async () => send());
      expect(await screen.findByRole("heading", { level: 2, name: "Lab for domain 1.0" })).toBeInTheDocument();
      expect(preloadLab).toHaveBeenLastCalledWith("simulation");
    });
  });

  it("keeps the library for Pro, and names every lab in a free account's offer", async () => {
    server.access = "free";
    server.progress = done(
      libPlan.stops.slice(0, libPlan.freeThrough + 1).map((s) => s.id),
      { goal, checkpoint: { score: 60, at: 1, domains: [] } }
    );
    renderLibrary();
    expect(
      await screen.findByText("All 4 hands-on labs, CertBench's practice for the exam's performance-based questions")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open: Hands-on labs" })).toBeNull();
  });
});

describe("the account menu", () => {
  it("keeps signing out a step away, and says which account the path saves to", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    renderPath();
    // A button that shows and hides a small panel: a disclosure, not a menu.
    const account = await screen.findByRole("button", { name: "Account" });
    expect(account).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    fireEvent.click(account);
    expect(account).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Signed in as/)).toHaveTextContent("Signed in as u1@example.com");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan and billing" })).toHaveAttribute("href", "/upgrade");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(account).toHaveAttribute("aria-expanded", "false");
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

  // The page decides what the account's answer changes once the progress hook
  // has done its own work for it, so the page's events come after the hook's.
  it("records the link to the account before the checkpoint that the exam becomes", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    // Work begun on this device before the account existed: the account takes it as it opens.
    localStorage.setItem(
      "cb_path_security-plus-sy0-701",
      JSON.stringify({ v: 1, owner: null, progress: recordRep(EMPTY_PATH_PROGRESS, "a|1.1|w1", true, 1) })
    );
    finishedExam();
    renderPath();
    expect(await screen.findByText("Security+ practice exam")).toBeInTheDocument();
    const events = track.mock.calls.map(([name]) => name as string);
    expect(events).toContain("path_account_linked");
    expect(events).toContain("path_checkpoint_completed");
    expect(events.indexOf("path_account_linked")).toBeLessThan(events.indexOf("path_checkpoint_completed"));
  });

  // The import and the first unlock both decide what a visit opens on, in one
  // pass. The import's reveal stands; the unlock moment waits for a later visit.
  it("opens on its reveal for a Pro member's first visit on the device, not on the unlock moment", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    server.progress = done(["warmup"]);
    finishedExam();
    const first = renderPath();
    expect(await screen.findByText("Security+ practice exam")).toBeInTheDocument();
    await act(async () => {});
    expect(screen.getByText("Security+ practice exam")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your full Security+ study path is now open." })).toBeNull();
    expect(track).not.toHaveBeenCalledWith("path_unlock_viewed", expect.anything());
    first.unmount();

    // The next visit opens with what Pro opened.
    server.progress = { ...done(["warmup", "checkpoint"]), checkpoint: { score: 67, at: 1, domains: [] } };
    renderPath();
    expect(await screen.findByRole("heading", { name: "Your full Security+ study path is now open." })).toBeInTheDocument();
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
      // The exam carries the account's name from now on, so that the public
      // page shows it to that account alone (PracticeExam).
      expect(JSON.parse(localStorage.getItem(KEY)!).claimedBy).toBe("u1");
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

    // The study path took the exam for u1 before it began to stamp the exams it
    // takes. The public page then showed it to u2, the next account to sign in,
    // and stamped it with u2's name.
    it("leaves an exam that the device gave to another account where it is, whoever claimed it afterwards", async () => {
      const at = Date.now() - 600_000;
      finishedExam(at, { claimedBy: "u2" });
      localStorage.setItem(TAKEN, JSON.stringify({ at, by: "u1" }));
      auth.session = { user: { id: "u2", email: "u2@example.com" } };
      renderPath();
      await screen.findByRole("button", { name: /^Continue/ });
      await act(async () => {});
      expect(imported()).toBe(false);
      expect(screen.queryByText("Security+ practice exam")).toBeNull();
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

describe("recording that a visitor has started the study path", () => {
  const CERT = "security-plus-sy0-701";
  const key = `cb_path_${CERT}`;
  /** Every `path_started` that the page has recorded. */
  const starts = () => track.mock.calls.filter(([name]) => name === "path_started");

  it("records it once on a fresh device, at the first answer, as before", async () => {
    renderPath();
    await act(async () => {});
    // Opening the page is not a start: the first answer is.
    expect(starts()).toHaveLength(0);
    await answer(true);
    expect(starts()).toEqual([["path_started", { cert: CERT }]]);
    await answer(false);
    expect(starts()).toHaveLength(1);
  });

  it("records it once for a copy that the home page's sample questions began: at the first answer here, and not at the second", async () => {
    // The home page kept a sample question's answer as the first answer of the
    // device's copy of the study path, and left its mark (SampleQuestions).
    localStorage.setItem(
      key,
      JSON.stringify({ v: 1, owner: null, progress: recordRep(EMPTY_PATH_PROGRESS, "a|2.1|w2", true, 1) })
    );
    oweStartEvent(CERT);
    renderPath();
    expect(await screen.findByText("Prompt a|1.1|w1")).toBeInTheDocument();
    await act(async () => {});
    // The copy has started already, and opening the page records nothing.
    expect(starts()).toHaveLength(0);

    await answer(true);
    expect(starts()).toEqual([["path_started", { cert: CERT }]]);
    // The mark is taken with the answer it was left for.
    expect(localStorage.getItem(`cb_path_start_owed_${CERT}`)).toBeNull();

    // The second answer on this page (the question that the home page asked is passed over).
    expect(await screen.findByText("Prompt a|1.2|w3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Right answer/ }));
    expect(await screen.findByText(/^Correct\./)).toBeInTheDocument();
    expect(starts()).toHaveLength(1);
  });

  // The home page's samples are SY0-701's. A visitor who answered one and then
  // opens the SY0-801 study path arrives with a copy that the first visit's
  // carry has begun.
  it("records it once on the newer exam version when the home page's samples began the earlier version's copy", async () => {
    localStorage.setItem(
      key,
      JSON.stringify({ v: 1, owner: null, progress: recordRep(EMPTY_PATH_PROGRESS, "a|1.2|w3", true, 1) })
    );
    oweStartEvent(CERT);
    const NEWER = "security-plus-sy0-801";
    const newer: PathStructure = { ...structure, certSlug: NEWER, examCode: "SY0-801" };
    const newerPlan = buildPlan(newer);
    render(
      <PathApp
        cert={NEWER}
        structure={newer}
        plan={newerPlan}
        warmup={{ stop: newerPlan.stops[0], reps: [rep("a|3.2|w1", "1.1"), rep("a|1.1|w3", "1.1"), rep("a|1.1|w4", "1.1")] }}
        questionCount={900}
        free={free}
      />
    );
    // The carried answer is passed over: the questions continue from the first one without an answer.
    expect(await screen.findByText(/You answered 1 of the 3 introductory questions earlier/)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_version_carried", expect.objectContaining({ to: NEWER, source: "device" }));
    expect(starts()).toHaveLength(0);
    await answer(true);
    expect(starts()).toEqual([["path_started", { cert: NEWER }]]);
    fireEvent.click(await screen.findByRole("button", { name: /Right answer/ }));
    expect(await screen.findByText(/^Correct\./)).toBeInTheDocument();
    expect(starts()).toHaveLength(1);
  });

  it("records it once for a copy that a public page's quick round began", async () => {
    const round = render(
      <QuickRound
        cert={CERT}
        stopId="1.1"
        examName="Security+"
        structure={structure}
        reps={[rep("a|1.1|q1", "1.1"), rep("a|1.1|q2", "1.1")]}
        label="Objective 1.1: Objective 1.1"
        surface="objective_page"
      />
    );
    for (const last of [false, true]) {
      fireEvent.click(screen.getByRole("button", { name: /Right answer/ }));
      fireEvent.click(screen.getByRole("button", { name: last ? /View my result/ : /^Continue/ }));
    }
    round.unmount();
    track.mockClear();

    renderPath();
    expect(await screen.findByText("Prompt a|1.1|w1")).toBeInTheDocument();
    await act(async () => {});
    expect(starts()).toHaveLength(0);
    await answer(true);
    expect(starts()).toEqual([["path_started", { cert: CERT }]]);
    await answer(true);
    expect(starts()).toHaveLength(1);
  });

  // A member on a device that held no copy answered the home page's samples
  // signed in. The samples began a copy that is the member's own, and left the
  // start owed, because the home page cannot know what the account holds.
  const memberBeganOnHome = () => {
    localStorage.setItem(
      key,
      JSON.stringify({ v: 1, owner: "u1", progress: recordRep(EMPTY_PATH_PROGRESS, "a|2.1|w2", true, 1) })
    );
    oweStartEvent(CERT);
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
  };

  it("records no start and no link for a member whose study path began long before the home page's samples", async () => {
    memberBeganOnHome();
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    await screen.findByRole("button", { name: /Right answer/ });
    await answer(true);
    expect(starts()).toHaveLength(0);
    // The mark is taken all the same, so that it is not left for a later answer.
    expect(localStorage.getItem(`cb_path_start_owed_${CERT}`)).toBeNull();
    expect(track).not.toHaveBeenCalledWith("path_account_linked", expect.anything());
  });

  it("records the start once for a new account whose copy the home page's samples began, and no link", async () => {
    memberBeganOnHome();
    server.stopHandler = () => ({ stop: plan.stops[0], reps: warmup.reps });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    await screen.findByText("Prompt a|1.1|w1");
    await answer(true);
    expect(starts()).toEqual([["path_started", { cert: CERT }]]);
    fireEvent.click(await screen.findByRole("button", { name: /Right answer/ }));
    expect(await screen.findByText(/^Correct\./)).toBeInTheDocument();
    expect(starts()).toHaveLength(1);
    expect(track).not.toHaveBeenCalledWith("path_account_linked", expect.anything());
  });

  /** A practice exam that this device finished on the exam's public page, signed out. */
  function publicExamOnDevice() {
    const uuid = (i: number) => `${String(i).padStart(8, "0")}-2222-4222-8222-222222222222`;
    const examReps = Array.from({ length: 12 }, (_, i) => rep(`q|1.1|${uuid(i)}`, "1.1", "exam"));
    const at = Date.now() - 600_000;
    localStorage.setItem(
      pathRehearsalKey(`${CERT}-practice-test`),
      JSON.stringify({
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

  // A visitor took the free practice exam on its public page and made an account
  // at its score. The study path takes the exam as its checkpoint, so the copy
  // has started before anything is answered here: the start is owed to the
  // first answer on this page.
  it("records it once for a new account whose study path began with the public practice exam", async () => {
    publicExamOnDevice();
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    renderPath();
    // The page opens on the exam's result, and nothing is answered yet.
    expect(await screen.findByText("Security+ practice exam")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("path_checkpoint_completed", expect.objectContaining({ source: "practice_exam" }));
    expect(starts()).toHaveLength(0);

    // Home, and on to the next step: its first answer is the first on this page.
    fireEvent.click(headerLink());
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    await screen.findByRole("button", { name: /Right answer/ });
    await answer(true);
    expect(starts()).toEqual([["path_started", { cert: CERT }]]);
    expect(localStorage.getItem(`cb_path_start_owed_${CERT}`)).toBeNull();
    await screen.findByRole("button", { name: /Right answer/ });
    await answer(true);
    expect(starts()).toHaveLength(1);
  });

  it("owes no start for an exam carried into a study path that had begun already", async () => {
    publicExamOnDevice();
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    renderPath();
    expect(await screen.findByText("Security+ practice exam")).toBeInTheDocument();
    expect(localStorage.getItem(`cb_path_start_owed_${CERT}`)).toBeNull();
    expect(starts()).toHaveLength(0);
  });

  it("records nothing more for a copy that was begun on this page on an earlier visit", async () => {
    const first = renderPath();
    await act(async () => {});
    await answer(true);
    expect(starts()).toHaveLength(1);
    // The visitor leaves, and returns another day.
    first.unmount();
    track.mockClear();

    renderPath();
    expect(await screen.findByText("Prompt a|2.1|w2")).toBeInTheDocument();
    await answer(true);
    await answer(true);
    expect(await screen.findByText(/You have completed the introductory questions/i)).toBeInTheDocument();
    expect(starts()).toHaveLength(0);
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
    // The first is a status, so that it is announced, and the title of the held
    // stage: while it is shown there is nothing else on the screen.
    const loading = screen.getByText("Your study path is loading.");
    expect(loading.tagName).toBe("H1");
    expect(loading.parentElement).toHaveAttribute("role", "status");
    expect(loading.parentElement).toHaveClass("path-wait");
    // The second is an alert, for a page whose scripts never start. Nothing else is on a
    // held stage then, so there it is the screen's title; under a first visit's question,
    // which has a title of its own, it is a paragraph. The same words stand in both, and
    // the style rules show one of them, by the mark that the inline script leaves on <html>.
    const late = document.querySelector<HTMLElement>(".path-stage > .path-late")!;
    expect(late).toHaveAttribute("role", "alert");
    const said = "Your study path could not be loaded. Please check your connection and reload the page.";
    const [asTitle, asParagraph] = [...late.children] as HTMLElement[];
    expect(late.children).toHaveLength(2);
    expect(asTitle.tagName).toBe("H1");
    expect(asTitle).toHaveTextContent(said);
    expect(asTitle).toHaveClass("hidden", "[html[data-path-returning]_&]:block");
    expect(asParagraph.tagName).toBe("P");
    expect(asParagraph).toHaveTextContent(said);
    expect(asParagraph).toHaveClass("[html[data-path-returning]_&]:hidden");
    expect(asParagraph).not.toHaveClass("hidden");
    // An empty address is this page's own address: the link reloads it without any script.
    const links = within(late).getAllByText("reload the page");
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.closest("a")).toHaveAttribute("href", "");

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

  /**
   * The screen of a learner whose account was not reached: the notice, and
   * their own home screen under it. The notice arrives a moment before the home
   * screen takes the place of the first visit's question, so both are waited for.
   */
  async function unreachedHome() {
    expect(await screen.findByText(NOT_REACHED)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" })).toBeInTheDocument();
  }

  it("offers nothing and locks nothing, says what is shown, and asks again on request", async () => {
    pastCheckpoint();
    renderPath();
    await unreachedHome();
    // A member must not be asked to buy what they have: no offer and no lock,
    // and the way on is a plain Continue that asks the server.
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
    expect(screen.queryByText(/included with Pro/i)).toBeNull();
    expect(screen.getByRole("button", { name: /^Continue/ })).toBeInTheDocument();

    // The account answers: a member.
    server.readError = null;
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    const again = screen.getByRole("button", { name: "Try again" });
    again.focus();
    fireEvent.click(again);
    await waitFor(() => expect(screen.queryByText(NOT_REACHED)).toBeNull());
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
    expect(await screen.findByRole("button", { name: "Start: Practice exam" })).toBeInTheDocument();
    // The notice has gone, and the button that was pressed with it. The focus
    // that it held is not left on nothing: it is on the title of the screen.
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: "Your Security+ study path" }));
  });

  it("leaves the focus where it is when the account answers by itself, with nobody having asked for it", async () => {
    pastCheckpoint();
    renderPath();
    await unreachedHome();
    // Nobody pressed "Try again": the page asks again by itself when the connection returns.
    server.readError = null;
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(screen.queryByText(NOT_REACHED)).toBeNull());
    expect(document.activeElement).toBe(document.body);
  });

  it("makes the offer once the server has said that the account does not have Pro", async () => {
    pastCheckpoint();
    server.stopHandler = () => new ApiError("quota_exceeded", "The rest of the study path is included with Pro.");
    renderPath();
    await unreachedHome();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(await screen.findByText("Continue your study path with Pro")).toBeInTheDocument();
    // The account itself has still not been read, and the page still says so.
    expect(screen.getByText(NOT_REACHED)).toBeInTheDocument();
  });

  it("shows one way to try again, in the offer, when the offer has no account to sell to", async () => {
    pastCheckpoint();
    server.stopHandler = () => new ApiError("quota_exceeded", "The rest of the study path is included with Pro.");
    renderPath();
    await unreachedHome();
    // On the home screen there is no offer yet, and the notice carries the button.
    const notice = screen.getByText(NOT_REACHED).closest("p")!;
    expect(within(notice).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(1);

    // The server refuses the step: the checkpoint's result is shown with the offer under it.
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    const heading = await screen.findByRole("heading", { name: "Continue your study path with Pro" });
    const offer = heading.closest<HTMLElement>(".glass")!;
    // The offer says that the account could not be reached and offers to try
    // again in place of its plans. The notice keeps its sentence and gives up
    // its button: one "Try again" on the screen, not two.
    expect(within(offer).getByText("Your account could not be reached.")).toBeInTheDocument();
    expect(screen.getByText(NOT_REACHED)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(1);
    expect(within(offer).getByRole("button", { name: "Try again" })).toBeInTheDocument();

    // The same on the home screen, where the offer now stands in place of the way on.
    fireEvent.click(screen.getByRole("button", { name: "Return to the study path" }));
    expect(await screen.findByRole("heading", { name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continue your study path with Pro" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(1);

    // That one button asks for the account again. It answers: a free account,
    // so the notice goes and the offer shows its plans.
    server.readError = null;
    const again = screen.getByRole("button", { name: "Try again" });
    again.focus();
    fireEvent.click(again);
    await waitFor(() => expect(screen.queryByText(NOT_REACHED)).toBeNull());
    expect(await screen.findByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    // The plans stand where the button was. The focus that it held moves to
    // the offer's title, so that the offer is read from its top.
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Continue your study path with Pro" }));
  });

  it("moves the focus to the title of the screen when the account answers that the learner has Pro, and the offer gives way to the way on", async () => {
    pastCheckpoint();
    server.stopHandler = () => new ApiError("quota_exceeded", "The rest of the study path is included with Pro.");
    renderPath();
    await unreachedHome();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await screen.findByRole("heading", { name: "Continue your study path with Pro" });

    // The account answers after all: a member, on a device that has shown what Pro opened already.
    server.readError = null;
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    const again = screen.getByRole("button", { name: "Try again" });
    again.focus();
    fireEvent.click(again);
    await waitFor(() => expect(screen.queryByText(NOT_REACHED)).toBeNull());
    // Nothing is sold to a member: the offer has gone, and the way on stands in its place.
    await waitFor(() => expect(screen.queryByText("Continue your study path with Pro")).toBeNull());
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent("You are making good progress.");
    expect(document.activeElement).toBe(title);
  });

  it("shows one way to try again on the screen of a step that could not be loaded, and it asks for the account again as well", async () => {
    const LOST = "The connection was lost. Please check your connection and try again.";
    /** How many times the page asked for this account's progress and access. */
    const accountReads = () =>
      server.calls.filter((c) => c.path === "/api/path/progress" && !("progress" in (c.input as object))).length;
    pastCheckpoint();
    // The connection is down: neither the account nor the next step can be had.
    server.stopHandler = () => new ApiError("internal", LOST);
    renderPath();
    await unreachedHome();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(await screen.findByRole("heading", { level: 1, name: LOST })).toBeInTheDocument();
    // The notice keeps its sentence. The screen's own button is the one "Try again".
    expect(screen.getByText(NOT_REACHED)).toBeInTheDocument();
    const again = screen.getAllByRole("button", { name: "Try again" });
    expect(again).toHaveLength(1);
    expect(again[0].closest(".path-stage-body")).not.toBeNull();

    // The connection is back. One press asks for the account again and loads the step again.
    server.readError = null;
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.stopHandler = (input) => stopReply(input.index);
    const before = accountReads();
    fireEvent.click(again[0]);
    await waitFor(() => expect(accountReads()).toBe(before + 1));
    await waitFor(() => expect(screen.queryByText(NOT_REACHED)).toBeNull());
    expect(await screen.findByText(/^Prompt a\|/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("asks only for the step again when the account was reached and a step could not be loaded", async () => {
    server.readError = null;
    server.progress = done(["warmup"]);
    server.stopHandler = () => new ApiError("internal", "Request failed (502)");
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    await screen.findByText("Your next step could not be loaded. Please try again.");
    const reads = server.calls.filter((c) => c.path === "/api/path/progress" && !("progress" in (c.input as object))).length;
    server.stopHandler = (input) => stopReply(input.index);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
    expect(server.calls.filter((c) => c.path === "/api/path/progress" && !("progress" in (c.input as object)))).toHaveLength(reads);
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

// The server answers "signed out" (401) to a learner whose browser holds a
// session. The answer is believed only when the browser's own sign-in client
// says the same. Believed wrongly, it showed a member the visitor's screen,
// with their progress put away and nothing asked again.
describe("when the server answers that nobody is signed in", () => {
  const key = "cb_path_security-plus-sy0-701";
  const NOT_REACHED = "Your account could not be reached. The progress saved on this device is shown.";
  const SIGN_IN_AGAIN = "Your Security+ study path is saved in your account.";

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    localStorage.setItem(key, JSON.stringify({ v: 1, owner: "u1", progress: done(["warmup", "1.1"]) }));
    server.readError = new ApiError("unauthorized");
  });

  it("does not show the visitor's screen while the browser holds a good session, and asks the account again", async () => {
    renderPath();
    // The learner's own home screen: what this device holds, with the reason said above it.
    expect(await screen.findByText(NOT_REACHED)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.getByText(/You have completed 2 of \d+ steps/)).toBeInTheDocument();
    // Not the screen that asks a signed-out learner to sign in again, and not a visitor's first question.
    expect(screen.queryByRole("heading", { name: SIGN_IN_AGAIN })).toBeNull();
    expect(screen.queryByText("Prompt a|1.1|w1")).toBeNull();
    expect(track).not.toHaveBeenCalledWith("path_welcome_back_viewed", expect.anything());
    // Still signed in: the account menu is in the header.
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();

    // Asked again, the server answers properly, and the notice goes.
    server.readError = null;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText(NOT_REACHED)).toBeNull());
    expect(screen.getByRole("heading", { level: 1, name: "Your Security+ study path" })).toBeInTheDocument();
  });

  it("asks a learner whose session has ended to sign in again", async () => {
    // Signed out on another device, say: the cookie is still here, and the session behind it is gone.
    auth.ended = true;
    renderPath();
    expect(await screen.findByRole("heading", { level: 1, name: SIGN_IN_AGAIN })).toBeInTheDocument();
    expect(screen.queryByText(NOT_REACHED)).toBeNull();
    expect(track).toHaveBeenCalledWith("path_welcome_back_viewed", { cert: "security-plus-sy0-701" });
  });
});

// A new version of the site was published while the page was open. The server
// carries each request out, and the file that reads its answers is gone, so
// `api()` says that the page is out of date. Neither "the connection" nor "try
// again" is true of that: only loading the page again puts it right.
describe("a page that is out of date", () => {
  const key = "cb_path_security-plus-sy0-701";
  const OUT_OF_DATE = "This page is out of date. Please reload the page.";
  const WHEN_THE_CONNECTION_RETURNS =
    "Your latest answers are kept on this device and will be saved to your account when the connection returns.";
  const NOT_REACHED = "Your account could not be reached. The progress saved on this device is shown.";

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
  });

  it("says so in place of the sentence about the connection, with a button that loads the page again, and sends nothing again", async () => {
    server.saveError = new ApiError("internal", OUT_OF_DATE);
    server.stopHandler = (input) => stopReply(input.index, 1);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    await answer(true);
    // The end of the step sends a save. The server stores it, and the page cannot read the answer.
    const said = await screen.findByText(OUT_OF_DATE);
    expect(said.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByText(WHEN_THE_CONNECTION_RETURNS)).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    // It was carried out, so it is not counted with the saves that failed.
    expect(track).not.toHaveBeenCalledWith("path_save_failed", expect.anything());

    // The page does not send it again when the browser says that the connection is back.
    const sent = savedProgress().length;
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await act(async () => {});
    expect(savedProgress().length).toBe(sent);

    fireEvent.click(screen.getByRole("button", { name: "Reload the page" }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("says so in place of 'could not be reached' when it is the account's own answer that cannot be read", async () => {
    localStorage.setItem(key, JSON.stringify({ v: 1, owner: "u1", progress: done(["warmup"]) }));
    server.readError = new ApiError("internal", OUT_OF_DATE);
    renderPath();
    expect(await screen.findByText(OUT_OF_DATE)).toBeInTheDocument();
    // The learner's own screen, from what this device holds.
    expect(await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.queryByText(NOT_REACHED)).toBeNull();
    // "Try again" could not help: the one button loads the page again.
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeInTheDocument();
  });

  it("offers to load the page again, and not to try again, on the screen of a step whose answer could not be read", async () => {
    server.stopHandler = () => new ApiError("internal", OUT_OF_DATE);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    const said = await screen.findByRole("heading", { level: 1, name: OUT_OF_DATE });
    expect(document.activeElement).toBe(said);
    // Said once, with one button.
    expect(screen.getAllByText(OUT_OF_DATE)).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();

    // The press loads the page again. It does not ask the server for the step a second time.
    const asked = stepRequests().length;
    fireEvent.click(screen.getByRole("button", { name: "Reload the page" }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(stepRequests()).toHaveLength(asked);
  });

  it("says it once when a save and the next step both find the page out of date", async () => {
    // A member between two study steps, so that Continue asks the server for a step.
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup", "1.1", "checkpoint"], {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 60, at: 1, domains: [] },
    });
    server.saveError = new ApiError("internal", OUT_OF_DATE);
    server.stopHandler = (input) => (input.index === 3 ? stopReply(3, 1) : new ApiError("internal", OUT_OF_DATE));
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue/ }));
    await screen.findByText("Prompt a|1.2|s3-0");
    await answer(true);
    await screen.findByText(OUT_OF_DATE);
    // The next step cannot be read either: its screen says so, and the notice above does not repeat it.
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await screen.findByRole("heading", { level: 1, name: OUT_OF_DATE });
    expect(screen.getAllByText(OUT_OF_DATE)).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Reload the page" })).toHaveLength(1);
  });
});

// The schemas that read the server's answers are kept out of the page's first
// load. They are fetched in the background once the page is idle, so that a
// new version of the site, published during the visit, cannot take them away.
describe("the schemas that read the server's answers", () => {
  type IdleWindow = {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const idleWindow = window as unknown as IdleWindow;
  /** What the browser was asked to do once it is idle. */
  let idle: { callback: () => void; cancelled: boolean }[] = [];

  beforeEach(() => {
    idle = [];
    idleWindow.requestIdleCallback = (callback) => {
      idle.push({ callback, cancelled: false });
      return idle.length;
    };
    idleWindow.cancelIdleCallback = (id) => {
      idle[id - 1].cancelled = true;
    };
  });

  afterEach(() => {
    // The page is taken down while the browser can still be told that the request no longer stands.
    cleanup();
    delete idleWindow.requestIdleCallback;
    delete idleWindow.cancelIdleCallback;
  });

  it("are not fetched as the page loads, and are fetched for every endpoint of the page once the browser is idle", async () => {
    renderPath();
    await act(async () => {});
    // Nothing during the load: the browser has only been asked to say when it is idle.
    expect(warmContracts).not.toHaveBeenCalled();
    expect(idle).toHaveLength(1);

    act(() => idle[0].callback());
    expect(warmContracts).toHaveBeenCalledTimes(1);
    const warmed = (warmContracts.mock.calls[0][0] as { method: string; path: string }[]).map(
      (contract) => `${contract.method} ${contract.path}`
    );
    // The study path's own endpoints.
    expect(warmed).toEqual(
      expect.arrayContaining([
        "GET /api/path/progress",
        "POST /api/path/progress",
        "POST /api/path/stop",
        "POST /api/path/lab",
        "POST /api/path/rehearsal",
        "POST /api/path/enroll",
        "POST /api/path/answers",
      ])
    );
    // And those of the offer that the page makes: the prices and the payment page.
    expect(warmed).toEqual(
      expect.arrayContaining(["GET /api/pricing/region", "POST /api/stripe/checkout", "POST /api/stripe/cert-checkout"])
    );
  });

  it("are not asked for by a page that is left before the browser is idle", async () => {
    const { unmount } = renderPath();
    await act(async () => {});
    unmount();
    expect(idle[0].cancelled).toBe(true);
    expect(warmContracts).not.toHaveBeenCalled();
  });
});

describe("moving the focus with the screen", () => {
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };

  it("leaves the focus alone as the page loads, and gives it to each question that follows a press", async () => {
    renderPath();
    await act(async () => {});
    // The question that the page loads with does not take the focus: the page starts at its top.
    expect(document.activeElement).toBe(document.body);
    expect(cards.at(-1)).toMatchObject({ rep: { id: "a|1.1|w1" }, takeFocus: false });

    await answer(true);
    // The next question follows a press of Continue: it takes the focus, so it is read.
    expect(cards.at(-1)).toMatchObject({ rep: { id: "a|2.1|w2" }, takeFocus: true });
    expect(document.activeElement).toBe(screen.getByText("Prompt a|2.1|w2"));
  });

  it("moves the focus to the result when a step ends", async () => {
    renderPath();
    await act(async () => {});
    for (let i = 0; i < 3; i++) await answer(true);
    const result = await screen.findByRole("heading", { level: 1, name: "You answered 3 of 3 questions correctly." });
    expect(document.activeElement).toBe(result);
    expect(result).toHaveAttribute("tabindex", "-1");
  });

  it("says that the next step is being prepared as a status, and then gives the focus to its first question", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    let release: (value: unknown) => void = () => {};
    server.stopHandler = (input) => new Promise((resolve) => (release = () => resolve(stopReply(input.index))));
    renderPath();
    // A returning learner's own screen arrives as the page loads: it does not take the focus.
    const onward = await screen.findByRole("button", { name: /Continue/ });
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(onward);
    const waiting = await screen.findByText("Your next step is being prepared.");
    expect(waiting.closest('[role="status"]')).not.toBeNull();
    // For as long as the wait lasts, the sentence is the screen's title. It is announced, and does not take the focus.
    expect(screen.getAllByRole("heading", { level: 1 })).toEqual([waiting]);
    expect(document.activeElement).not.toBe(waiting);
    // A full sentence, with no ellipsis.
    expect(screen.queryByText(/…/)).toBeNull();

    await act(async () => release(null));
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBe(document.activeElement);
  });

  it("moves the focus to the home screen's title when the learner returns there", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    fireEvent.click(headerLink());
    const title = await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" });
    expect(document.activeElement).toBe(title);
    // The outline's own heading is under the title, with the domains under it.
    expect(screen.getByRole("heading", { level: 2, name: "Exam objectives" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Domain 1: Domain 1" })).toBeInTheDocument();
  });

  it("gives each planning question the focus as it replaces the one before", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup", "1.1"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    const booked = await screen.findByRole("heading", { level: 1, name: "Have you booked your Security+ exam?" });
    expect(document.activeElement).toBe(booked);
    fireEvent.click(screen.getByRole("button", { name: "No, I have not booked it yet" }));
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 1, name: "When do you expect to take the exam?" })
    );
    fireEvent.click(screen.getByRole("button", { name: "In one to two months" }));
    const minutes = await screen.findByRole("heading", { level: 1, name: "How much time can you study on most days?" });
    expect(document.activeElement).toBe(minutes);
    fireEvent.click(screen.getByRole("button", { name: "About 20 minutes" }));
    const intro = await screen.findByRole("heading", { level: 1, name: "The readiness checkpoint" });
    expect(document.activeElement).toBe(intro);
    expect(screen.getByText(/The checkpoint has 12 exam-style questions drawn from all 2 domains/)).toBeInTheDocument();
  });

  it("hands the focus on when the wait after a payment ends by itself", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    window.history.replaceState(null, "", "/path/security-plus-sy0-701?upgraded=1");
    renderPath();
    await screen.findByRole("button", { name: "Account" });
    server.access = "pro";
    const opened = await screen.findByRole(
      "heading",
      { level: 1, name: "Your full Security+ study path is now open." },
      { timeout: 4000 }
    );
    expect(document.activeElement).toBe(opened);
  }, 10_000);

  it("keeps a question's own screen free of the entrance that other screens have", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"], { goal });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    const prompt = await screen.findByText("Prompt a|1.1|s1-0");
    // A learner meets a question hundreds of times in a sitting: nothing around it moves.
    expect(prompt.closest(".path-rise")).toBeNull();
    // Every screen is drawn in the same column, so the page does not change width between them.
    expect(screen.getByRole("main").className).toContain("max-w-3xl");
  });
});

describe("the question's own lines", () => {
  it("draws the question counter and the objective's line afresh for each question", async () => {
    renderPath();
    await act(async () => {});
    const counter = screen.getByText("Question 1 of 3");
    const objective = screen.getByText("Objective 1.1: Objective 1.1.");
    // What a browser does when it translates the page: the text of each line
    // is replaced by its own elements, which React does not know about.
    counter.innerHTML = "<font>Frage 1 von 3</font>";
    objective.innerHTML = "<font>Ziel 1.1</font>";

    await answer(true);
    expect(screen.getByText("Question 2 of 3")).not.toBe(counter);
    expect(screen.getByText("Objective 2.1: Objective 2.1.")).not.toBe(objective);
    // The translated lines of the question before are gone, not left on the page.
    expect(screen.queryByText("Frage 1 von 3")).toBeNull();
    expect(screen.queryByText("Ziel 1.1")).toBeNull();
  });

  // An exam-style question used to carry two small lines above it: the
  // objective's, and the card's own "Exam-style question" under it.
  it("says the kind of an exam-style question on the objective's own line, and not a second time", async () => {
    renderPath();
    await act(async () => {});
    // A quick question: the line names the objective, and there is no kind to say.
    expect(screen.getByText("Objective 1.1: Objective 1.1.")).toBeInTheDocument();
    expect(screen.queryByText(/Exam-style question/)).toBeNull();
    expect(cards.at(-1)).toMatchObject({ rep: { id: "a|1.1|w1" }, showKind: false });

    await answer(true);
    await answer(true);
    // The third introductory question is exam-style, and the one line says so.
    const line = screen.getByText("Objective 1.2: Objective 1.2. Exam-style question.");
    expect(line.tagName).toBe("P");
    // The card is told not to print the kind again: the words are on the screen once.
    expect(cards.at(-1)).toMatchObject({ rep: { id: "a|1.2|w3" }, showKind: false });
    expect(screen.getAllByText(/Exam-style question/)).toEqual([line]);
  });

  it("draws the objective's line afresh when only the kind of question changes", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup", "1.1"], { goal: { examDate: null, target: null, minutes: 20, at: 1 } });
    // The checkpoint: two questions on the one objective, the second of them exam-style.
    server.stopHandler = (input) => ({
      stop: plan.stops[input.index],
      reps: [rep("a|1.1|quick", "1.1"), rep("a|1.1|exam", "1.1", "exam")],
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Start the checkpoint/ }));
    const first = await screen.findByText("Objective 1.1: Objective 1.1.");
    // What a browser does when it translates the page.
    first.innerHTML = "<font>Ziel 1.1</font>";

    await answer(true);
    const second = screen.getByText("Objective 1.1: Objective 1.1. Exam-style question.");
    // The same objective, and still a new element: the translated words are not left in its place.
    expect(second).not.toBe(first);
    expect(screen.queryByText("Ziel 1.1")).toBeNull();
  });

  it("leaves the kind on the card where no objective line is shown: a step on one objective, which its title names", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    server.stopHandler = (input) => ({
      stop: plan.stops[input.index],
      reps: [rep("a|1.1|exam", "1.1", "exam")],
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|exam");
    expect(screen.queryByText(/^Objective 1\.1: /)).toBeNull();
    // The card's own label, once.
    expect(cards.at(-1)).toMatchObject({ rep: { id: "a|1.1|exam" }, showKind: true });
    expect(screen.getAllByText("Exam-style question")).toHaveLength(1);
  });

  it("hands the question card the same handlers from one render to the next", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    // An answer changes the progress, so the page renders again around the same question.
    fireEvent.click(screen.getByRole("button", { name: /Right answer/ }));
    await act(async () => {});
    const sameQuestion = cards.filter((card) => card.rep.id === "a|1.1|s1-0");
    expect(sameQuestion.length).toBeGreaterThan(1);
    expect(new Set(sameQuestion.map((card) => card.onAnswer)).size).toBe(1);
    expect(new Set(sameQuestion.map((card) => card.onNext)).size).toBe(1);
  });
});

describe("requests that are answered late or fail", () => {
  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
  });

  it("does not move a learner who has gone elsewhere when a step arrives late", async () => {
    let release: (value: unknown) => void = () => {};
    server.stopHandler = (input) => new Promise((resolve) => (release = () => resolve(stopReply(input.index))));
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Your next step is being prepared.");
    // They go back to the home screen while the step is still on its way.
    fireEvent.click(headerLink());
    await screen.findByRole("heading", { name: "Your Security+ study path" });

    await act(async () => release(null));
    await act(async () => {});
    // The late answer does not open the step over the screen they chose.
    expect(screen.getByRole("heading", { name: "Your Security+ study path" })).toBeInTheDocument();
    expect(screen.queryByText("Prompt a|1.1|s1-0")).toBeNull();
  });

  it("says what went wrong in a sentence, never in the server's or the network's own words", async () => {
    server.stopHandler = () => new ApiError("internal", "Request failed (502)");
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    const said = await screen.findByText("Your next step could not be loaded. Please try again.");
    // It replaces the loading line, and takes the focus so that it is read.
    expect(document.activeElement).toBe(said);
    // The sentence is the title of this screen, which has no other heading.
    expect(screen.getAllByRole("heading", { level: 1 })).toEqual([said]);
    expect(screen.queryByText(/502/)).toBeNull();

    // A bare code from the server is never shown either: it has a sentence.
    server.stopHandler = () => new ApiError("rate_limited");
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(
      await screen.findByText("Too many requests were made in a short time. Please wait a few minutes and try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText("rate_limited")).toBeNull();

    server.stopHandler = (input) => stopReply(input.index);
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("Prompt a|1.1|s1-0")).toBeInTheDocument();
  });

  it("shows the next planning question at once, without waiting for the request that sets the exam", async () => {
    server.progress = done(["warmup", "1.1"]);
    // The request that makes this the account's exam never answers.
    server.enrollWaits = new Promise(() => {});
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: "No, I have not booked it yet" }));
    fireEvent.click(screen.getByRole("button", { name: "In one to two months" }));
    // No wait: the next question is on the screen in the same moment.
    expect(screen.getByText("How much time can you study on most days?")).toBeInTheDocument();
    expect(server.calls.some((c) => c.path === "/api/path/enroll")).toBe(true);
    // The answer itself is kept with the progress, whatever becomes of that request.
    await waitFor(() => expect(savedProgress().at(-1)?.goal?.target).toBe(isoInDays(60, Date.now())));
  });
});

describe("asking for the next step ahead of time", () => {
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup", "1.1", "checkpoint"], { goal, checkpoint: { score: 60, at: 1, domains: [] } });
    server.stopHandler = (input) => stopReply(input.index, 1);
  });

  it("asks for the next step while the end of a step is read, so that Continue has nothing to wait for", async () => {
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.2|s3-0");
    expect(stepRequests().map((r) => r.index)).toEqual([3]);
    await answer(true);
    await screen.findByText(/You have completed step 4/i);
    // The step after it has been asked for already, and its answer has arrived.
    await waitFor(() => expect(stepRequests().map((r) => r.index)).toEqual([3, 4]));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    // The question is on the screen in the same moment: no loading line, and no second request.
    expect(screen.getByText("Prompt a|1.3|s4-0")).toBeInTheDocument();
    expect(screen.queryByText("Your next step is being prepared.")).toBeNull();
    expect(stepRequests().map((r) => r.index)).toEqual([3, 4]);
  });

  it("waits for that same request, without sending another, when Continue is pressed before it has been answered", async () => {
    let release: (value: unknown) => void = () => {};
    server.stopHandler = (input) =>
      input.index === 4
        ? new Promise((resolve) => (release = () => resolve(stopReply(4, 1))))
        : stopReply(input.index, 1);
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.2|s3-0");
    await answer(true);
    await screen.findByText(/You have completed step 4/i);
    await waitFor(() => expect(stepRequests()).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Your next step is being prepared.")).toBeInTheDocument();
    await act(async () => release(null));
    expect(await screen.findByText("Prompt a|1.3|s4-0")).toBeInTheDocument();
    expect(stepRequests()).toHaveLength(2);
  });

  it("asks for nothing ahead of time that the learner may not open", async () => {
    // A free account at the end of its first study step: the checkpoint is next, and it is free.
    server.access = "free";
    server.progress = done(["warmup"]);
    const { unmount } = renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    await answer(true);
    await screen.findByText(/You have completed step 2/i);
    await waitFor(() => expect(stepRequests().map((r) => r.index)).toEqual([1, 2]));
    unmount();

    // Past the checkpoint the next step is one that Pro opens: a free account's page does not ask for it.
    server.calls = [];
    server.progress = done(["warmup", "1.1"], { goal });
    server.stopHandler = (input) => ({
      stop: plan.stops[input.index],
      reps: [rep("q|1.1|33333333-3333-4333-8333-333333333333", "1.1", "exam")],
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Start the checkpoint/ }));
    await screen.findByText(/Prompt q\|1\.1/);
    await answer(true);
    await screen.findByText("Continue your study path with Pro");
    await act(async () => {});
    expect(stepRequests().map((r) => r.index)).toEqual([2]);
  });
});

describe("the browser's Back", () => {
  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
  });

  it("returns from a step to the home screen of the study path instead of leaving it", async () => {
    renderPath();
    const onward = await screen.findByRole("button", { name: /Continue/ });
    const entries = window.history.length;
    fireEvent.click(onward);
    await screen.findByText("Prompt a|1.1|s1-0");
    // One entry was added when the step opened, and none for the questions inside it.
    expect(window.history.length).toBe(entries + 1);
    await answer(true);
    expect(window.history.length).toBe(entries + 1);

    await goBack();
    const title = await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" });
    expect(screen.queryByText(/^Prompt /)).toBeNull();
    // The address is the study path's own, and the home screen is read from its title.
    expect(window.location.pathname).toBe("/path/security-plus-sy0-701");
    expect(document.activeElement).toBe(title);
  });

  it("gives the entry back when the learner returns by one of the page's own controls", async () => {
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    const inStep = window.history.length;

    // The exam's name in the header leads home; the entry for the step is given back.
    await act(async () => {
      const arrived = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
      fireEvent.click(headerLink());
      await arrived;
    });
    await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" });

    // Opening a step again adds one entry in its place, never a second one on top.
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await screen.findByText("Prompt a|1.1|s1-0");
    expect(window.history.length).toBe(inStep);
  });

  it("returns from the list of labs and from a practice exam's first screen in the same way", async () => {
    server.access = "pro";
    localStorage.setItem("cb_path_unlocked_security-plus-sy0-701", "1");
    server.progress = done(["warmup"], { goal: { examDate: null, target: null, minutes: 20, at: 1 } });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Start: Practice exam" }));
    await screen.findByRole("heading", { name: "Take a full-length practice exam." });
    await goBack();
    expect(await screen.findByRole("heading", { level: 1, name: "Your Security+ study path" })).toBeInTheDocument();
  });

  it("adds nothing for a visitor without an account, whose whole visit is the introductory questions", async () => {
    auth.session = null;
    server.progress = null;
    renderPath();
    await act(async () => {});
    const entries = window.history.length;
    for (let i = 0; i < 3; i++) await answer(true);
    await screen.findByText(/You have completed the introductory questions/i);
    expect(window.history.length).toBe(entries);
  });
});

describe("changing the exam date", () => {
  const longDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
  });

  it("states the exam date on the home screen and opens the question again from there", async () => {
    const booked = isoInDays(40, Date.now());
    server.progress = done(["warmup", "1.1"], { goal: { examDate: booked, target: null, minutes: 20, at: 1 } });
    renderPath();
    expect(await screen.findByText(/Your exam is booked for/)).toHaveTextContent(
      `Your exam is booked for ${longDate(booked)}. Change my exam date`
    );

    fireEvent.click(screen.getByRole("button", { name: "Change my exam date" }));
    // The question said that the answer could be changed at any time: now it can.
    expect(await screen.findByRole("heading", { level: 1, name: "Have you booked your Security+ exam?" })).toBeInTheDocument();
    expect(screen.getByText("Your answer sets the pace of your study path. You can change it at any time.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No, I have not booked it yet" }));
    fireEvent.click(screen.getByRole("button", { name: "In three months or more" }));

    // Back on the home screen with the new answer, and the daily study time kept as it was.
    const target = isoInDays(90, Date.now());
    expect(await screen.findByText(/You plan to take the exam by/)).toHaveTextContent(
      `You plan to take the exam by ${longDate(target)}.`
    );
    await waitFor(() => expect(savedProgress().at(-1)?.goal).toMatchObject({ examDate: null, target, minutes: 20 }));
    expect(track).toHaveBeenCalledWith("path_goal_set", { cert: "security-plus-sy0-701", step: "exam", value: target });
    // It did not go on to ask for the daily time again, or start a step.
    expect(screen.queryByText("How much time can you study on most days?")).toBeNull();
    expect(stepRequests()).toHaveLength(0);
  });

  it("leaves the date as it was when the learner returns without answering", async () => {
    const booked = isoInDays(40, Date.now());
    server.progress = done(["warmup", "1.1"], { goal: { examDate: booked, target: null, minutes: 20, at: 1 } });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: "Change my exam date" }));
    fireEvent.click(await screen.findByRole("button", { name: "Return to the study path" }));
    expect(await screen.findByText(/Your exam is booked for/)).toHaveTextContent(longDate(booked));
    expect(savedProgress().every((saved) => saved.goal?.examDate === booked)).toBe(true);
  });

  it("offers no change before a date has been given", async () => {
    server.progress = done(["warmup"]);
    renderPath();
    await screen.findByRole("button", { name: /Continue/ });
    expect(screen.queryByRole("button", { name: "Change my exam date" })).toBeNull();
  });
});

describe("the way on past the free steps", () => {
  const stop = plan.stops[plan.freeThrough + 1];

  it("names the button that leads to the offer by what it shows, in the same words as the outline uses", () => {
    const onContinue = vi.fn();
    render(<ContinueCard stop={stop} total={plan.stops.length} onContinue={onContinue} locked />);
    // It opens the offer, so it says so. "Continue" would promise the step itself.
    const button = screen.getByRole("button", { name: "See what Pro includes" });
    expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
    // The arrow means that study starts or continues: this button leads to an offer, so it has none.
    expect(button.querySelector("svg")).toBeNull();
    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("names the step that is next as a heading, with one button that continues to it", () => {
    const { container } = render(<ContinueCard stop={stop} total={plan.stops.length} onContinue={() => {}} />);
    expect(screen.getByRole("heading", { level: 2, name: stop.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" }).querySelector("svg")).not.toBeNull();
    // No coloured rule on the card's edge: a rule there marks a notice.
    expect(container.innerHTML).not.toMatch(/border-l-\[|border-l-primary/);
  });

  it("leads from a completed step's row to the offer on the home screen, and gives the offer the focus", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    const freeSteps = plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id);
    server.progress = done(freeSteps, {
      goal: { examDate: null, target: null, minutes: 20, at: 1 },
      checkpoint: { score: 64, at: 1, domains: [] },
    });
    renderPath();
    await screen.findByText("Continue your study path with Pro");
    fireEvent.click(within(outlineRow("1.1")).getByRole("button"));
    const row = screen.getByRole("region", { name: "Objective 1.1" });
    fireEvent.click(within(row).getByRole("button", { name: "See what Pro includes" }));
    // The offer is on this screen: it is brought into view and takes the focus, so that it is read.
    expect(document.activeElement).toBe(document.getElementById("path-offer"));
  });
});

// A member whose last payment did not go through has no Pro while the payment
// is owed. The study path offered such a member Pro, and the plan they pressed
// was refused at the checkout. They are shown the way to the billing page.
describe("a member whose last payment did not go through", () => {
  const PAST_DUE = "Your last payment did not go through.";
  const goal = { examDate: null, target: null, minutes: 20, at: 1 };
  const freeSteps = plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id);

  beforeEach(() => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    // No Pro while the payment is owed: the account's access is "free".
    server.pastDue = true;
    server.progress = done(freeSteps, { goal, checkpoint: { score: 64, at: 1, domains: [] } });
  });

  it("is shown the way to the billing page on the home screen, where the offer would stand", async () => {
    renderPath();
    const title = await screen.findByRole("heading", { level: 2, name: PAST_DUE });
    const notice = title.closest<HTMLElement>(".glass")!;
    // The billing page's own two sentences, and a link to that page.
    expect(within(notice).getByText("Please update your payment method to keep CertBench Pro.")).toBeInTheDocument();
    expect(within(notice).getByRole("link", { name: "Manage billing" })).toHaveAttribute("href", "/upgrade");
    // It stands in the offer's place, so a row of the outline that led to the offer leads here.
    expect(document.getElementById("path-offer")).toContainElement(notice);

    // No offer: nothing to buy, no price asked for, and no offer counted as seen.
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue to payment" })).toBeNull();
    expect(screen.queryByText(/Pass guarantee/)).toBeNull();
    await act(async () => {});
    expect(server.calls.some((c) => c.path === "/api/pricing/region")).toBe(false);
    expect(track).not.toHaveBeenCalledWith("path_offer_viewed", expect.anything());
    // Nothing on it tries anything again.
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("is shown it under the result of the readiness checkpoint as well", async () => {
    server.progress = done(["warmup", "1.1"], { goal });
    server.stopHandler = (input) => ({
      stop: plan.stops[input.index],
      reps: [rep("q|1.1|33333333-3333-4333-8333-333333333333", "1.1", "exam")],
    });
    renderPath();
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Start the checkpoint/ }));
    await screen.findByText(/Prompt q\|1\.1/);
    await answer(true);
    expect(await screen.findByRole("heading", { level: 2, name: PAST_DUE })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage billing" })).toHaveAttribute("href", "/upgrade");
    expect(screen.queryByText("Continue your study path with Pro")).toBeNull();
    // The way back to the study path is still under it.
    expect(screen.getByRole("button", { name: "Return to the study path" })).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith("path_offer_viewed", expect.anything());
  });

  it("is not shown it where there is no offer to take its place: the free steps are theirs as before", async () => {
    // Before the readiness checkpoint nothing is offered, so nothing is said about billing either.
    server.progress = done(["warmup"]);
    renderPath();
    expect(await screen.findByRole("button", { name: /^Continue/ })).toBeInTheDocument();
    expect(screen.queryByText(PAST_DUE)).toBeNull();
    expect(screen.queryByRole("link", { name: "Manage billing" })).toBeNull();
  });
});

// Network+'s steps are CertBench's own topics, and its numbers are not
// CompTIA's (usesOfficialObjectiveNumbers). The study path calls them topics,
// and cites no number as an objective's.
describe("Network+, whose steps are CertBench's own topics", () => {
  const NET = "network-plus-n10-009";
  const titles: Record<string, string> = {
    "1.1": "The OSI model",
    "1.2": "Network appliances",
    "1.3": "Cloud concepts",
    "2.1": "Routing technologies",
    "2.2": "Switching technologies",
    "2.3": "Wireless devices",
  };
  const net: PathStructure = {
    ...structure,
    certSlug: NET,
    examName: "Network+",
    examCode: "N10-009",
    domains: structure.domains.map((d) => ({
      ...d,
      objectives: d.objectives.map((o) => ({ ...o, title: titles[o.code] })),
    })),
  };
  const netPlan = buildPlan(net);
  const renderNet = () =>
    render(
      <PathApp
        cert={NET}
        structure={net}
        plan={netPlan}
        warmup={{ stop: netPlan.stops[0], reps: warmup.reps }}
        questionCount={500}
        free={{ examHref: "/network-plus-practice-test", labsHref: "/network-plus-pbq-examples", labIds: [] }}
      />
    );

  it("names the topic above a question, with no number", async () => {
    renderNet();
    await act(async () => {});
    expect(screen.getByText("Topic: The OSI model.")).toBeInTheDocument();
    expect(screen.queryByText(/Objective 1\.1/)).toBeNull();
    await answer(true);
    await answer(true);
    expect(screen.getByText("Topic: Network appliances. Exam-style question.")).toBeInTheDocument();
  });

  it("counts topics where a step ends, and heads the outline with them", async () => {
    renderNet();
    await act(async () => {});
    await answer(true);
    await answer(true);
    await answer(true);
    expect(await screen.findByText(/You have completed the introductory questions/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Network+ topics" })).toBeInTheDocument();
    expect(screen.getByText(/^These questions marked 3 topics: .* In all, you have started 3 of 6 topics\.$/)).toBeInTheDocument();
    expect(screen.queryByText(/objective/i)).toBeNull();
    // The outline's rows name the topic, with no number in front of it.
    expect(outlineRow("The OSI model")).toBeInTheDocument();
  });

  it("heads the outline with topics where Pro opens the whole study path", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.access = "pro";
    server.progress = done(["warmup"]);
    renderNet();
    expect(await screen.findByRole("heading", { name: "Your full Network+ study path is now open." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Exam topics" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Exam objectives" })).toBeNull();
  });

  it("calls the outline's rows topics on the home screen and in what a row says when it is opened", async () => {
    auth.session = { user: { id: "u1", email: "u1@example.com" } };
    server.progress = done(["warmup"]);
    renderNet();
    expect(await screen.findByRole("heading", { level: 2, name: "Exam topics" })).toBeInTheDocument();
    expect(screen.getByText("Choose a topic to see where you stand on it.")).toBeInTheDocument();
    expect(screen.getByText(/You have completed 1 of \d+ steps and started 0 of 6 topics\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^The OSI model/ }));
    expect(screen.getByText("This topic is taught in your next step.")).toBeInTheDocument();
  });
});
