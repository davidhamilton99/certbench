// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { OrderingScenario } from "@/data/pbq/types";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));

let signedInAs: string | null = null;
vi.mock("@/components/auth/useSignedIn", () => ({ useSessionUserId: () => signedInAs }));

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

const LABS: FreeLab[] = [
  { scenario: DORA, tier: "Warm-up", minutes: 3 },
  { scenario: OSI, tier: "Core", minutes: 3 },
  { scenario: BOOT, tier: "Exam-level", minutes: 10 },
];

function lab() {
  return <PbqLab labs={LABS} examName="Network+" pathHref="/path/network-plus-n10-009" labCount={20} />;
}

const chooser = () => within(screen.getByRole("group", { name: "Pick a lab" }));
const choices = () => within(screen.getByRole("group", { name: "Choices to place" }));

function solve(items: string[]) {
  for (const item of items) fireEvent.click(choices().getByRole("button", { name: item }));
  fireEvent.click(screen.getByRole("button", { name: "Check my order" }));
}

beforeEach(() => {
  track.mockClear();
  signedInAs = null;
});

afterEach(() => {
  cleanup();
});

describe("PbqLab", () => {
  it("opens on the warm-up in the path's own lab player, and counts the start", () => {
    render(lab());
    expect(chooser().getByRole("button", { name: /^Warm-up: DHCP DORA, about 3 minutes/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("heading", { name: "DHCP DORA" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "dora", scenario_type: "ordering", surface: "public" });
    // Nothing to lead on to before a lab is graded.
    expect(screen.queryByText(/Next · your Network\+ path/)).toBeNull();
  });

  it("switches labs from the chooser", () => {
    render(lab());
    fireEvent.click(chooser().getByRole("button", { name: /^Exam-level: Boot order/ }));
    expect(chooser().getByRole("button", { name: /^Exam-level: Boot order/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Boot order" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "boot", scenario_type: "ordering", surface: "public" });
  });

  it("once a lab is graded, leads onto the exam's path with the next lab one tap away", () => {
    render(lab());
    solve(DORA.items);
    expect(screen.getByText("100%")).toBeInTheDocument();

    expect(screen.getByText("Next · your Network+ path")).toBeInTheDocument();
    expect(screen.getByText(/Pro adds all 20 Network\+ labs to it, one closing each domain\./)).toBeInTheDocument();
    expect(screen.getByText("Free, no account needed to start.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "public_pbq" });
    // The lab's tile shows it done.
    expect(chooser().getByRole("button", { name: /^Warm-up: DHCP DORA, about 3 minutes, done$/ })).toBeInTheDocument();

    const start = screen.getByRole("link", { name: /^Start my path/ });
    expect(start).toHaveAttribute("href", "/path/network-plus-n10-009");
    start.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(start);
    expect(track).toHaveBeenCalledWith("upsell_clicked", { context: "public_pbq", href: "/path/network-plus-n10-009" });

    fireEvent.click(screen.getByRole("button", { name: "Try the core lab" }));
    expect(screen.getByRole("heading", { name: "OSI layers" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "osi", scenario_type: "ordering", surface: "public" });
    // Still the way on while they play the next one.
    expect(screen.getByRole("link", { name: /^Start my path/ })).toBeInTheDocument();
    // The next one offered skips the lab on screen and the one done.
    expect(screen.getByRole("button", { name: "Try the exam-level lab" })).toBeInTheDocument();
  });

  it("offers no other lab once all three are done", () => {
    render(lab());
    solve(DORA.items);
    fireEvent.click(screen.getByRole("button", { name: "Try the core lab" }));
    solve(OSI.items);
    fireEvent.click(screen.getByRole("button", { name: "Try the exam-level lab" }));
    solve(BOOT.items);
    expect(screen.queryByRole("button", { name: /^Try the/ })).toBeNull();
    // The upsell is counted once a visit, not once a lab.
    expect(track.mock.calls.filter(([e]) => e === "upsell_viewed")).toHaveLength(1);
  });

  it("opens the path for someone signed in", () => {
    signedInAs = "u1";
    render(lab());
    solve(DORA.items);
    expect(screen.getByRole("link", { name: /^Open my path/ })).toHaveAttribute("href", "/path/network-plus-n10-009");
    expect(screen.queryByText("Free, no account needed to start.")).toBeNull();
  });

  it("lists the free labs past the chooser's three under the stage, and plays one", () => {
    const CABLES = { ...ordering("cables", "Cable speeds", ["Cat 5e", "Cat 6", "Cat 6a"]), domain_number: "2.0", domain_title: "Network Implementation" };
    const PORTS = ordering("ports", "Port numbers", ["FTP", "SSH", "Telnet"]);
    render(
      <PbqLab
        labs={[...LABS, { scenario: CABLES, tier: "Core", minutes: 3 }, { scenario: PORTS, tier: "Warm-up", minutes: 3 }]}
        examName="Network+"
        pathHref="/path/network-plus-n10-009"
        labCount={20}
      />
    );
    // The chooser keeps its three.
    expect(chooser().getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "2 more free labs" })).toBeInTheDocument();
    // A domain at a time, in exam order.
    const domains = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(domains).toEqual(["1Networking Concepts", "2Network Implementation"]);

    fireEvent.click(screen.getByRole("button", { name: "Cable speeds, Ordering drill · 3 min" }));
    expect(screen.getByRole("button", { name: "Cable speeds, Ordering drill · 3 min" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Cable speeds" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "cables", scenario_type: "ordering", surface: "public" });
    solve(CABLES.items);
    expect(screen.getByRole("button", { name: "Cable speeds, Ordering drill · 3 min, done" })).toBeInTheDocument();
  });

  it("goes back to the other labs from the player", () => {
    render(lab());
    solve(DORA.items);
    // The result's button (the player's back arrow says the same).
    const back = screen.getAllByRole("button", { name: "Pick another lab" });
    expect(back).toHaveLength(2);
    fireEvent.click(back[1]);
    expect(document.activeElement).toBe(chooser().getByRole("button", { name: /^Warm-up: DHCP DORA/ }));
  });
});
