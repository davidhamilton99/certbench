// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { finishStop, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type ChoiceRep, type PathProgress, type PathStructure } from "@/core/path/types";

const track = vi.hoisted(() => vi.fn());
const identifyUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser }));

/** Who the mocked Supabase client says is signed in. */
const auth = vi.hoisted(() => ({ session: null as null | { user: { id: string; email: string } } }));
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (heard: (event: string, session: unknown) => void) => {
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

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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

const CERT = "security-plus-sy0-701";
const KEY = `cb_path_${CERT}`;

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

/** Answer the question on screen and move on; the last one leads to the result. */
function play(right: boolean, last = false) {
  fireEvent.click(screen.getByRole("radio", { name: right ? /Right answer/ : /Wrong one/ }));
  fireEvent.click(screen.getByRole("button", { name: last ? /See my result/ : right ? /^Next/ : /Got it/ }));
}

/** What a device holds before the visit. */
function seed(owner: string | null, progress: PathProgress) {
  store.set(KEY, JSON.stringify({ v: 1, owner, progress }));
}

/** Make an account with the save ask's email form. */
function signUp() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-enough-pw" } });
  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
}

const tile = (code: string) => screen.getByLabelText(new RegExp(`^${code.replace(".", "\\.")} `));

beforeEach(() => {
  store.clear();
  track.mockClear();
  identifyUser.mockClear();
  push.mockClear();
  auth.session = null;
  window.history.replaceState(null, "", "/objectives/security-plus-sy0-701/1-1");
});

