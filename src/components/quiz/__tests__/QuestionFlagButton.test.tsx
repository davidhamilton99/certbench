// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ api }));

import { QuestionFlagButton } from "@/components/quiz/QuestionFlagButton";

beforeEach(() => {
  api.mockReset();
});

describe("QuestionFlagButton", () => {
  it("opens a labelled form in place, which takes the keyboard", () => {
    render(<QuestionFlagButton questionId="q1" />);
    fireEvent.click(screen.getByRole("button", { name: "Report a problem with this question" }));
    expect(screen.getByLabelText("What is wrong with this question?")).toHaveFocus();
    // Nothing can be sent until something has been written.
    expect(screen.getByRole("button", { name: "Send the report" })).toBeDisabled();
  });

  it("gives the focus back to the button that opened it when the form is cancelled", () => {
    render(<QuestionFlagButton questionId="q1" />);
    fireEvent.click(screen.getByRole("button", { name: "Report a problem with this question" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Report a problem with this question" })).toHaveFocus();
  });

  it("confirms a report in a sentence that is announced", async () => {
    api.mockResolvedValue({ flagged: true });
    render(<QuestionFlagButton questionId="q1" />);
    fireEvent.click(screen.getByRole("button", { name: "Report a problem with this question" }));
    fireEvent.change(screen.getByLabelText("What is wrong with this question?"), {
      target: { value: "The second answer is also correct." },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send the report" }));
    });
    expect(api).toHaveBeenCalledWith(expect.anything(), {
      questionId: "q1",
      reason: "The second answer is also correct.",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Your report has been received. Thank you.");
  });

  it("says a failed report in a sentence, tied to the field", async () => {
    api.mockRejectedValue(new ApiError("internal", "Request failed (500)"));
    render(<QuestionFlagButton questionId="q1" />);
    fireEvent.click(screen.getByRole("button", { name: "Report a problem with this question" }));
    const field = screen.getByLabelText("What is wrong with this question?");
    fireEvent.change(field, { target: { value: "A typing error in the question." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send the report" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Your report could not be sent. Please try again.");
    expect(field).toHaveAccessibleDescription("Your report could not be sent. Please try again.");
  });
});
