// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { SimFieldAnswer, TopologyScenario } from "@/data/pbq/types";
import { gradeTopologyScenario } from "@/core/pbq/grade-topology";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { TopologyPlayer } from "../TopologyPlayer";
import { MOVE_ADVANCE_MS, STEP_ADVANCE_MS } from "../SimMoves";

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

const chip = (name: string) => screen.getByRole("button", { name });
const status = () => screen.getByRole("status");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  track.mockClear();
});

describe("topology labs, played on the map", () => {
  it("opens on the map with what to fix flagged, the first device's config up and its first setting as tiles", () => {
    render(<TopologyPlayer scenario={net} onBack={vi.fn()} />);
    expect(screen.getByText("2 to fix")).toBeInTheDocument();
    expect(chip("R1, being fixed")).toHaveAttribute("aria-pressed", "true");
    expect(chip("PC1, needs fixing")).toBeInTheDocument();
    expect(chip("SW1, checks out")).toBeInTheDocument();
    expect(screen.getByText("Device 1 of 2 · R1")).toBeInTheDocument();
    expect(screen.getByText("R1 · current config")).toBeInTheDocument();
    expect(screen.getByText("Default route next hop")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText(/Submit Configuration/)).toBeNull();
  });

  it("shows any device's config when it's tapped, and goes back to the one being fixed", () => {
    render(<TopologyPlayer scenario={net} onBack={vi.fn()} />);
    fireEvent.click(chip("SW1, checks out"));
    expect(screen.getByText("SW1 · current config")).toBeInTheDocument();
    expect(screen.getByText("vlan 10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Back to R1/ }));
    expect(screen.getByText("R1 · current config")).toBeInTheDocument();
    // A device with nothing to read can't be opened.
    expect(chip("ISP, checks out")).toBeDisabled();
  });

  it("fixes device by device, marks each on the map, and grades once with the topology grader", () => {
    const onGraded = vi.fn();
    render(<TopologyPlayer scenario={net} onBack={vi.fn()} onGraded={onGraded} />);

    fireEvent.click(screen.getByRole("radio", { name: "203.0.113.1" }));
    expect(status()).toHaveTextContent("Right.");
    act(() => vi.advanceTimersByTime(MOVE_ADVANCE_MS));
    fireEvent.change(screen.getByRole("textbox", { name: "LAN interface address" }), { target: { value: "192.168.1.1" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    act(() => vi.advanceTimersByTime(MOVE_ADVANCE_MS));

    expect(screen.getByText("Device 1 of 2 done")).toBeInTheDocument();
    expect(screen.getByText("All 2 right")).toBeInTheDocument();
    expect(chip("R1, fixed")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("sim_stage_cleared", {
      scenario_id: "topo-test",
      stage: 1,
      stages: 2,
      correct: 2,
      total: 2,
    });

    fireEvent.click(screen.getByRole("button", { name: /^Next device/ }));
    expect(screen.getByText("Device 2 of 2 · PC1")).toBeInTheDocument();
    expect(screen.getByText("PC1 · current config")).toBeInTheDocument();
    expect(screen.getByText("Settings to change")).toBeInTheDocument();
    for (let i = 0; i < 3; i++) {
      const card = screen.getByText(/^(Default gateway|DNS server|Hostname)$/).textContent;
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${card === "Hostname" ? "No" : "Yes"}`) }));
      act(() => vi.advanceTimersByTime(i < 2 ? STEP_ADVANCE_MS : MOVE_ADVANCE_MS));
    }
    expect(screen.getByText("Device 2 of 2 done")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^See my score/ }));

    const answers: Record<string, SimFieldAnswer> = {
      "r1-next-hop": { type: "dropdown", selectedIndex: 1 },
      "r1-lan": { type: "text", value: "192.168.1.1" },
      "pc1-change": { type: "select-many", selectedIndices: [0, 1] },
    };
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0]).toEqual(gradeTopologyScenario(net, answers).result);
    expect(screen.getByRole("group", { name: "Your score" })).toHaveTextContent("3 of 3");
    expect(screen.getByText("R1")).toBeInTheDocument();
    expect(screen.getByText("PC1")).toBeInTheDocument();
  });
});
