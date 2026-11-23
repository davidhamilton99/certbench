// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OrderingScenario } from "@/data/pbq/types";

vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("@/components/auth/useSignedIn", () => ({ useSessionUserId: () => null }));
vi.mock("@/components/auth/InlineSignup", () => ({ InlineSignup: () => null }));

import { PbqLab, type FreeLab } from "../PbqLab";

// The other tests of the page stand a stand-in in for the player. These play
// the real one, because the way back is the two of them together: the page's
// tiles stay where they are, and so does the lab with its answers.

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

const LABS: FreeLab[] = [
  { scenario: ordering("dora", "DHCP DORA", ["Discover", "Offer", "Request", "Acknowledge"]), tier: "Introductory", minutes: 3 },
  { scenario: ordering("osi", "OSI layers", ["Physical", "Data link", "Network"]), tier: "Core", minutes: 3 },
  { scenario: ordering("boot", "Boot order", ["POST", "Bootloader", "Kernel"]), tier: "Exam level", minutes: 10 },
];

const choices = () => within(screen.getByRole("group", { name: "Choices to place" }));
const chooser = () => within(screen.getByRole("group", { name: "Choose a lab" }));

afterEach(() => {
  cleanup();
});

describe("PbqLab, the way back from a lab with answers in it", () => {
  it("asks nothing, puts the focus on the lab's tile, and keeps the lab and its answers", async () => {
    const user = userEvent.setup();
    render(<PbqLab labs={LABS} examName="Network+" pathHref="/path/network-plus-n10-009" labCount={20} />);
    await user.click(choices().getByRole("button", { name: "Discover" }));
    // The player moves the focus on to the next choice; the way back is pressed after that.
    await waitFor(() => expect(choices().getAllByRole("button")).toContain(document.activeElement));

    await user.click(screen.getByRole("button", { name: "Choose another lab" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    const tile = chooser().getAllByRole("button")[0];
    expect(tile).toHaveAttribute("aria-pressed", "true");
    expect(tile).toHaveFocus();
    // The lab is still on the stage with the item where it was placed.
    expect(
      within(screen.getByRole("list", { name: "Your order" })).getByRole("button", { name: /^1\. Discover/ })
    ).toBeInTheDocument();
  });

  it("does the same from the keyboard alone", async () => {
    const user = userEvent.setup();
    render(<PbqLab labs={LABS} examName="Network+" pathHref="/path/network-plus-n10-009" labCount={20} />);
    choices().getByRole("button", { name: "Offer" }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(choices().getAllByRole("button")).toContain(document.activeElement));

    screen.getByRole("button", { name: "Choose another lab" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(chooser().getAllByRole("button")[0]).toHaveFocus();
    expect(
      within(screen.getByRole("list", { name: "Your order" })).getByRole("button", { name: /^1\. Offer/ })
    ).toBeInTheDocument();
  });
});
