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
import { EXAMS, ExamBridge, RoundComplete } from "@/components/marketing/DrillRound";
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
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
  });

  it("becomes a way into the app once signed in", async () => {
    auth.session = { user: { id: "u1" } };
    render(<HeaderAccountLinks />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Your plan" })).toHaveAttribute("href", "/dashboard")
    );
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("switches the moment an inline signup creates a session", async () => {
    render(<HeaderAccountLinks />);
    await act(async () => {});
    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
    act(() => auth.listeners.forEach((l) => l("SIGNED_IN", { user: { id: "u1" } })));
    expect(screen.getByRole("link", { name: "Your plan" })).toBeInTheDocument();
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
    return screen.getByRole("link", { name: /real readiness score/i });
  }

  it("sends a visitor to sign up", async () => {
    expect(await finish()).toHaveAttribute("href", "/register");
  });

  it("takes a signed-in visitor into the goal flow with this exam picked", async () => {
    auth.session = { user: { id: "u1" } };
    const cta = await finish();
    await waitFor(() => expect(cta).toHaveAttribute("href", "/onboarding?cert=network-plus-n10-009"));
    fireEvent.click(cta);
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "readiness_check",
      href: "/onboarding?cert=network-plus-n10-009",
    });
  });
});

describe("ExamBridge", () => {
  it("offers a one-tap readiness check per exam and tracks it", () => {
    render(
      <ExamBridge tool="ports" title="Ports are a small slice of the exam." exams={[EXAMS.securityPlus, EXAMS.networkPlus, EXAMS.aPlusCore1]}>
        See where you stand.
      </ExamBridge>
    );
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "drill_bridge_ports" });
    expect(screen.getByRole("link", { name: "Security+" })).toHaveAttribute(
      "href",
      "/readiness-check/security-plus-sy0-701"
    );
    expect(screen.getByRole("link", { name: "A+ Core 1" })).toHaveAttribute(
      "href",
      "/readiness-check/a-plus-core1-220-1101"
    );
    fireEvent.click(screen.getByRole("link", { name: "Network+" }));
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "drill_bridge_ports",
      href: "/readiness-check/network-plus-n10-009",
    });
  });

  it("names the exam on a single-exam drill", () => {
    render(
      <ExamBridge tool="acronyms" title="Acronyms." exams={[EXAMS.securityPlus]}>
        See where you stand.
      </ExamBridge>
    );
    expect(screen.getByRole("link", { name: "Check my Security+ readiness" })).toBeInTheDocument();
  });
});

describe("RoundComplete for a signed-in visitor", () => {
  const rounds = {
    tool: "ports",
    gated: false,
    roundNumber: 2,
    roundCorrect: 14,
    size: 20,
    linked: false,
    account: "saved",
    startNextRound: vi.fn(),
  } as unknown as DrillRounds;

  it("leads with the exam bridge, with the next round still one tap away", () => {
    render(
      <RoundComplete
        rounds={rounds}
        noun={["port", "ports"]}
        tiles={[{ id: "22", label: "22", status: "got" }]}
        variant="labels"
        extra={
          <ExamBridge tool="ports" title="Ports are a small slice of the exam." exams={[EXAMS.networkPlus]}>
            See where you stand.
          </ExamBridge>
        }
      />
    );
    const bridge = screen.getByRole("link", { name: /Network\+ readiness/ });
    const next = screen.getByRole("button", { name: /Start round 3/ });
    // The bridge comes first in reading order; the round button follows it.
    expect(bridge.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(next);
    expect(rounds.startNextRound).toHaveBeenCalled();
  });
});
