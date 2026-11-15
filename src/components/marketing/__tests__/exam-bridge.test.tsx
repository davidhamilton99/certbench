// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

/** The session the mocked Supabase client reports to auth listeners. */
const auth = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  listeners: [] as ((event: string, session: unknown) => void)[],
}));

vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        auth.listeners.push(cb);
        queueMicrotask(() => cb("INITIAL_SESSION", auth.session));
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                auth.listeners = auth.listeners.filter((l) => l !== cb);
              },
            },
          },
        };
      },
    },
  }),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/tools/port-numbers-quiz" }));

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));

import { HeaderAccountLinks } from "@/components/marketing/HeaderAccountLinks";
import { ReadinessCheck } from "@/components/marketing/ReadinessCheck";
import { EXAMS, PathLead, RoundComplete } from "@/components/marketing/DrillRound";
import type { DrillRounds } from "@/components/marketing/useDrillRounds";

beforeEach(() => {
  auth.session = null;
  auth.listeners = [];
  track.mockClear();
});

describe("HeaderAccountLinks", () => {
  it("offers sign in and get started to a visitor", async () => {
    render(<HeaderAccountLinks />);
    await act(async () => {});
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/start");
  });

  it("becomes a way into the app once signed in", async () => {
    auth.session = { user: { id: "u1" } };
    render(<HeaderAccountLinks />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Your path" })).toHaveAttribute("href", "/start")
    );
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("switches the moment an inline signup creates a session", async () => {
    render(<HeaderAccountLinks />);
    await act(async () => {});
    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
    act(() => auth.listeners.forEach((l) => l("SIGNED_IN", { user: { id: "u1" } })));
    expect(screen.getByRole("link", { name: "Your path" })).toBeInTheDocument();
  });
});

describe("ReadinessCheck result", () => {
  const questions = [
    {
      questionText: "Which port does DNS use?",
      options: ["53", "80"],
      correctIndex: 0,
      explanation: "DNS is 53.",
      domainTitle: "Networking Concepts",
      examWeight: 1,
    },
  ];

  async function finish() {
    render(
      <ReadinessCheck
        cert="network-plus-n10-009"
        questions={questions}
        shortCertName="Network+"
        objectiveCount={5}
      />
    );
    await act(async () => {});
    fireEvent.click(screen.getByRole("radio", { name: /53/ }));
    fireEvent.click(screen.getByRole("button", { name: /See my estimate/ }));
    return screen.getByRole("link", { name: /Network\+ path/i });
  }

  it("sends everyone on to this exam's guided path", async () => {
    const cta = await finish();
    expect(cta).toHaveAttribute("href", "/path/network-plus-n10-009");
    fireEvent.click(cta);
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "readiness_check",
      href: "/path/network-plus-n10-009",
    });
  });
});

describe("PathLead", () => {
  it("offers a one-tap path per exam and tracks it", () => {
    render(
      <PathLead
        tool="ports"
        title="Ports are a small slice of the exam."
        body="See where you stand."
        exams={[EXAMS.securityPlus, EXAMS.networkPlus, EXAMS.aPlusCore1]}
        signedIn={false}
      />
    );
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "drill_bridge_ports" });
    expect(screen.getByText("Which exam are you taking?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Security+" })).toHaveAttribute(
      "href",
      "/path/security-plus-sy0-701"
    );
    expect(screen.getByRole("link", { name: "A+ Core 1" })).toHaveAttribute(
      "href",
      "/path/a-plus-core1-220-1201"
    );
    expect(screen.getByText("Free, no account needed to start.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Network+" }));
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "drill_bridge_ports",
      href: "/path/network-plus-n10-009",
    });
  });

  it("names the exam on a single-exam drill, and opens it for someone signed in", () => {
    const { rerender } = render(
      <PathLead tool="acronyms" title="Acronyms." body="See where you stand." exams={[EXAMS.securityPlus]} signedIn={false} />
    );
    expect(screen.getByRole("link", { name: "Start my Security+ path" })).toBeInTheDocument();
    rerender(
      <PathLead tool="acronyms" title="Acronyms." body="See where you stand." exams={[EXAMS.securityPlus]} signedIn />
    );
    expect(screen.getByRole("link", { name: "Open my Security+ path" })).toBeInTheDocument();
    // Someone signed in already has an account: no "no account needed" line.
    expect(screen.queryByText("Free, no account needed to start.")).toBeNull();
  });
});

const LEAD = {
  title: "Ports are a small slice of the exam.",
  body: "See where you stand.",
  exams: [EXAMS.networkPlus],
};

function roundEnd(rounds: DrillRounds) {
  return render(
    <RoundComplete
      rounds={rounds}
      label="Port numbers"
      noun={["port", "ports"]}
      tiles={[
        { id: "22", label: "22", status: "got" },
        { id: "53", label: "53", status: "missed" },
        { id: "80", label: "80", status: "new" },
      ]}
      variant="labels"
      mapTitle="Your port map"
      lead={LEAD}
    />
  );
}

describe("RoundComplete for a signed-in visitor", () => {
  const rounds = {
    tool: "ports",
    signedIn: true,
    gated: false,
    roundNumber: 2,
    roundCorrect: 14,
    size: 20,
    linked: false,
    account: "saved",
    startNextRound: vi.fn(),
  } as unknown as DrillRounds;

  it("leads with the exam's path, with the next round still one tap away", () => {
    roundEnd(rounds);
    const result = screen.getByRole("group", { name: "Port numbers: round 2 result" });
    expect(result).toHaveTextContent("14 of 20");
    expect(result).toHaveTextContent("Round 3 starts with your 1 miss, then the 1 you haven't seen yet.");
    const path = screen.getByRole("link", { name: /Network\+ path/ });
    const next = screen.getByRole("button", { name: /Start round 3/ });
    // The path comes first in reading order; the round button follows it.
    expect(path.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save and start round/ })).toBeNull();
    expect(track).not.toHaveBeenCalledWith("drill_gate_viewed", expect.anything());
    fireEvent.click(next);
    expect(rounds.startNextRound).toHaveBeenCalled();
  });
});

describe("RoundComplete for a visitor with no account", () => {
  const rounds = {
    tool: "ports",
    signedIn: false,
    gated: true,
    roundNumber: 1,
    roundCorrect: 18,
    size: 20,
    linked: false,
    account: "none",
    startNextRound: vi.fn(),
    linkAccount: vi.fn(),
  } as unknown as DrillRounds;

  it("leads with the exam's path, then saves their map with an account to play round 2", () => {
    roundEnd(rounds);
    const path = screen.getByRole("link", { name: /Start my Network\+ path/ });
    expect(path).toHaveAttribute("href", "/path/network-plus-n10-009");
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "drill_bridge_ports" });

    // No round 2 without an account: the map is what one saves.
    expect(screen.queryByRole("button", { name: /^Start round 2/ })).toBeNull();
    const map = screen.getByRole("heading", { name: "Your port map" });
    const save = screen.getByRole("heading", { name: "Save your map and play round 2" });
    const submit = screen.getByRole("button", { name: "Save and start round 2" });
    expect(path.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(map.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submit).toBeInTheDocument();
    expect(screen.getByText("2 of 3 seen")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("drill_gate_viewed", { tool: "ports" });
  });
});