describe("QuickRound", () => {
  it("plays the stop inline and counts it on the visitor's path", () => {
    renderRound();
    play(true);
    play(false, true);

    expect(screen.getByText("of 2")).toBeInTheDocument();
    expect(screen.getByText("1 to revisit. It comes back in a later stop on your path.")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("radio", { name: /Right answer/ }));
    expect(screen.getByRole("button", { name: /^Next/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Wrong one/ }));
    expect(screen.getByRole("button", { name: /See my result/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Got it/ })).toBeNull();
  });

  it("ends on the path's save ask and the visitor's map, with nowhere else to go first", () => {
    renderRound();
    play(true);
    play(false, true);

    // The ask, with the signup in place: no button to another page stands in for it.
    expect(screen.getByRole("heading", { name: "Save your map" })).toBeInTheDocument();
    expect(screen.getByText(/A free account saves your map and opens your Security\+ path/)).toBeInTheDocument();
    expect(screen.getByText(/Until then, your map is kept on this device only\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Start my Security\+ path/ })).toBeNull();
    expect(track).toHaveBeenCalledWith("path_save_viewed", { cert: CERT, surface: "objective_page" });

    // Their map, with this objective lit as the miss it holds.
    expect(screen.getByRole("heading", { name: "Your Security+ map" })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 objectives started")).toBeInTheDocument();
    expect(tile("1.1")).toHaveAccessibleName("1.1 Security controls: a miss to revisit");
    expect(tile("1.2")).toHaveAccessibleName("1.2 Core security concepts: not started");
  });

  it("shows everything the device has played, and names the stop an account opens next", () => {
    // The warm-up and a round on 2.1 from earlier visits, still anonymous.
    seed(
      null,
      finishStop(recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1), "warmup", 5, 6, 1)
    );
    renderRound();
    play(true);
    play(true, true);

    expect(screen.getByText("Every one right.")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 objectives started")).toBeInTheDocument();
    expect(tile("2.1")).toHaveAccessibleName("2.1 Threat actors: covered");
    // Warm-up and 1.1 done: 1.2 is next on their path, as the path's own card would say.
    expect(screen.getByRole("heading", { name: "Next up: Core security concepts" })).toBeInTheDocument();
    expect(screen.getByText(/About 4 minutes of quick questions\./)).toBeInTheDocument();
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
    expect(screen.getByText("1 of 3 topics started")).toBeInTheDocument();
  });

  it("hands the round to the account they make, counts it once, and opens their path", async () => {
    renderRound();
    play(true);
    play(true, true);

    expect(screen.getByText(/Free account, no card\./)).toBeInTheDocument();
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

  it("never hands another account's copy on a shared device to the one just made", async () => {
    seed("user-1", EMPTY_PATH_PROGRESS);
    renderRound();
    play(true);
    play(true, true);
    signUp();

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/path/${CERT}`));
    expect(JSON.parse(store.get(KEY)!).owner).toBe("user-1");
  });

  it("gives someone signed in the way back to their path, not a signup", () => {
    auth.session = { user: { id: "user-1", email: "a@b.co" } };
    seed("user-1", recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1));
    renderRound();
    play(true);
    play(true, true);

    expect(screen.queryByRole("button", { name: "Save and continue" })).toBeNull();
    expect(track).not.toHaveBeenCalledWith("path_save_viewed", expect.anything());
    expect(screen.getByText("This round counts on your path")).toBeInTheDocument();
    // Their own map, the earlier work on this device included.
    expect(screen.getByText("2 of 3 objectives started")).toBeInTheDocument();

    const on = screen.getByRole("link", { name: /Continue/ });
    expect(on).toHaveAttribute("href", `/path/${CERT}`);
    // jsdom can't follow a link; the click is all that's under test.
    on.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(on);
    expect(track).toHaveBeenCalledWith("path_exam_picked", { cert: CERT, surface: "objective_page" });
  });

  it("shows someone signed in only this round when the device's copy is another account's", () => {
    auth.session = { user: { id: "user-2", email: "c@d.co" } };
    seed("user-1", recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1));
    renderRound();
    play(true);
    play(true, true);

    expect(screen.getByText("1 of 3 objectives started")).toBeInTheDocument();
    expect(tile("2.1")).toHaveAccessibleName("2.1 Threat actors: not started");
    // Their path can't pick this round up from another account's copy, so it doesn't say it will.
    expect(screen.queryByText("This round counts on your path")).toBeNull();
    expect(screen.getByRole("link", { name: /Continue/ })).toHaveAttribute("href", `/path/${CERT}`);
  });

  it("keeps an account's map off a device that's signed out", () => {
    seed("user-1", recordRep(EMPTY_PATH_PROGRESS, "a|2.1|z", true, 1));
    renderRound();
    play(true);
    play(true, true);

    // Only this round shows; the account's own work stays out of sight.
    expect(screen.getByText("1 of 3 objectives started")).toBeInTheDocument();
    expect(tile("2.1")).toHaveAccessibleName("2.1 Threat actors: not started");
    expect(screen.getByRole("heading", { name: "Save your map" })).toBeInTheDocument();
    // The round still joins the account's copy, as before.
    const saved = JSON.parse(store.get(KEY)!);
    expect(saved.owner).toBe("user-1");
    expect(Object.keys(saved.progress.items)).toEqual(["a|2.1|z", "a|1.1|x", "a|1.1|y"]);
  });

  it("picks the result back up after a Google sign-in they backed out of", async () => {
    seed(null, finishStop(recordRep(EMPTY_PATH_PROGRESS, "a|1.1|x", true, 1), "1.1", 1, 2, 1));
    window.history.replaceState(null, "", "/objectives/security-plus-sy0-701/1-1?signin_cancelled=1");
    renderRound();

    // Not the first question again: the score they left, and the ask that says what happened.
    expect(await screen.findByText("of 2")).toBeInTheDocument();
    expect(screen.queryByText("Prompt a|1.1|x")).toBeNull();
    expect(screen.getByRole("heading", { name: "Save your map" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /Play again/ }));

    expect(screen.getByText("Prompt a|1.1|x")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your Security+ map" })).toBeNull();
    play(true);
    play(false, true);
    expect(JSON.parse(store.get(KEY)!).progress.stops["1.1"]).toMatchObject({ n: 2, c: 1, t: 2 });
  });

  it("keeps an existing owner when adding to a signed-in device's path", () => {
    seed("user-1", EMPTY_PATH_PROGRESS);
    render(
      <QuickRound
        cert={CERT}
        stopId="warmup"
        examName="Security+"
        structure={structure}
        reps={[rep("a|4.5|w1", "4.5")]}
        label="Security+ warm-up"
        surface="practice_test_page"
      />
    );
    play(true, true);
    const saved = JSON.parse(store.get(KEY)!);
    expect(saved.owner).toBe("user-1");
    expect(saved.progress.stops.warmup.n).toBe(1);
  });
});
