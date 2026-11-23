// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";
import { CONNECTION_LOST } from "@/lib/errors/user-message";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

const api = vi.hoisted(() => vi.fn<(contract: { path: string }, input: unknown) => Promise<unknown>>());
vi.mock("@/lib/api-client", () => ({ api }));

import { StoryForm } from "@/components/story/StoryForm";

function show(preset: boolean | null = null) {
  return render(
    <StoryForm
      token="signed-token"
      certName="CompTIA Security+"
      pathHref="/path/security-plus-sy0-701"
      defaultName="Sam R."
      preset={preset}
    />
  );
}

const heading = () => screen.getByRole("heading", { level: 1 });
const comment = () => screen.getByRole("textbox", { name: /What helped you|What you found difficult/ });
const write = (text: string) => fireEvent.change(comment(), { target: { value: text } });

beforeEach(() => {
  vi.clearAllMocks();
  api.mockResolvedValue({ submitted: true });
});

describe("the question", () => {
  it("offers the two answers as plain buttons, with no mark that decorates either", () => {
    const { container } = show();
    expect(heading().textContent).toBe("How did your exam go?");
    expect(screen.getByRole("button", { name: /^I passed/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^I did not pass/ })).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
    // A page does not take the focus as it loads.
    expect(document.activeElement).toBe(document.body);
    expect(track).toHaveBeenCalledWith("story_viewed", { preset: "none" });
  });

  it("moves the focus to the next screen's heading when an answer is pressed", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /^I passed/ }));
    expect(heading().textContent).toBe("Congratulations.");
    expect(document.activeElement).toBe(heading());
    expect(track).toHaveBeenCalledWith("story_answer_picked", { passed: true });
  });

  it("opens on the answer that was pressed in the email", () => {
    show(false);
    expect(heading().textContent).toBe("You can take the exam again.");
    expect(document.activeElement).toBe(document.body);
    expect(track).toHaveBeenCalledWith("story_viewed", { preset: "fail" });
  });

  it("lets the answer be changed, and returns the focus to the question", () => {
    show(true);
    fireEvent.click(screen.getByRole("button", { name: "Change my answer" }));
    expect(heading().textContent).toBe("How did your exam go?");
    expect(document.activeElement).toBe(heading());
  });
});

describe("a candidate who passed", () => {
  it("labels both fields, and says how much to write under the first", () => {
    show(true);
    const hint = document.getElementById(comment().getAttribute("aria-describedby")!.split(" ")[0])!;
    expect(hint.textContent).toBe("Please write at least 10 characters. You have used 0 of 600 characters.");
    expect(comment().getAttribute("placeholder")).toBeNull();
    const name = screen.getByRole("textbox", { name: "Name to show" }) as HTMLInputElement;
    expect(name.value).toBe("Sam R.");
    expect(document.getElementById(name.getAttribute("aria-describedby")!)!.textContent).toBe(
      "This name is shown with your comment if it is published."
    );
  });

  it("sends the comment and the name, then thanks them without promising that it will be published", async () => {
    show(true);
    const send = screen.getByRole("button", { name: "Send my comment" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    write("The labs showed me what to study.");
    expect(send.disabled).toBe(false);
    await act(async () => void fireEvent.click(send));

    expect(api).toHaveBeenCalledTimes(1);
    expect(api.mock.calls[0][0].path).toBe("/api/story");
    expect(api.mock.calls[0][1]).toEqual({
      token: "signed-token",
      passed: true,
      quote: "The labs showed me what to study.",
      displayName: "Sam R.",
    });
    await waitFor(() => expect(heading().textContent).toBe("Thank you."));
    expect(document.activeElement).toBe(heading());
    expect(document.body.textContent).toContain(
      "Your comment helps other candidates to begin. It will be reviewed before it is published on CertBench."
    );
    expect(screen.getByRole("link", { name: "Return to the home page" }).getAttribute("href")).toBe("/");
  });

  it("treats an answer that was sent from this link already as sent", async () => {
    api.mockRejectedValueOnce(new ApiError("conflict", "Already submitted"));
    show(true);
    write("The labs showed me what to study.");
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Send my comment" })));
    await waitFor(() => expect(heading().textContent).toBe("Thank you."));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("when the answer cannot be sent", () => {
  async function failWith(error: unknown) {
    api.mockRejectedValueOnce(error);
    show(true);
    write("The labs showed me what to study.");
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Send my comment" })));
    return screen.getByRole("alert");
  }

  it("says so in a sentence, never in the machine's words, and is ready to be pressed again", async () => {
    const alert = await failWith(new ApiError("internal", "Request failed (502)"));
    expect(alert.textContent).toBe("Your answer could not be sent. Please try again.");
    expect(document.body.textContent).not.toContain("Request failed");
    const send = screen.getByRole("button", { name: "Send my comment" });
    expect(send.hasAttribute("aria-busy")).toBe(false);
    // The field points to the message, so a screen reader reads it with the field.
    expect(comment().getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("says that the connection was lost when it was", async () => {
    expect((await failWith(new ApiError("internal", CONNECTION_LOST))).textContent).toBe(CONNECTION_LOST);
  });

  it("gives a sentence for a bare code", async () => {
    expect((await failWith(new ApiError("rate_limited"))).textContent).toBe(
      "Too many requests were made in a short time. Please wait a few minutes and try again."
    );
  });

  it("shows a sentence that the endpoint wrote for the visitor", async () => {
    expect((await failWith(new ApiError("unauthorized", "This link has expired."))).textContent).toBe(
      "This link has expired."
    );
  });
});

describe("a candidate who did not pass", () => {
  it("makes no claim about how others fared, and asks for nothing", () => {
    show(false);
    expect(document.body.textContent).toContain("Your study path continues from where you stopped.");
    expect(document.body.textContent).not.toMatch(/many people/i);
    expect(screen.queryByRole("textbox", { name: "Name to show" })).toBeNull();
    const go = screen.getByRole("button", { name: "Go to the study path" }) as HTMLButtonElement;
    expect(go.disabled).toBe(false);
    write("The labs took longer than I expected.");
    expect(screen.getByRole("button", { name: "Send and go to the study path" })).toBeTruthy();
  });

  it("sends the answer before it leaves for the study path", async () => {
    show(false);
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Go to the study path" })));
    expect(api.mock.calls[0][1]).toEqual({ token: "signed-token", passed: false, quote: "", displayName: "Sam R." });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
