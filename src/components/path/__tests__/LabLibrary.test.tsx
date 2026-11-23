// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PathLabInfo, PathStructure, StopRecord } from "@/core/path/types";

// The early fetch of a lab's large player is watched here, and nothing is fetched.
const preloadLab = vi.hoisted(() => vi.fn());
vi.mock("@/components/workspace/pbq-host", () => ({ preloadLab }));

import { LabLibrary, NextLabCard } from "../LabLibrary";

/**
 * The colour rule: one colour means "press this", and it is drawn only on what
 * can be pressed. A row of the list of labs is pressed whole, so the tile
 * around its icon keeps that colour. The card that names the next lab is not
 * pressed, only its button is, so its icon is drawn in ink with no tile.
 */

/** A class that draws text, a fill, an edge or an icon in the pressable colour, with or without a variant or a tint. */
const PRESSABLE = /(?:^|[\s:])(?:text|bg|border|fill|stroke|ring|outline|decoration)-primary(?:\/[\w.[\]%-]+)?(?=\s|$)/;
const classOf = (element: Element) => element.getAttribute("class") ?? "";
/** Everything in a card that is not a control or part of one, with the card itself. */
const notPressed = (card: Element) => [card, ...card.querySelectorAll("*")].filter((el) => !el.closest("button, a"));

const lab = (id: string, type: PathLabInfo["type"], minutes: number): PathLabInfo => ({
  id,
  title: `Lab ${id}`,
  type,
  domain: "1.0",
  minutes,
});

const LABS = [lab("acl", "simulation", 12), lab("order", "ordering", 3)];
const structure: PathStructure = {
  certSlug: "security-plus-sy0-701",
  examName: "Security+",
  examCode: "SY0-701",
  domains: [
    {
      number: "1.0",
      title: "General Security Concepts",
      weight: 100,
      objectives: [{ code: "1.1", title: "Security controls" }],
      lab: { id: "acl", title: "Lab acl", minutes: 12 },
    },
  ],
  library: LABS,
};

afterEach(() => {
  cleanup();
  preloadLab.mockClear();
});

describe("NextLabCard", () => {
  it("draws the lab's icon in ink beside its words, with no tinted tile, and keeps the pressable colour for the button", () => {
    const { container } = render(<NextLabCard lab={LABS[0]} onOpen={() => {}} />);
    const card = container.firstElementChild!;
    expect(screen.getByText("Your next lab. Simulation, 12 minutes.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Lab acl" })).toBeInTheDocument();

    // The icon that says which kind of lab it is: outside the button, in the ink of the line beside it.
    const icons = [...card.querySelectorAll("svg")].filter((svg) => !svg.closest("button"));
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveAttribute("aria-hidden", "true");
    expect(classOf(icons[0])).toContain("text-muted-foreground");
    // No tile around it: its parent holds the words too.
    expect(icons[0].parentElement).toContainElement(screen.getByText("Your next lab. Simulation, 12 minutes."));
    // Nothing that cannot be pressed is drawn in the pressable colour, as a tint or at full strength.
    expect(notPressed(card).filter((el) => PRESSABLE.test(classOf(el))).map(classOf)).toEqual([]);
  });

  it("opens the lab from its one button, and starts the fetch of the lab's player as the button is reached", () => {
    const onOpen = vi.fn();
    render(<NextLabCard lab={LABS[0]} onOpen={onOpen} />);
    const open = screen.getByRole("button", { name: /^Open the lab/ });
    fireEvent.focus(open);
    expect(preloadLab).toHaveBeenCalledWith("simulation");
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("LabLibrary", () => {
  it("keeps the pressable colour on a row's tile, because the whole row is pressed", () => {
    const results = new Map<string, StopRecord>();
    render(<LabLibrary structure={structure} results={results} onOpen={() => {}} onBack={() => {}} />);
    const row = screen.getByRole("button", { name: /^Lab acl/ });
    const tile = row.querySelector("svg")!.parentElement!;
    // The tile is part of the button: the colour marks something that can be pressed.
    expect(tile.closest("button")).toBe(row);
    expect(PRESSABLE.test(classOf(tile))).toBe(true);
    // Outside the rows and the link back, nothing is drawn in that colour.
    const list = row.closest(".path-rise")!;
    expect(notPressed(list).filter((el) => PRESSABLE.test(classOf(el))).map(classOf)).toEqual([]);
  });
});
