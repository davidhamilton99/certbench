// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { OrderingScenario, PbqScenario } from "@/data/pbq/types";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));

// The account form: one press stands in for signing up.
vi.mock("@/components/auth/InlineSignup", () => ({
  InlineSignup: ({
    submitLabel,
    onSignedIn,
  }: {
    submitLabel: string;
    onSignedIn: (id: string, email: string | undefined, method: "email_signup") => void;
  }) => (
    <button type="button" onClick={() => onSignedIn("u9", "new@example.com", "email_signup")}>
      {submitLabel}
    </button>
  ),
}));

let signedInAs: string | null = null;
vi.mock("@/components/auth/useSignedIn", () => ({ useSessionUserId: () => signedInAs }));

// The lab player has its own tests. Here it is a stand-in that shows which lab
// it was given and lets a test make the first move, finish the lab and leave.
const mounts = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/components/workspace/PbqPlayer", async () => {
  const { useEffect } = await import("react");
  return {
    PbqPlayer: ({
      scenario,
      backLabel,
      onBack,
      onGraded,
      onStarted,
      takeFocus,
    }: {
      scenario: PbqScenario;
      backLabel?: string;
      onBack: () => void;
      onGraded?: (result: unknown) => void;
      onStarted?: () => void;
      takeFocus?: boolean;
    }) => {
      useEffect(() => {
        mounts.count += 1;
      }, []);
      return (
        <div data-testid="lab" data-take-focus={String(Boolean(takeFocus))}>
          <p>Lab on the stage: {scenario.title}</p>
          <button type="button" onClick={() => onStarted?.()}>
            Make the first move
          </button>
          <button type="button" onClick={() => onGraded?.({ score: 1 })}>
            Finish the lab
          </button>
          <button type="button" onClick={onBack}>
            {backLabel}
          </button>
        </div>
      );
    },
  };
});

const preloadLab = vi.hoisted(() => vi.fn());
// The real module with one function watched: the lab player reads its loaders from it.
vi.mock("@/components/workspace/pbq-host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/workspace/pbq-host")>()),
  preloadLab,
}));

import { PbqLab, type FreeLab } from "../PbqLab";

function ordering(id: string, title: string, items: string[]): OrderingScenario {
  return {
    type: "ordering",
    id,
    title,
    description: `Put ${title} in order.`,
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    items,
    correct_order: items.map((_, i) => i),
    explanation: `${items.join(", ")}.`,
  };
}

const DORA = ordering("dora", "DHCP DORA", ["Discover", "Offer", "Request", "Acknowledge"]);
const OSI = ordering("osi", "OSI layers", ["Physical", "Data link", "Network"]);
const BOOT = ordering("boot", "Boot order", ["POST", "Bootloader", "Kernel"]);
const CABLES: OrderingScenario = {
  ...ordering("cables", "Cable speeds", ["Cat 5e", "Cat 6", "Cat 6a"]),
  domain_number: "2.0",
  domain_title: "Network Implementation",
};
const PORTS = ordering("ports", "Port numbers", ["FTP", "SSH", "Telnet"]);

const LABS: FreeLab[] = [
  { scenario: DORA, tier: "Introductory", minutes: 3 },
  { scenario: OSI, tier: "Core", minutes: 3 },
  { scenario: BOOT, tier: "Exam level", minutes: 10 },
];

function lab(labs: FreeLab[] = LABS) {
  return <PbqLab labs={labs} examName="Network+" pathHref="/path/network-plus-n10-009" labCount={20} />;
}

const chooser = () => within(screen.getByRole("group", { name: "Choose a lab" }));
const onStage = () => screen.getByTestId("lab");
const finish = () => fireEvent.click(screen.getByRole("button", { name: "Finish the lab" }));

/**
 * A control named by its parts in order, with a comma between them. (The test
 * library drops the space after a comma that stands in an element of its own;
 * a browser keeps it. Either way the words and their order are the same.)
 */
function named(...parts: string[]): RegExp {
  const literal = (text: string) => text.replace(/[+?.()]/g, (ch) => `[${ch}]`);
  return new RegExp(`^${parts.map(literal).join(", ?")}$`);
}

const DORA_TILE = named("3 minutes", "Introductory", "DHCP DORA");
const OSI_TILE = named("3 minutes", "Core", "OSI layers");
const BOOT_TILE = named("10 minutes", "Exam level", "Boot order");
const CABLES_ROW = named("Cable speeds", "Ordering drill", "3 minutes");
const PORTS_ROW = named("Port numbers", "Ordering drill", "3 minutes");

beforeEach(() => {
  track.mockClear();
  preloadLab.mockClear();
  mounts.count = 0;
  signedInAs = null;
});

afterEach(() => {
  cleanup();
});

