// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { PbqPlayer } from "../PbqPlayer";
import { MOVE_ADVANCE_MS, STEP_ADVANCE_MS } from "../SimMoves";
import { gradeScenario } from "@/core/pbq/grade";
import type { CategorizationScenario, MatchingScenario, OrderingScenario } from "@/data/pbq/types";

const dora: OrderingScenario = {
  type: "ordering",
  id: "dhcp-dora-test",
  title: "DHCP DORA",
  description: "Put the four DHCP messages in order.",
  domain_number: "1.0",
  domain_title: "Networking Concepts",
  items: ["Discover", "Offer", "Request", "Acknowledge"],
  correct_order: [0, 1, 2, 3],
  explanation: "Discover, Offer, Request, Acknowledge.",
};

const choices = () => within(screen.getByRole("group", { name: "Choices to place" }));
const order = () => within(screen.getByRole("list", { name: "Your order" }));
const check = () => screen.getByRole("button", { name: "Check my order" });

function tap(...items: string[]) {
  for (const item of items) fireEvent.click(choices().getByRole("button", { name: item }));
}

describe("ordering PBQs", () => {
  it("fills the next row with each tap, and checks once every item is placed", () => {
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    expect(check()).toBeDisabled();
    tap("Discover", "Offer", "Request");
    expect(order().getByRole("button", { name: /^1\. Discover/ })).toBeInTheDocument();
    expect(order().getByRole("button", { name: /^3\. Request/ })).toBeInTheDocument();
    expect(check()).toBeDisabled();
    tap("Acknowledge");
    fireEvent.click(check());
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Your score" })).toHaveTextContent("4 of 4in the right place");
  });

  it("sends a placed item back with a tap, without moving the other choices", () => {
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    const before = choices()
      .getAllByRole("button")
      .map((b) => b.textContent);
    tap("Offer");
    // Placed choices leave their outline behind, so the rest keep their places.
    expect(choices().queryByRole("button", { name: "Offer" })).toBeNull();
    expect(screen.getByRole("group", { name: "Choices to place" }).children).toHaveLength(4);
    fireEvent.click(order().getByRole("button", { name: /^1\. Offer/ }));
    expect(
      choices()
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(before);
    expect(order().queryByRole("button")).toBeNull();
  });

  it("grades a partly wrong order with partial credit", () => {
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    tap("Discover", "Request", "Offer", "Acknowledge");
    fireEvent.click(check());
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("asks before leaving once something is placed", () => {
    const onBack = vi.fn();
    render(<PbqPlayer scenario={dora} onBack={onBack} />);
    tap("Discover");
    fireEvent.click(screen.getByRole("button", { name: "Back to scenarios" }));
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Leave this lab?" })).toBeInTheDocument();
  });
});

const ports: MatchingScenario = {
  type: "matching",
  id: "ports-test",
  title: "Ports",
  description: "Match each port to its service.",
  domain_number: "1.0",
  domain_title: "Networking Concepts",
  left: ["22", "53", "443"],
  right: ["SSH", "DNS", "HTTPS"],
  correct_map: [0, 1, 2],
  explanation: "22 is SSH, 53 is DNS, 443 is HTTPS.",
};

const PARTNER: Record<string, string> = { "22": "SSH", "53": "DNS", "443": "HTTPS" };
const portUp = () => screen.getByText(/^(22|53|443)$/).textContent!;
const status = () => screen.getByRole("status");

describe("matching PBQs, one item at a time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks for one item's partner at a time, drops matched partners out, and grades once", () => {
    const onGraded = vi.fn();
    render(<PbqPlayer scenario={ports} onBack={vi.fn()} onGraded={onGraded} />);
    expect(screen.getByText("Match each port to its service.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();

    const first = portUp();
    fireEvent.click(screen.getByRole("radio", { name: PARTNER[first] }));
    expect(status()).toHaveTextContent("Right.");
    act(() => vi.advanceTimersByTime(STEP_ADVANCE_MS));

    // The first item's partner is out of play now.
    expect(screen.getByRole("radio", { name: PARTNER[first] })).toBeDisabled();
    const second = portUp();
    const wrong = Object.values(PARTNER).find((s) => s !== PARTNER[first] && s !== PARTNER[second])!;
    fireEvent.click(screen.getByRole("radio", { name: wrong }));
    expect(status()).toHaveTextContent(`Not quite. The answer is ticked. It's ${PARTNER[second]}.`);
    fireEvent.click(screen.getByRole("button", { name: /^Got it/ }));

    const third = portUp();
    fireEvent.click(screen.getByRole("radio", { name: PARTNER[third] }));
    expect(status()).toHaveTextContent("2 of 3 matched right.");
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));

    const map = [-1, -1, -1];
    map[ports.left.indexOf(first)] = ports.right.indexOf(PARTNER[first]);
    map[ports.left.indexOf(second)] = ports.right.indexOf(wrong);
    map[ports.left.indexOf(third)] = ports.right.indexOf(PARTNER[third]);
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0]).toEqual(gradeScenario(ports, map));
    expect(screen.getByRole("group", { name: "Your score" })).toHaveTextContent("2 of 3matched right");
    expect(screen.getByText("The one to look at again")).toBeInTheDocument();
  });

  it("answers from the keyboard and asks before leaving mid-way", () => {
    const onBack = vi.fn();
    render(<PbqPlayer scenario={ports} onBack={onBack} />);
    const tiles = screen.getAllByRole("radio").map((r) => r.textContent!.replace(/^\d/, ""));
    fireEvent.keyDown(document, { key: String(tiles.indexOf(PARTNER[portUp()]) + 1) });
    expect(status()).toHaveTextContent("Right.");
    fireEvent.click(screen.getByRole("button", { name: "Back to scenarios" }));
    expect(screen.getByRole("dialog", { name: "Leave this lab?" })).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });
});

const transport: CategorizationScenario = {
  type: "categorization",
  id: "transport-test",
  title: "TCP or UDP",
  description: "Sort each protocol by its transport.",
  domain_number: "1.0",
  domain_title: "Networking Concepts",
  categories: ["TCP", "UDP"],
  items: [
    { text: "HTTP", category: 0 },
    { text: "TFTP", category: 1 },
    { text: "SSH", category: 0 },
  ],
  explanation: "HTTP and SSH ride TCP; TFTP rides UDP.",
};

describe("sorting PBQs, one item at a time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("drops each item into a bin, marks it on the spot, and grades once", () => {
    const onGraded = vi.fn();
    render(<PbqPlayer scenario={transport} onBack={vi.fn()} onGraded={onGraded} />);
    expect(screen.getByText("Sort each protocol by its transport.")).toBeInTheDocument();
    const bin = (name: string) => screen.getByRole("button", { name });
    for (let i = 0; i < 3; i++) {
      const item = screen.getByText(/^(HTTP|TFTP|SSH)$/).textContent!;
      fireEvent.click(bin(item === "TFTP" ? "UDP" : "TCP"));
      expect(status()).toHaveTextContent("Right.");
      act(() => vi.advanceTimersByTime(i < 2 ? STEP_ADVANCE_MS : MOVE_ADVANCE_MS));
    }
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0]).toEqual(gradeScenario(transport, [0, 1, 0]));
    expect(screen.getByRole("group", { name: "Your score" })).toHaveTextContent("3 of 3sorted right");
    expect(screen.queryByText(/to look at again/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Play again/ }));
    expect(screen.getByText(/^(HTTP|TFTP|SSH)$/)).toBeInTheDocument();
  });
});
