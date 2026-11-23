// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { finishStop, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type ChoiceRep, type PathProgress, type PathStructure } from "@/core/path/types";

const track = vi.hoisted(() => vi.fn());
const identifyUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser }));

/** Who the mocked Supabase client says is signed in, and how often it's been asked. */
const auth = vi.hoisted(() => ({ session: null as null | { user: { id: string; email: string } }, reads: 0 }));
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (heard: (event: string, session: unknown) => void) => {
        auth.reads++;
        heard("INITIAL_SESSION", auth.session);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signUp: async ({ email }: { email: string }) => {
        const user = { id: "new-user", email };
        return { data: { user, session: { user } }, error: null };
      },
    },
  }),
}));

// The page reads the session cookie before it loads the sign-in client: in
// these tests the cookie is there exactly when someone is signed in.
vi.mock("@/lib/supabase-lazy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase-lazy")>()),
  hasSessionCookie: () => auth.session !== null,
}));

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

/** Saves sent straight to an account (only a browser that keeps nothing sends one from here). */
const saves = vi.hoisted(() => [] as { path: string; input: unknown }[]);
vi.mock("@/lib/api-client", () => ({
  api: async (contract: { path: string }, input: unknown) => {
    saves.push({ path: contract.path, input });
    return { ok: true, stored: true };
  },
}));

import { QuickRound } from "../QuickRound";

// Node's own experimental `localStorage` global shadows jsdom's.
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

const CERT = "security-plus-sy0-701";
const KEY = `cb_path_${CERT}`;
/** Work played beside an account's copy by someone who is not signed in as that account. */
const GUEST = `cb_path_guest_${CERT}`;
const CLAIM = `cb_path_guest_claim_${CERT}`;

const structure: PathStructure = {
  certSlug: CERT,
  examName: "Security+",
  examCode: "SY0-701",
  domains: [
    {
      number: "1.0",
      title: "General Security Concepts",
      weight: 12,
      objectives: [
        { code: "1.1", title: "Security controls" },
        { code: "1.2", title: "Core security concepts" },
      ],
    },
    { number: "2.0", title: "Threats", weight: 22, objectives: [{ code: "2.1", title: "Threat actors" }] },
  ],
};

const rep = (id: string, objective = "1.1"): ChoiceRep => ({
  id,
  type: "choice",
  label: "Quick scenario",
  tier: "quick",
  objective,
  prompt: `Prompt ${id}`,
  options: ["Right answer", "Wrong one", "Wrong two", "Wrong three"],
  answer: 0,
  takeaway: "Takeaway",
});

/** Objective 1.1's round, two questions long. */
function renderRound() {
  return render(
    <QuickRound
      cert={CERT}
      stopId="1.1"
      examName="Security+"
      structure={structure}
      reps={[rep("a|1.1|x"), rep("a|1.1|y")]}
      label="Objective 1.1 · Security controls"
      surface="objective_page"
    />
  );
}

/**
 * Answer the question on screen and move on; the last one leads to the result.
 * An answer is a plain button, and every answer waits for the button after it.
 */
function play(right: boolean, last = false) {
  fireEvent.click(screen.getByRole("button", { name: right ? /Right answer/ : /Wrong one/ }));
  fireEvent.click(screen.getByRole("button", { name: last ? /View my result/ : /^Continue/ }));
}

/** What a device holds before the visit. */
function seed(owner: string | null, progress: PathProgress) {
  store.set(KEY, JSON.stringify({ v: 1, owner, progress }));
}

/** Make an account with the save ask's email form. */
function signUp() {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new@example.com" } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "long-enough-pw" } });
  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
}

/** The course outline's row for an objective. Its words are the code, the title and where the visitor stands. */
const tile = (code: string) => screen.getByText(code, { selector: "li span" }).closest("li")!;

beforeEach(() => {
  store.clear();
  storage.refuses = false;
  saves.length = 0;
  track.mockClear();
  identifyUser.mockClear();
  push.mockClear();
  auth.session = null;
  auth.reads = 0;
  window.history.replaceState(null, "", "/objectives/security-plus-sy0-701/1-1");
});

