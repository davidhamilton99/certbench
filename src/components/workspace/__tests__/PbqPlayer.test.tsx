// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PbqPlayer } from "../PbqPlayer";
import type { OrderingScenario } from "@/data/pbq/types";

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
    expect(screen.getByText("4/4 correct")).toBeInTheDocument();
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
    expect(screen.getByText("Leave scenario?")).toBeInTheDocument();
  });
});
