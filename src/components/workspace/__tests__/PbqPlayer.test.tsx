// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PbqPlayer } from "../PbqPlayer";
import { LARGE_PLAYERS, preloadLab } from "../pbq-host";
import { gradeScenario } from "@/core/pbq/grade";
import type {
  CategorizationScenario,
  MatchingScenario,
  OrderingScenario,
  SimulationScenario,
} from "@/data/pbq/types";

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
const score = () => screen.getByRole("group", { name: "Your score" });
/** The button that moves a move on. Its description is the verdict on the answer just given. */
const onward = () => screen.getByRole("button", { name: "Continue" });
/** The name of an answer once it is marked: what a screen reader is told, then the answer. */
const marked = (said: string, answer: string) => new RegExp(`^${said}:\\s*${answer}$`);

function tap(...items: string[]) {
  for (const item of items) fireEvent.click(choices().getByRole("button", { name: item }));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ordering PBQs", () => {
  it("fills the next row with each press, and checks once every item is placed", () => {
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    expect(check()).toBeDisabled();
    // The line that says what to do is the disabled button's description.
    expect(check()).toHaveAccessibleDescription("Select the items in order, from first to last.");
    tap("Discover", "Offer", "Request");
    expect(order().getByRole("button", { name: /^1\. Discover/ })).toBeInTheDocument();
    expect(order().getByRole("button", { name: /^3\. Request/ })).toBeInTheDocument();
    expect(check()).toBeDisabled();
    tap("Acknowledge");
    expect(check()).toHaveAccessibleDescription("Every item is placed. Select a row to remove it, or check your order.");
    fireEvent.click(check());
    expect(score()).toHaveTextContent("100%");
    expect(score()).toHaveTextContent("You placed 4 of 4 items in the correct position.");
    // The score takes the focus, so that it is read.
    expect(score()).toHaveFocus();
  });

  it("sends a placed item back with a press, without moving the other choices", () => {
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    const before = choices()
      .getAllByRole("button")
      .map((b) => b.textContent);
    tap("Offer");
    // Placed choices leave their outline behind, so the rest keep their places.
    expect(choices().queryByRole("button", { name: "Offer" })).toBeNull();
    expect(screen.getByRole("group", { name: "Choices to place" }).children).toHaveLength(4);
    // The row says what a press does, in words that fit a keyboard as well as a finger.
    fireEvent.click(order().getByRole("button", { name: "1. Offer. Select to remove it." }));
    expect(
      choices()
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(before);
    expect(order().queryByRole("button")).toBeNull();
  });

  it("keeps the keyboard's focus with the work: the next choice, the check, a choice that comes back", async () => {
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    tap("Discover");
    await waitFor(() => expect(choices().getAllByRole("button")).toContain(document.activeElement));
    tap(
      ...choices()
        .getAllByRole("button")
        .map((b) => b.textContent!)
    );
    await waitFor(() => expect(check()).toHaveFocus());
    fireEvent.click(order().getByRole("button", { name: /^1\. Discover/ }));
    await waitFor(() => expect(choices().getByRole("button", { name: "Discover" })).toHaveFocus());
  });

  it("grades a partly wrong order with partial credit, and names each mark in the list to review", () => {
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    tap("Discover", "Request", "Offer", "Acknowledge");
    fireEvent.click(check());
    expect(score()).toHaveTextContent("50%");
    expect(score()).toHaveTextContent("You placed 2 of 4 items in the correct position.");
    expect(screen.getByText("The 2 answers to review")).toBeInTheDocument();
    // A mark is an image with a name, not a bare icon (hidden: the list is folded away).
    expect(screen.getAllByRole("img", { name: "placed correctly", hidden: true })).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: "was in the wrong position", hidden: true })).toHaveLength(2);
  });

  it("asks before leaving once something is placed", () => {
    const onBack = vi.fn();
    render(<PbqPlayer scenario={dora} onBack={onBack} />);
    tap("Discover");
    fireEvent.click(screen.getByRole("button", { name: "Return to the scenarios" }));
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Do you want to leave this lab?" })).toBeInTheDocument();
  });

  it("tells the host once that play has started: at the first press, not when the lab is shown or repeated", () => {
    const onStarted = vi.fn();
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} onStarted={onStarted} />);
    expect(onStarted).not.toHaveBeenCalled();
    tap("Discover");
    expect(onStarted).toHaveBeenCalledTimes(1);
    tap("Offer", "Request", "Acknowledge");
    fireEvent.click(check());
    fireEvent.click(screen.getByRole("button", { name: /Repeat the lab/ }));
    // A repeated lab starts again from what it asks.
    expect(screen.getByText("Put the four DHCP messages in order.")).toHaveFocus();
    tap("Discover");
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it("puts the focus on the lab's title when the host opens it in answer to a press", () => {
    const { unmount } = render(<PbqPlayer scenario={dora} onBack={vi.fn()} />);
    expect(document.body).toHaveFocus();
    unmount();
    render(<PbqPlayer scenario={dora} onBack={vi.fn()} takeFocus />);
    expect(screen.getByRole("heading", { name: "DHCP DORA" })).toHaveFocus();
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
/** The partners, as the group of answers named by the port that is up. */
const partners = () => within(screen.getByRole("group", { name: portUp() }));

describe("matching PBQs, one item at a time", () => {
  it("asks for one item's partner at a time, drops matched partners out, and grades once", () => {
    const onGraded = vi.fn();
    render(<PbqPlayer scenario={ports} onBack={vi.fn()} onGraded={onGraded} />);
    expect(screen.getByText("Match each port to its service.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(partners().getAllByRole("button")).toHaveLength(3);

    const first = portUp();
    fireEvent.click(partners().getByRole("button", { name: PARTNER[first] }));
    // The verdict is read with the button that moves on, which has the focus.
    expect(onward()).toHaveAccessibleDescription("Correct.");
    expect(onward()).toHaveFocus();
    expect(partners().getByRole("button", { name: marked("Your answer, which is correct", PARTNER[first]) })).toBeDisabled();
    fireEvent.click(onward());

    // The first item's partner is out of play now, and says so.
    expect(partners().getByRole("button", { name: marked("No longer available", PARTNER[first]) })).toBeDisabled();
    const second = portUp();
    const wrong = Object.values(PARTNER).find((s) => s !== PARTNER[first] && s !== PARTNER[second])!;
    fireEvent.click(partners().getByRole("button", { name: wrong }));
    expect(onward()).toHaveAccessibleDescription(`Incorrect. The correct answer is ${PARTNER[second]}.`);
    expect(partners().getByRole("button", { name: marked("Your answer, which is incorrect", wrong) })).toBeDisabled();
    expect(partners().getByRole("button", { name: marked("Correct answer", PARTNER[second]) })).toBeDisabled();
    fireEvent.click(onward());

    const third = portUp();
    fireEvent.click(partners().getByRole("button", { name: PARTNER[third] }));
    expect(onward()).toHaveAccessibleDescription("Correct. 2 of 3 matched correctly.");
    fireEvent.click(onward());

    const map = [-1, -1, -1];
    map[ports.left.indexOf(first)] = ports.right.indexOf(PARTNER[first]);
    map[ports.left.indexOf(second)] = ports.right.indexOf(wrong);
    map[ports.left.indexOf(third)] = ports.right.indexOf(PARTNER[third]);
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0]).toEqual(gradeScenario(ports, map));
    expect(score()).toHaveTextContent("You matched 2 of 3 items correctly.");
    expect(screen.getByText("The answer to review")).toBeInTheDocument();
  });

  it("answers from the keyboard only while the focus is inside the lab, and asks before leaving mid-way", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onStarted = vi.fn();
    render(<PbqPlayer scenario={ports} onBack={onBack} onStarted={onStarted} />);
    const tiles = partners()
      .getAllByRole("button")
      .map((b) => b.textContent!.replace(/^\d/, ""));
    const digit = String(tiles.indexOf(PARTNER[portUp()]) + 1);

    // With the focus elsewhere on the page (here, nowhere), a digit is not an answer.
    await user.keyboard(digit);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(onStarted).not.toHaveBeenCalled();
    // The way back to the list is outside the move: a digit pressed there is not an answer either.
    screen.getByRole("button", { name: "Return to the scenarios" }).focus();
    await user.keyboard(digit);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();

    // Tab reaches the first answer; from there the digit answers.
    await user.tab();
    expect(partners().getAllByRole("button")[0]).toHaveFocus();
    await user.keyboard(digit);
    expect(onward()).toHaveAccessibleDescription("Correct.");
    expect(onStarted).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Return to the scenarios" }));
    expect(screen.getByRole("dialog", { name: "Do you want to leave this lab?" })).toBeInTheDocument();
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

const itemUp = () => screen.getByText(/^(HTTP|TFTP|SSH)$/).textContent!;

describe("sorting PBQs, one item at a time", () => {
  it("drops each item into a bin, marks it on the spot, and grades once", () => {
    const onGraded = vi.fn();
    render(<PbqPlayer scenario={transport} onBack={vi.fn()} onGraded={onGraded} />);
    expect(screen.getByText("Sort each protocol by its transport.")).toBeInTheDocument();
    for (let i = 0; i < 3; i++) {
      const item = itemUp();
      expect(screen.getByText(`Item ${i + 1} of 3`)).toBeInTheDocument();
      fireEvent.click(
        within(screen.getByRole("group", { name: item })).getByRole("button", { name: item === "TFTP" ? "UDP" : "TCP" })
      );
      expect(onward()).toHaveAccessibleDescription(i < 2 ? "Correct." : "Correct. 3 of 3 sorted correctly.");
      fireEvent.click(onward());
    }
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0]).toEqual(gradeScenario(transport, [0, 1, 0]));
    expect(score()).toHaveTextContent("You sorted 3 of 3 items correctly.");
    expect(screen.queryByText(/to review/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Repeat the lab/ }));
    expect(screen.getByText(/^(HTTP|TFTP|SSH)$/)).toBeInTheDocument();
    // The repeated lab takes the focus on what it asks.
    expect(screen.getByText("Sort each protocol by its transport.")).toHaveFocus();
  });

  it("never moves on by itself: a correct answer waits for Continue as long as it takes", () => {
    vi.useFakeTimers();
    render(<PbqPlayer scenario={transport} onBack={vi.fn()} />);
    const item = itemUp();
    fireEvent.click(screen.getByRole("button", { name: item === "TFTP" ? "UDP" : "TCP" }));
    expect(onward()).toHaveAccessibleDescription("Correct.");
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(itemUp()).toBe(item);
    expect(screen.getByText("Item 1 of 3")).toBeInTheDocument();
    expect(onward()).toHaveFocus();
  });
});

const dim: SimulationScenario = {
  type: "simulation",
  id: "sim-on-demand-test",
  title: "Dim Laptop Screen",
  briefing: "A laptop screen is dim.",
  domain_number: "3.0",
  domain_title: "Hardware",
  estimatedMinutes: 5,
  explanation: "The image is there, so the light behind it has failed.",
  tasks: [
    {
      id: "t1",
      title: "Task 1: Diagnose",
      instructions: "Read the tests.",
      fields: [
        { type: "dropdown", id: "cause", label: "Which part failed?", options: ["LCD panel", "Backlight"], correctIndex: 1 },
      ],
      explanation: "The backlight.",
    },
  ],
};

describe("the large players", () => {
  it("are fetched when a lab of their kind is opened, and the lab says that it is loading meanwhile", async () => {
    const onStarted = vi.fn();
    render(<PbqPlayer scenario={dim} onBack={vi.fn()} onStarted={onStarted} takeFocus />);
    expect(screen.getByRole("status")).toHaveTextContent("The lab is loading.");
    // The host's props reach the player once it has arrived: the focus on its title, word of the first move.
    // (A first fetch compiles the player here, which a browser never waits for: hence the long limit.)
    expect(await screen.findByRole("heading", { name: "Dim Laptop Screen" }, { timeout: 20_000 })).toHaveFocus();
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Backlight" }));
    expect(onStarted).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("have one loader each, which an early fetch and the lab itself share, and the drills have none", async () => {
    expect(Object.keys(LARGE_PLAYERS).sort()).toEqual(["simulation", "threat-hunt", "topology"]);
    expect((await LARGE_PLAYERS.simulation()).SimulationPlayer).toBeTypeOf("function");
    expect((await LARGE_PLAYERS.topology()).TopologyPlayer).toBeTypeOf("function");
    expect((await LARGE_PLAYERS["threat-hunt"]()).ThreatHuntPlayer).toBeTypeOf("function");
    // Asking early for any kind of lab is safe: a drill has nothing to fetch.
    for (const type of ["ordering", "matching", "categorization", "simulation", "topology", "threat-hunt"] as const) {
      expect(() => preloadLab(type)).not.toThrow();
    }
  }, 30_000);
});