describe("QuickRound", () => {
  it("plays the step inline and counts it on the visitor's path", () => {
    renderRound();
    play(true);
    play(false, true);

    expect(screen.getByText("of 2")).toBeInTheDocument();
    expect(screen.getByText("1 question will be repeated in a later step of your study path.")).toBeInTheDocument();
    const saved = JSON.parse(store.get(KEY)!);
    expect(Object.keys(saved.progress.items)).toEqual(["a|1.1|x", "a|1.1|y"]);
    expect(saved.progress.stops["1.1"]).toMatchObject({ n: 1, c: 1, t: 2 });
    expect(saved.owner).toBeNull();
    expect(track).toHaveBeenCalledWith("quick_round_completed", {
      cert: CERT,
      surface: "objective_page",
      correct: 1,
      total: 2,
    });
  });

  it("says where the last answer leads", () => {
    renderRound();
    fireEvent.click(screen.getByRole("button", { name: /Right answer/ }));
    expect(screen.getByRole("button", { name: /^Continue/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: /Wrong one/ }));
    expect(screen.getByRole("button", { name: /View my result/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Continue/ })).toBeNull();
  });

  it("ends on the path's save ask and the visitor's map, with nowhere else to go first", () => {
    renderRound();
    play(true);
    play(false, true);

    // The ask, with the signup in place: no button to another page stands in for it.
    expect(screen.getByRole("heading", { name: "Save your progress" })).toBeInTheDocument();
    expect(screen.getByText(/A free account saves your progress and opens your Security\+ study path/)).toBeInTheDocument();
    expect(screen.getByText(/Until then, your progress is kept on this device only\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Start the Security\+ study path/ })).toBeNull();
    expect(track).toHaveBeenCalledWith("path_save_viewed", { cert: CERT, surface: "objective_page" });

    // Their map, with this objective lit as the miss it holds.
    expect(screen.getByRole("heading", { name: "Security+ objectives" })).toBeInTheDocument();
    expect(screen.getByText("You have started 1 of 3 objectives.")).toBeInTheDocument();
    expect(tile("1.1")).toHaveTextContent("1.1 Security controls, To review");
    expect(tile("1.2")).toHaveTextContent("1.2 Core security concepts, Not started");
  });

  it("shows everything the device has played, and names the step an account opens next", () => {
    // The warm-up and a round on 2.1 from earlier visits, still anonymous.
    seed(
      null,
      finishStop(recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1), "warmup", 5, 6, 1)
    );
    renderRound();
    play(true);
    play(true, true);

    expect(screen.getByText("You answered every question correctly.")).toBeInTheDocument();
    expect(screen.getByText("You have started 2 of 3 objectives.")).toBeInTheDocument();
    expect(tile("2.1")).toHaveTextContent("2.1 Threat actors, Complete");
    // Warm-up and 1.1 done: the readiness checkpoint is next on their path, as the path's own card would say.
    expect(screen.getByRole("heading", { name: "Your next step: the readiness checkpoint" })).toBeInTheDocument();
    expect(screen.getByText(/It has 12 exam-style questions and gives you a score for each domain\./)).toBeInTheDocument();
    expect(screen.queryByText(/kept on this device only/)).toBeNull();
  });

  it("goes by topic where the page does", () => {
    render(
      <QuickRound
        cert="network-plus-n10-009"
        stopId="1.1"
        examName="Network+"
        structure={{ ...structure, certSlug: "network-plus-n10-009", examName: "Network+" }}
        reps={[rep("a|1.1|x")]}
        label="OSI model"
        surface="objective_page"
        unit="topics"
      />
    );
    play(true, true);
    expect(screen.getByText("You have started 1 of 3 topics.")).toBeInTheDocument();
  });

  it("hands the round to the account they make, counts it once, and opens their path", async () => {
    renderRound();
    play(true);
    play(true, true);

    expect(screen.getByText(/The account is free, and no payment card is required\./)).toBeInTheDocument();
    expect(screen.queryByText(/You stay right here/)).toBeNull();
    signUp();

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/path/${CERT}`));
    expect(identifyUser).toHaveBeenCalledWith("new-user", { email: "new@example.com" });
    expect(track).toHaveBeenCalledWith("path_account_linked", { cert: CERT, method: "email_signup" });
    // The device's rounds are the account's now, so the path saves them when it opens.
    const saved = JSON.parse(store.get(KEY)!);
    expect(saved.owner).toBe("new-user");
    expect(saved.progress.stops["1.1"].n).toBe(1);
  });

  it("on a shared computer, keeps a signed-out visitor's round out of the previous account's copy and hands it to the account they make", async () => {
    // Someone else's study path is on this device, and they have signed out.
    seed("user-1", recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1));
    const before = store.get(KEY);
    renderRound();
    play(true);
    play(true, true);

    // The account's copy is exactly as it was: the round is kept beside it.
    expect(store.get(KEY)).toBe(before);
    const guest = JSON.parse(store.get(GUEST)!);
    expect(Object.keys(guest.items)).toEqual(["a|1.1|x", "a|1.1|y"]);
    expect(guest.stops["1.1"]).toMatchObject({ n: 1, c: 2, t: 2 });

    signUp();
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/path/${CERT}`));
    // The copy stays the other account's, and the round is marked as the new
    // account's, so the study path adds it to that account when it opens.
    expect(store.get(KEY)).toBe(before);
    expect(store.get(CLAIM)).toBe("new-user");
    expect(Object.keys(JSON.parse(store.get(GUEST)!).items)).toEqual(["a|1.1|x", "a|1.1|y"]);
    // The device kept the round, so nothing had to be sent from this page.
    expect(saves).toHaveLength(0);
  });

  it("sends the round to the new account from the page when the browser keeps nothing", async () => {
    storage.refuses = true;
    renderRound();
    play(true);
    play(false, true);

    expect(store.size).toBe(0);
    // It does not say that the device keeps the progress, because it does not.
    expect(screen.queryByText(/kept on this device only/)).toBeNull();
    expect(screen.getByText(/This browser is not saving your progress\. Create a free account to keep it\./)).toBeInTheDocument();
    // Their map is this round alone.
    expect(screen.getByText("You have started 1 of 3 objectives.")).toBeInTheDocument();

    signUp();
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/path/${CERT}`));
    expect(saves).toHaveLength(1);
    expect(saves[0].path).toBe("/api/path/progress");
    const sent = saves[0].input as { cert: string; progress: PathProgress };
    expect(sent.cert).toBe(CERT);
    expect(Object.keys(sent.progress.items)).toEqual(["a|1.1|x", "a|1.1|y"]);
    expect(sent.progress.stops["1.1"]).toMatchObject({ n: 1, c: 1, t: 2 });
  });

  it("gives someone signed in the way back to their path, not a signup", async () => {
    auth.session = { user: { id: "user-1", email: "a@b.co" } };
    seed("user-1", recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1));
    renderRound();
    // Who's there is found while the round is played, once the auth client loads.
    await waitFor(() => expect(auth.reads).toBe(1));
    play(true);
    play(true, true);

    expect(screen.queryByRole("button", { name: "Save and continue" })).toBeNull();
    expect(track).not.toHaveBeenCalledWith("path_save_viewed", expect.anything());
    expect(screen.getByText("These questions count toward your study path.")).toBeInTheDocument();
    // Their own map, the earlier work on this device included.
    expect(screen.getByText("You have started 2 of 3 objectives.")).toBeInTheDocument();

    const on = screen.getByRole("link", { name: /Continue/ });
    expect(on).toHaveAttribute("href", `/path/${CERT}`);
    // jsdom can't follow a link; the click is all that's under test.
    on.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(on);
    expect(track).toHaveBeenCalledWith("path_exam_picked", { cert: CERT, surface: "objective_page" });
  });

  it("shows someone signed in only this round when the device's copy is another account's", async () => {
    auth.session = { user: { id: "user-2", email: "c@d.co" } };
    seed("user-1", recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1));
    renderRound();
    await waitFor(() => expect(auth.reads).toBe(1));
    play(true);
    play(true, true);

    expect(screen.getByText("You have started 1 of 3 objectives.")).toBeInTheDocument();
    expect(tile("2.1")).toHaveTextContent("2.1 Threat actors, Not started");
    // The round is kept beside the other account's copy, never in it, and their
    // own study path takes it up when it opens: so the page can say that it counts.
    expect(JSON.parse(store.get(KEY)!).owner).toBe("user-1");
    expect(Object.keys(JSON.parse(store.get(KEY)!).progress.items)).toEqual(["a|2.1|z"]);
    expect(Object.keys(JSON.parse(store.get(GUEST)!).items)).toEqual(["a|1.1|x", "a|1.1|y"]);
    // It is marked as theirs, so their study path does not count them as a new account.
    expect(store.get(CLAIM)).toBe("user-2");
    expect(screen.getByText("These questions count toward your study path.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue/ })).toHaveAttribute("href", `/path/${CERT}`);
  });

  it("keeps an account's map off a device that is signed out", () => {
    seed("user-1", recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1));
    renderRound();
    play(true);
    play(true, true);

    // Only this round shows; the account's own work stays out of sight.
    expect(screen.getByText("You have started 1 of 3 objectives.")).toBeInTheDocument();
    expect(tile("2.1")).toHaveTextContent("2.1 Threat actors, Not started");
    expect(screen.getByRole("heading", { name: "Save your progress" })).toBeInTheDocument();
    // The round does not join the account's copy: it may be someone else at the keyboard.
    const saved = JSON.parse(store.get(KEY)!);
    expect(saved.owner).toBe("user-1");
    expect(Object.keys(saved.progress.items)).toEqual(["a|2.1|z"]);
    expect(Object.keys(JSON.parse(store.get(GUEST)!).items)).toEqual(["a|1.1|x", "a|1.1|y"]);
  });

  it("picks the result back up after a Google sign-in they backed out of", async () => {
    seed(null, finishStop(recordRep(EMPTY_PATH_PROGRESS, "a|1.1|x", true, 1), "1.1", 1, 2, 1));
    window.history.replaceState(null, "", "/objectives/security-plus-sy0-701/1-1?signin_cancelled=1");
    renderRound();

    // Not the first question again: the score they left, and the ask that says what happened.
    expect(await screen.findByText("of 2")).toBeInTheDocument();
    expect(screen.queryByText("Prompt a|1.1|x")).toBeNull();
    expect(screen.getByRole("heading", { name: "Save your progress" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("google_signin_cancelled", {
      page: "/objectives/security-plus-sy0-701/1-1",
      via: "google",
    });
    expect(window.location.search).toBe("");
  });

  it("starts over on Play again", () => {
    renderRound();
    play(true);
    play(true, true);
    fireEvent.click(screen.getByRole("button", { name: /Answer the questions again/ }));

    expect(screen.getByText("Prompt a|1.1|x")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Security+ objectives" })).toBeNull();
    play(true);
    play(false, true);
    expect(JSON.parse(store.get(KEY)!).progress.stops["1.1"]).toMatchObject({ n: 2, c: 1, t: 2 });
  });

  it("adds to an account's copy on the device only while that account is signed in", async () => {
    const warmupRound = () =>
      render(
        <QuickRound
          cert={CERT}
          stopId="warmup"
          examName="Security+"
          structure={structure}
          reps={[rep("a|4.5|w1", "4.5")]}
          label="Security+ introductory questions"
          surface="practice_test_page"
        />
      );

    // Signed in as the account that owns the copy: the round joins it.
    auth.session = { user: { id: "user-1", email: "a@b.co" } };
    seed("user-1", EMPTY_PATH_PROGRESS);
    const signedIn = warmupRound();
    await waitFor(() => expect(auth.reads).toBe(1));
    play(true, true);
    let saved = JSON.parse(store.get(KEY)!);
    expect(saved.owner).toBe("user-1");
    expect(saved.progress.stops.warmup.n).toBe(1);
    expect(store.has(GUEST)).toBe(false);
    signedIn.unmount();

    // Signed out on the same device: the copy keeps its owner and is not added to.
    auth.session = null;
    seed("user-1", EMPTY_PATH_PROGRESS);
    warmupRound();
    play(true, true);
    saved = JSON.parse(store.get(KEY)!);
    expect(saved.owner).toBe("user-1");
    expect(saved.progress.stops.warmup).toBeUndefined();
    expect(JSON.parse(store.get(GUEST)!).stops.warmup.n).toBe(1);
  });
});
