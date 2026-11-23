// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { SimFieldAnswer, TopologyScenario } from "@/data/pbq/types";
import { gradeTopologyScenario } from "@/core/pbq/grade-topology";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { TopologyPlayer } from "../TopologyPlayer";

const net: TopologyScenario = {
  type: "topology",
  id: "topo-test",
  title: "Branch Office Repair",
  briefing: "Two devices at the branch are misconfigured. Find and fix them.",
  domain_number: "2.0",
  domain_title: "Network Implementation",
  diagramTitle: "Branch LAN",
  devices: [
    {
      id: "isp",
      type: "cloud",
      label: "ISP",
      position: { x: 50, y: 10 },
      preConfigured: true,
      fields: [],
      explanation: "The upstream link.",
    },
    {
      id: "r1",
      type: "router",
      label: "R1",
      position: { x: 50, y: 40 },
      preConfigured: false,
      fields: [
        {
          type: "dropdown",
          id: "r1-next-hop",
          label: "Default route next hop",
          options: ["10.0.0.1", "203.0.113.1"],
          correctIndex: 1,
        },
        { type: "text", id: "r1-lan", label: "LAN interface address", acceptedValues: ["192.168.1.1"] },
      ],
      explanation: "R1's default route points at the ISP.",
      currentConfig: "interface Gi0/0\n ip address 192.168.1.254 255.255.255.0",
    },
    {
      id: "sw1",
      type: "switch",
      label: "SW1",
      position: { x: 50, y: 70 },
      preConfigured: true,
      fields: [],
      explanation: "SW1 is fine.",
      currentConfig: "vlan 10\n name Staff",
    },
    {
      id: "pc1",
      type: "pc",
      label: "PC1",
      position: { x: 30, y: 90 },
      preConfigured: false,
      fields: [
        {
          type: "select-many",
          id: "pc1-change",
          label: "Select ALL settings to change (select all that apply)",
          options: ["Default gateway", "DNS server", "Hostname"],
          correctIndices: [0, 1],
        },
      ],
      explanation: "PC1 needs the router's new address as its gateway and DNS.",
      currentConfig: "IPv4: 192.168.1.20\nGateway: 192.168.1.254",
    },
  ],
  connections: [
    { from: "isp", to: "r1" },
    { from: "r1", to: "sw1" },
    { from: "sw1", to: "pc1" },
  ],
  explanation: "Fix the router first, then the PC that depends on it.",
  estimatedMinutes: 6,
};

/** A device's button under the map: its name and where it stands. */
const chip = (name: string) => screen.getByRole("button", { name });
const button = (name: string | RegExp) => screen.getByRole("button", { name });
/** The button that moves a move on. Its description is the verdict on the answer just given. */
const onward = () => button("Continue");
const answers = (name: string) => within(screen.getByRole("group", { name }));
const score = () => screen.getByRole("group", { name: "Your score" });

afterEach(() => {
  track.mockClear();
});

