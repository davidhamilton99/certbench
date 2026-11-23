// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { StudyQuestion } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/errors";

const api = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { CommunitySetActions } from "@/components/workspace/CommunitySetActions";
import { QuestionManager } from "@/components/workspace/QuestionManager";
import { StudySetSettings } from "@/components/workspace/StudySetSettings";

const QUESTIONS: StudyQuestion[] = [
  {
    id: "q1",
    question_type: "multiple_choice",
    question_text: "Which protocol encrypts a remote shell?",
    options: [
      { text: "Telnet", is_correct: false },
      { text: "SSH", is_correct: true },
    ],
    correct_index: 1,
    explanation: null,
    sort_order: 0,
  },
];

beforeEach(() => {
  api.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  router.refresh.mockReset();
  router.push.mockReset();
});

describe("StudySetSettings", () => {
  it("names each button by what it does", () => {
    render(<StudySetSettings setId="s1" isPublic={false} />);
    expect(screen.getByRole("button", { name: "Make this set public" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete this set" })).toBeInTheDocument();
  });

  it("asks before deleting, in a dialog that opens on the safe choice", async () => {
    api.mockResolvedValue({ deleted: true });
    render(<StudySetSettings setId="s1" isPublic />);
    fireEvent.click(screen.getByRole("button", { name: "Delete this set" }));

    const dialog = screen.getByRole("dialog", { name: "Delete this study set?" });
    expect(dialog).toHaveAccessibleDescription(
      "The study set and its questions will be deleted permanently. This cannot be undone."
    );
    expect(screen.getByRole("button", { name: "Keep the study set" })).toHaveFocus();
    expect(api).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete the study set" }));
    });
    expect(api).toHaveBeenCalledWith(expect.anything(), { setId: "s1" });
    expect(router.push).toHaveBeenCalledWith("/study-materials");
  });

  it("deletes nothing when the safe choice is taken", () => {
    render(<StudySetSettings setId="s1" isPublic />);
    fireEvent.click(screen.getByRole("button", { name: "Delete this set" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep the study set" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it("says a failed change in a sentence", async () => {
    api.mockRejectedValue(new ApiError("internal", "Something went wrong"));
    render(<StudySetSettings setId="s1" isPublic />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Make this set private" }));
    });
    expect(toast.error).toHaveBeenCalledWith("The study set could not be changed. Please try again.");
  });
});

describe("QuestionManager", () => {
  it("is folded away behind a button that says whether it is open", () => {
    render(<QuestionManager setId="s1" questions={QUESTIONS} />);
    const toggle = screen.getByRole("button", { name: "Edit the questions (1)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Multiple choice")).toBeInTheDocument();
  });

  it("names the edit and delete buttons by their question, and asks before deleting", async () => {
    api.mockResolvedValue({ deleted: true });
    render(<QuestionManager setId="s1" questions={QUESTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit the questions (1)" }));
    expect(screen.getByRole("button", { name: "Edit question 1" })).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "Delete question 1" }));
    expect(screen.getByRole("dialog", { name: "Delete this question?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep the question" })).toHaveFocus();
    expect(api).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete the question" }));
    });
    expect(api).toHaveBeenCalledWith(expect.anything(), { setId: "s1", questionId: "q1" });
    expect(toast.success).toHaveBeenCalledWith("The question has been deleted.");
  });

  it("labels the edit form's fields and says a failed save beside the button", async () => {
    api.mockRejectedValue(new ApiError("validation_failed"));
    render(<QuestionManager setId="s1" questions={QUESTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit the questions (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit question 1" }));

    expect(screen.getByLabelText("Question")).toHaveValue("Which protocol encrypts a remote shell?");
    expect(screen.getByLabelText("Explanation")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Answers. Choose the one that is correct." })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Answer 2 is the correct answer" })).toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save the changes" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Some of the details were not accepted. Please check them and try again."
    );
  });
});

describe("CommunitySetActions", () => {
  it("keeps one name on the bookmark button and says its state", async () => {
    api.mockResolvedValue({ bookmarked: true });
    render(<CommunitySetActions setId="s1" initialBookmarked={false} />);
    const bookmark = screen.getByRole("button", { name: "Bookmark" });
    expect(bookmark).toHaveAttribute("aria-pressed", "false");
    await act(async () => {
      fireEvent.click(bookmark);
    });
    expect(screen.getByRole("button", { name: "Bookmark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens a labelled form for a report, and returns the focus when it is cancelled", () => {
    render(<CommunitySetActions setId="s1" initialBookmarked={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Report a problem with this set" }));
    const field = screen.getByLabelText("What is wrong with this study set?");
    expect(field).toHaveFocus();
    expect(screen.getByRole("button", { name: "Send the report" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Report a problem with this set" })).toHaveFocus();
  });

  it("confirms a report in a sentence that is announced", async () => {
    api.mockResolvedValue({ reported: true });
    render(<CommunitySetActions setId="s1" initialBookmarked={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Report a problem with this set" }));
    fireEvent.change(screen.getByLabelText("What is wrong with this study set?"), {
      target: { value: "Question 2 has the wrong answer marked." },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send the report" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Your report has been received. Thank you.");
    expect(screen.queryByRole("button", { name: "Report a problem with this set" })).toBeNull();
  });

  it("says a failed report beside the form, in a sentence", async () => {
    api.mockRejectedValue(new ApiError("rate_limited"));
    render(<CommunitySetActions setId="s1" initialBookmarked={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Report a problem with this set" }));
    fireEvent.change(screen.getByLabelText("What is wrong with this study set?"), {
      target: { value: "This set is spam." },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send the report" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Too many requests were made in a short time. Please wait a few minutes and try again."
    );
  });
});
