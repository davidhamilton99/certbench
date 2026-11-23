// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ api }));

import { FeedbackClient } from "@/components/workspace/FeedbackClient";

const OPTIONS = [
  { certId: "c1", certName: "Security+" },
  { certId: "c2", certName: "Network+" },
];

function feedback(initialPassed: boolean | null = null) {
  return render(<FeedbackClient options={OPTIONS} defaultDisplayName="Ada L." initialPassed={initialPassed} />);
}

beforeEach(() => {
  api.mockReset();
});

describe("FeedbackClient", () => {
  it("asks the question with two radio buttons in a group named by the question", () => {
    feedback();
    const group = screen.getByRole("group", { name: "Did you pass your exam?" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => (r as HTMLInputElement).checked)).toEqual([false, false]);
    expect(within(group).getByRole("radio", { name: "I passed" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "I did not pass" })).toBeInTheDocument();
    // Nothing else is shown until the question is answered.
    expect(screen.queryByLabelText("Your story")).toBeNull();
  });

  it("gives every field a label and says the rules before they are broken", () => {
    feedback(true);
    expect(screen.getByLabelText("Exam")).toBeInTheDocument();
    const story = screen.getByLabelText("Your story");
    expect(story).toHaveAccessibleDescription(
      "Write between 10 and 600 characters. After it has been reviewed, your story may be published on CertBench with the name that you give below."
    );
    expect(story).not.toHaveAttribute("placeholder");
    expect(screen.getByLabelText("Name to publish")).toHaveValue("Ada L.");
  });

  it("says a story that is too short beside the button, tied to the field, and sends nothing", async () => {
    feedback(true);
    fireEvent.change(screen.getByLabelText("Your story"), { target: { value: "Too short" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send my story" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Please write at least 10 characters.");
    expect(screen.getByLabelText("Your story")).toHaveAttribute("aria-invalid", "true");
    expect(api).not.toHaveBeenCalled();
  });

  it("sends the story and confirms it in a sentence that takes the focus", async () => {
    api.mockResolvedValue({ submitted: true });
    feedback(true);
    fireEvent.change(screen.getByLabelText("Your story"), {
      target: { value: "I studied one domain a day and took a practice exam each week." },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send my story" }));
    });

    expect(api).toHaveBeenCalledWith(expect.anything(), {
      certId: "c1",
      passed: true,
      quote: "I studied one domain a day and took a practice exam each week.",
      displayName: "Ada L.",
    });
    const done = screen.getByRole("heading", { name: "Thank you. Your story has been received." });
    expect(done).toHaveFocus();
    expect(screen.getByRole("link", { name: "Return to your study plan" })).toHaveAttribute("href", "/dashboard");
  });

  it("shows the server's sentence when a story was already sent for this exam", async () => {
    api.mockRejectedValue(new ApiError("conflict", "You have already shared a story for this exam."));
    feedback(true);
    fireEvent.change(screen.getByLabelText("Your story"), { target: { value: "A story that is long enough." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send my story" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("You have already shared a story for this exam.");
    expect(screen.getByRole("button", { name: "Send my story" })).not.toHaveAttribute("aria-busy");
  });

  it("makes no claim about who passes on a second attempt", () => {
    const { container } = feedback(false);
    expect(container).not.toHaveTextContent(/most people/i);
    expect(container).toHaveTextContent(
      "Your progress is saved. Your study plan shows your score in each domain, and the questions that you answered incorrectly are listed under Review."
    );
    expect(screen.getByRole("link", { name: "Return to your study plan" })).toHaveAttribute("href", "/dashboard");
  });

  it("uses no status colour to decorate the choice", () => {
    const { container } = feedback(true);
    expect(container.innerHTML).not.toMatch(/success|text-warning|bg-warning/);
  });
});
