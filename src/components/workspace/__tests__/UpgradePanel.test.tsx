// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ api }));

import { ManageBillingButton } from "@/components/workspace/UpgradePanel";

beforeEach(() => {
  api.mockReset();
});

describe("ManageBillingButton", () => {
  it("says a failure in a sentence beside the button, tied to it, and can be pressed again", async () => {
    api.mockRejectedValue(new ApiError("internal", "Request failed (502)"));
    render(<ManageBillingButton />);
    const button = screen.getByRole("button", { name: "Manage billing" });
    await act(async () => {
      fireEvent.click(button);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("The billing page could not be opened. Please try again.");
    expect(alert).not.toHaveTextContent("502");
    expect(screen.getByRole("button", { name: "Manage billing" })).toHaveAccessibleDescription(
      "The billing page could not be opened. Please try again."
    );
    expect(screen.getByRole("button", { name: "Manage billing" })).not.toHaveAttribute("aria-busy");
  });

  it("shows the endpoint's own sentence where it wrote one for the member", async () => {
    const sentence =
      "Too many attempts to open the billing page were made in the past hour. Please try again later, or write to support@certbench.dev.";
    api.mockRejectedValue(new ApiError("rate_limited", sentence));
    render(<ManageBillingButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(sentence);
  });

  it("is busy, and ignores a second press, while the billing page is being opened", async () => {
    let finish: (value: { url: string }) => void = () => {};
    api.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<ManageBillingButton />);
    fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));

    const busy = screen.getByRole("button", { name: "Manage billing" });
    expect(busy).toHaveAttribute("aria-busy", "true");
    fireEvent.click(busy);
    expect(api).toHaveBeenCalledTimes(1);

    // Leave the request unfinished: finishing it would send the test's window to the portal.
    void finish;
  });
});