describe("topology labs, played on the map", () => {
  it("opens on the map with what to fix marked, the first device's configuration up and its first setting as answers", () => {
    render(<TopologyPlayer scenario={net} onBack={vi.fn()} />);
    expect(screen.getByText("2 devices need fixing.")).toBeInTheDocument();
    expect(chip("R1, being fixed")).toHaveAttribute("aria-pressed", "true");
    expect(chip("PC1, needs fixing")).toBeInTheDocument();
    expect(chip("SW1, correct as it is")).toBeInTheDocument();
    expect(screen.getByText("Device 1 of 2: R1")).toBeInTheDocument();
    expect(screen.getByText("R1: current configuration")).toBeInTheDocument();
    expect(answers("Default route next hop").getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByText(/Submit Configuration/)).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("draws every mark on the map from the theme's tokens, and nothing on it pulses", () => {
    const { container } = render(<TopologyPlayer scenario={net} onBack={vi.fn()} />);
    const map = container.querySelector("svg[viewBox='0 0 1000 600']")!;
    const classes = [...map.querySelectorAll("*")].map((el) => el.getAttribute("class") ?? "").join(" ");
    // A mark's fill and what is drawn on it are a token and its own foreground.
    expect(classes).toMatch(/fill-warning\b/);
    expect(classes).toMatch(/fill-warning-foreground\b/);
    expect(classes).toMatch(/stroke-success-foreground\b/);
    expect(classes).not.toMatch(/white|amber|animate-pulse/);
    expect(map.querySelector('[stroke="white"], [fill="white"]')).toBeNull();
    expect(container.querySelector(".animate-pulse")).toBeNull();
    // The device buttons under the map take their marks from the same tokens.
    const chips = within(screen.getByRole("group", { name: "Devices" }));
    const chipClasses = chips
      .getAllByRole("button")
      .flatMap((b) => [b, ...b.querySelectorAll("*")])
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");
    expect(chipClasses).toMatch(/bg-warning text-warning-foreground/);
    expect(chipClasses).not.toMatch(/white|amber|rounded-full/);
    // A device with nothing to open is a picture with a name: its mark is read with it.
    expect(screen.getByRole("img", { name: "ISP cloud, correct as it is" })).toBeInTheDocument();
    // A device's name on the map begins with the words drawn under it ("R1", "router"), then where it stands.
    const r1 = screen.getByRole("button", { name: "R1 router, being fixed" });
    expect(r1).toHaveAttribute("aria-pressed", "true");
    // Its mark is drawn and not typed, so the text inside it is exactly those words.
    expect(r1.textContent).toBe("R1 router");
    expect(r1.getAttribute("aria-label")!.startsWith(r1.textContent!)).toBe(true);
  });

  it("shows any device's configuration when it is chosen, and goes back to the one being fixed", async () => {
    render(<TopologyPlayer scenario={net} onBack={vi.fn()} />);
    fireEvent.click(chip("SW1, correct as it is"));
    expect(screen.getByText("SW1: current configuration")).toBeInTheDocument();
    expect(screen.getByText("vlan 10")).toBeInTheDocument();
    fireEvent.click(button("Return to R1"));
    expect(screen.getByText("R1: current configuration")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Return to R1" })).toBeNull();
    // The link is gone, so the focus goes to the button of the device now shown.
    await waitFor(() => expect(chip("R1, being fixed")).toHaveFocus());
    // A device with nothing to read cannot be opened.
    expect(chip("ISP, correct as it is")).toBeDisabled();
  });

  it("fixes device by device, marks each on the map, and grades once with the topology grader", () => {
    const onGraded = vi.fn();
    const onStarted = vi.fn();
    render(<TopologyPlayer scenario={net} onBack={vi.fn()} onGraded={onGraded} onStarted={onStarted} />);

    // Looking at another device is not a move.
    fireEvent.click(chip("SW1, correct as it is"));
    fireEvent.click(button("Return to R1"));
    expect(onStarted).not.toHaveBeenCalled();

    fireEvent.click(answers("Default route next hop").getByRole("button", { name: "203.0.113.1" }));
    expect(onStarted).toHaveBeenCalledTimes(1);
    expect(onward()).toHaveAccessibleDescription("Correct.");
    fireEvent.click(onward());
    fireEvent.change(screen.getByRole("textbox", { name: "LAN interface address" }), { target: { value: "192.168.1.1" } });
    fireEvent.click(button("Check answer"));
    fireEvent.click(onward());

    expect(screen.getByText("Device 1 of 2 complete")).toBeInTheDocument();
    expect(screen.getByText("You answered all 2 questions correctly.")).toBeInTheDocument();
    expect(chip("R1, fixed")).toBeInTheDocument();
    expect(screen.getByText("1 device needs fixing.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("sim_stage_cleared", {
      scenario_id: "topo-test",
      stage: 1,
      stages: 2,
      correct: 2,
      total: 2,
    });

    fireEvent.click(button(/^Next device/));
    expect(screen.getByText("Device 2 of 2: PC1")).toBeInTheDocument();
    expect(screen.getByText("PC1: current configuration")).toBeInTheDocument();
    expect(screen.getByText("Settings to change")).toBeInTheDocument();
    for (let i = 0; i < 3; i++) {
      const card = screen.getByText(/^(Default gateway|DNS server|Hostname)$/).textContent!;
      fireEvent.click(answers(card).getByRole("button", { name: card === "Hostname" ? "No" : "Yes" }));
      expect(onward()).toHaveAccessibleDescription(/^Correct\./);
      fireEvent.click(onward());
    }
    expect(screen.getByText("Device 2 of 2 complete")).toBeInTheDocument();
    expect(screen.getByText("You answered the question correctly.")).toBeInTheDocument();
    fireEvent.click(button(/^View my score/));

    const given: Record<string, SimFieldAnswer> = {
      "r1-next-hop": { type: "dropdown", selectedIndex: 1 },
      "r1-lan": { type: "text", value: "192.168.1.1" },
      "pc1-change": { type: "select-many", selectedIndices: [0, 1] },
    };
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0]).toEqual(gradeTopologyScenario(net, given).result);
    expect(onStarted).toHaveBeenCalledTimes(1);
    expect(score()).toHaveTextContent("100%");
    expect(score()).toHaveTextContent("You earned 3 of 3 points, including partial credit.");
    expect(screen.getByText("R1")).toBeInTheDocument();
    expect(screen.getByText("PC1")).toBeInTheDocument();
  });
});
