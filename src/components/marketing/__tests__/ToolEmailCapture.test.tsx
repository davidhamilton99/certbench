// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ api }));

import { EMAIL_NOT_REPEATED, EMAIL_NOT_SENT, ToolEmailCapture } from "../ToolEmailCapture";

function form() {
  return render(<ToolEmailCapture source="port-numbers-quiz" />);
}

function send(address = "learner@example.com") {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: address } });
  fireEvent.click(screen.getByRole("button", { name: "Send the study plan" }));
}

beforeEach(() => {
  api.mockReset();
});

describe("ToolEmailCapture", () => {
  it("labels its one field in words that stay on screen, with the hint tied to it", () => {
    form();
    expect(screen.getByRole("form", { name: "Receive a free study plan by email" })).toBeInTheDocument();
    const field = screen.getByLabelText("Email address");
    // The label is real text beside the field, not a placeholder that goes at the first keystroke.
    expect(screen.getByText("Email address").tagName).toBe("LABEL");
    expect(field).not.toHaveAttribute("placeholder");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toHaveAttribute("autocomplete", "email");
    expect(field).toBeRequired();
    expect(field).toHaveAccessibleDescription(
      "You will receive one email with your study plan. You can unsubscribe at any time."
    );
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("confirms the email only when the mail service accepted it, and says where it went", async () => {
    api.mockResolvedValue({ ok: true, delivery: "sent" });
    form();
    send("  learner@example.com ");

    const done = await screen.findByRole("status");
    expect(done).toHaveTextContent("The study plan has been sent.");
    expect(done).toHaveTextContent("It was sent to learner@example.com. Please check your inbox.");
    // The confirmation replaces the form, so it takes the focus and is read.
    // (The focus moves just after the confirmation is drawn.)
    await waitFor(() => expect(done).toHaveFocus());
    expect(screen.queryByRole("form")).toBeNull();

    // The request names the endpoint without carrying its schemas, and trims the address.
    const [contract, input] = api.mock.calls[0];
    expect(contract).toMatchObject({ path: "/api/tools/lead", method: "POST" });
    expect(typeof contract.load).toBe("function");
    expect(input).toEqual({ email: "learner@example.com", source: "port-numbers-quiz", context: undefined });
  });

  it("says so when the email could not be sent, and keeps the form open to try again", async () => {
    api.mockResolvedValue({ ok: true, delivery: "failed" });
    form();
    send();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(EMAIL_NOT_SENT);
    expect(EMAIL_NOT_SENT).toBe("The email could not be sent. Please try again in a few minutes.");
    expect(screen.queryByText("The study plan has been sent.")).toBeNull();
    expect(screen.getByLabelText("Email address")).toHaveValue("learner@example.com");
    // The message is read with the field as well.
    expect(screen.getByLabelText("Email address")).toHaveAccessibleDescription(new RegExp(EMAIL_NOT_SENT));
  });

  it("does not claim an email that was not sent again or was not wanted", async () => {
    api.mockResolvedValue({ ok: true, delivery: "skipped" });
    form();
    send();

    await waitFor(() => expect(screen.getByText(EMAIL_NOT_REPEATED)).toBeInTheDocument());
    // A statement of what happened, not an error: it is announced politely.
    expect(screen.getByText(EMAIL_NOT_REPEATED)).toHaveAttribute("role", "status");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("The study plan has been sent.")).toBeNull();
    expect(screen.getByRole("button", { name: "Send the study plan" })).toBeInTheDocument();
  });

  it("turns a refused request into a sentence, never the code", async () => {
    api.mockRejectedValue(new ApiError("rate_limited"));
    form();
    send();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Too many requests were made in a short time. Please wait a few minutes and try again."
    );
    expect(alert).not.toHaveTextContent("rate_limited");
  });

  it("marks the field when the address is refused, ties the error to it and returns the focus to it", async () => {
    api.mockRejectedValue(new ApiError("validation_failed", "Invalid email"));
    form();
    send("learner@example");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The email address is not valid. Please check it and try again.");
    const field = screen.getByLabelText("Email address");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/The email address is not valid\./);
    expect(field).toHaveFocus();
  });

  it("says a lost connection in a sentence", async () => {
    api.mockRejectedValue(new TypeError("Failed to fetch"));
    form();
    send();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The connection was lost. Please check your connection and try again."
    );
  });

  it("shows that it is working, and sends once however often the button is pressed", async () => {
    let finish: (value: unknown) => void = () => {};
    api.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    form();
    send();

    const button = screen.getByRole("button", { name: "Send the study plan" });
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    fireEvent.submit(screen.getByRole("form"));
    expect(api).toHaveBeenCalledTimes(1);

    await act(async () => finish({ ok: true, delivery: "sent" }));
    expect(screen.getByRole("status")).toHaveTextContent("The study plan has been sent.");
  });
});