describe("PbqLab", () => {
  it("opens on the introductory lab, and counts the lab shown as it always has", () => {
    render(lab());
    expect(chooser().getByRole("button", { name: DORA_TILE })).toHaveAttribute("aria-pressed", "true");
    expect(onStage()).toHaveTextContent("Lab on the stage: DHCP DORA");
    // The lab that is on the page as it loads does not take the focus.
    expect(onStage()).toHaveAttribute("data-take-focus", "false");
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "dora", scenario_type: "ordering", surface: "public" });
    // Looking at a lab is not a move in it.
    expect(track).not.toHaveBeenCalledWith("pbq_first_move", expect.anything());
    // Nothing to lead on to before a lab is graded.
    expect(screen.queryByRole("link", { name: /study path/ })).toBeNull();
  });

  it("names each tile by the words printed on it, in the order they are printed", () => {
    render(lab());
    const tiles = chooser().getAllByRole("button");
    expect(tiles.map((t) => t.textContent)).toEqual([
      "3 minutes, Introductory, DHCP DORA",
      "3 minutes, Core, OSI layers",
      "10 minutes, Exam level, Boot order",
    ]);
    for (const tile of tiles) {
      // The name is the tile's own text: nothing replaces it, and no tooltip differs from it.
      expect(tile).not.toHaveAttribute("aria-label");
      expect(tile).not.toHaveAttribute("title");
    }
    // The time is written out, not abbreviated.
    expect(screen.queryByText(/\bmin\b/)).toBeNull();
  });

  it("records the first move made in a lab as its own event, once the player reports it", () => {
    render(lab());
    fireEvent.click(screen.getByRole("button", { name: "Make the first move" }));
    expect(track).toHaveBeenCalledWith("pbq_first_move", {
      scenario_id: "dora",
      scenario_type: "ordering",
      surface: "public",
    });
    // The event that counts a lab shown is unchanged: one for the lab on the page.
    expect(track.mock.calls.filter(([event]) => event === "pbq_started")).toHaveLength(1);
  });

  it("switches labs from the chooser, and the tile keeps the focus as a tab does", () => {
    render(lab());
    const boot = chooser().getByRole("button", { name: BOOT_TILE });
    boot.focus();
    fireEvent.click(boot);
    expect(boot).toHaveAttribute("aria-pressed", "true");
    expect(onStage()).toHaveTextContent("Lab on the stage: Boot order");
    expect(onStage()).toHaveAttribute("data-take-focus", "false");
    expect(boot).toHaveFocus();
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "boot", scenario_type: "ordering", surface: "public" });
  });

  it("starts fetching a lab's player when its tile is pointed at or takes the focus", () => {
    render(lab());
    const core = chooser().getByRole("button", { name: OSI_TILE });
    fireEvent.pointerEnter(core);
    expect(preloadLab).toHaveBeenCalledWith("ordering");
    preloadLab.mockClear();
    fireEvent.focus(core);
    expect(preloadLab).toHaveBeenCalledWith("ordering");
  });

  it("once a lab is graded, leads on to the exam's study path with the next lab one press away", () => {
    render(lab());
    finish();

    expect(
      screen.getByRole("heading", { name: "PBQs are one part of the Network+ exam. The study path covers all of it." })
    ).toBeInTheDocument();
    expect(screen.getByText(/Pro adds all 20 Network\+ labs to it, with one at the end of each domain\./)).toBeInTheDocument();
    expect(screen.getByText("It is free, and you do not need an account to start.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "public_pbq" });
    // The lab's tile says that it is completed, in words.
    expect(
      chooser().getByRole("button", { name: named("3 minutes", "Introductory", "DHCP DORA", "completed") })
    ).toBeInTheDocument();

    const start = screen.getByRole("link", { name: /^Start the study path/ });
    expect(start).toHaveAttribute("href", "/path/network-plus-n10-009");
    start.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(start);
    expect(track).toHaveBeenCalledWith("upsell_clicked", { context: "public_pbq", href: "/path/network-plus-n10-009" });

    fireEvent.click(screen.getByRole("button", { name: "Try the core lab" }));
    expect(onStage()).toHaveTextContent("Lab on the stage: OSI layers");
    // Opened from under the stage, which is scrolled into view: the lab takes the focus.
    expect(onStage()).toHaveAttribute("data-take-focus", "true");
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "osi", scenario_type: "ordering", surface: "public" });
    // The study path is still the way on while the next lab is played.
    expect(screen.getByRole("link", { name: /^Start the study path/ })).toBeInTheDocument();
    // The next one offered skips the lab on the stage and the one completed.
    expect(screen.getByRole("button", { name: "Try the exam level lab" })).toBeInTheDocument();
  });

  it("offers no other lab once all three are completed", () => {
    render(lab());
    finish();
    fireEvent.click(screen.getByRole("button", { name: "Try the core lab" }));
    finish();
    fireEvent.click(screen.getByRole("button", { name: "Try the exam level lab" }));
    finish();
    expect(screen.queryByRole("button", { name: /^Try the/ })).toBeNull();
    // The offer is counted once a visit, not once a lab.
    expect(track.mock.calls.filter(([e]) => e === "upsell_viewed")).toHaveLength(1);
  });

  it("opens the study path for someone signed in", () => {
    signedInAs = "u1";
    render(lab());
    finish();
    expect(screen.getByRole("link", { name: /^Open the study path/ })).toHaveAttribute("href", "/path/network-plus-n10-009");
    expect(screen.queryByText("It is free, and you do not need an account to start.")).toBeNull();
  });

  it("lists the free labs past the chooser's three under the stage, and opens one with a free account", () => {
    render(
      lab([...LABS, { scenario: CABLES, tier: "Core", minutes: 3 }, { scenario: PORTS, tier: "Introductory", minutes: 1 }])
    );
    // The chooser keeps its three.
    expect(chooser().getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 2, name: "2 more free labs" })).toBeInTheDocument();
    // One domain at a time, in exam order, and each heading reads as words.
    const domains = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(domains).toEqual(["Domain 1: Networking Concepts", "Domain 2: Network Implementation"]);

    expect(screen.getByText(/^These labs are free with an account\./)).toBeInTheDocument();

    // A row is named by its title and its line, as printed.
    const row = screen.getByRole("button", { name: CABLES_ROW });
    expect(row).not.toHaveAttribute("aria-label");
    expect(row).toHaveTextContent("Cable speeds, Ordering drill, 3 minutes");
    expect(screen.getByRole("button", { name: named("Port numbers", "Ordering drill", "1 minute") })).toBeInTheDocument();

    // Signed out, the stage asks for the account first, and the ask takes the focus.
    fireEvent.click(row);
    const ask = screen.getByRole("heading", { level: 2, name: "A free account opens 2 more free labs." });
    expect(ask).toHaveFocus();
    // Nothing that is not kept is promised.
    expect(screen.queryByText(/keeps your results/)).toBeNull();
    expect(screen.queryByTestId("lab")).toBeNull();
    expect(track).toHaveBeenCalledWith("pbq_gate_viewed", { scenario_id: "cables" });
    // A lab that was not shown is not counted as shown.
    expect(track).not.toHaveBeenCalledWith("pbq_started", expect.objectContaining({ scenario_id: "cables" }));

    fireEvent.click(screen.getByRole("button", { name: "Open the labs" }));
    expect(track).toHaveBeenCalledWith("pbq_account_linked", { scenario_id: "cables", method: "email_signup" });
    expect(screen.getByRole("button", { name: CABLES_ROW })).toHaveAttribute("aria-pressed", "true");
    expect(onStage()).toHaveTextContent("Lab on the stage: Cable speeds");
    // The form that held the focus is gone: the lab takes it.
    expect(onStage()).toHaveAttribute("data-take-focus", "true");
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "cables", scenario_type: "ordering", surface: "public" });
    finish();
    expect(
      screen.getByRole("button", { name: named("Cable speeds", "Ordering drill", "3 minutes", "completed") })
    ).toBeInTheDocument();
  });

  it("says one lab in the singular", () => {
    render(lab([...LABS, { scenario: PORTS, tier: "Introductory", minutes: 3 }]));
    expect(screen.getByRole("heading", { level: 2, name: "1 more free lab" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: PORTS_ROW }));
    expect(screen.getByRole("heading", { level: 2, name: "A free account opens 1 more free lab." })).toBeInTheDocument();
  });

  it("plays a listed lab at once for someone signed in, with the focus on the stage", () => {
    signedInAs = "u1";
    render(lab([...LABS, { scenario: PORTS, tier: "Introductory", minutes: 3 }]));
    expect(screen.queryByText(/^These labs are free with an account\./)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: PORTS_ROW }));
    expect(onStage()).toHaveTextContent("Lab on the stage: Port numbers");
    expect(onStage()).toHaveAttribute("data-take-focus", "true");
    expect(track).not.toHaveBeenCalledWith("pbq_gate_viewed", expect.anything());
  });

  it("keeps a lab in hand when its own tile is pressed again", () => {
    render(lab());
    expect(mounts.count).toBe(1);
    fireEvent.click(chooser().getByRole("button", { name: DORA_TILE }));
    // The same player, not a new one: work in progress is not thrown away.
    expect(mounts.count).toBe(1);
  });

  it("goes back to the other labs from the player", () => {
    render(lab());
    fireEvent.click(screen.getByRole("button", { name: "Choose another lab" }));
    expect(chooser().getByRole("button", { name: DORA_TILE })).toHaveFocus();
  });

  it("goes back to the first of the three when the lab in hand is one from the list", () => {
    signedInAs = "u1";
    render(lab([...LABS, { scenario: PORTS, tier: "Introductory", minutes: 3 }]));
    fireEvent.click(screen.getByRole("button", { name: PORTS_ROW }));
    fireEvent.click(screen.getByRole("button", { name: "Choose another lab" }));
    expect(chooser().getAllByRole("button")[0]).toHaveFocus();
  });
});
