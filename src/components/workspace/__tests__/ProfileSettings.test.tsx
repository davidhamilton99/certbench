// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";

const api = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ api }));
vi.mock("@/lib/supabase-browser", () => ({ createClient: () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ProfileSettings } from "@/components/workspace/ProfileSettings";

function settings() {
  return render(
    <ProfileSettings
      initialDisplayName="Ada"
      email="ada@example.com"
      enrollments={[{ certId: "c1", certName: "Security+", examCode: "SY0-701", examDate: null }]}
      availableCerts={[]}
    />
  );
}

beforeEach(() => {
  api.mockReset();
  signOut.mockReset();
});

describe("ProfileSettings, deleting the account", () => {
  it("says that deleting the account also cancels the Pro subscription", () => {
    settings();
    expect(screen.getByRole("heading", { name: "Delete your account" })).toBeInTheDocument();
    const field = screen.getByLabelText(/Type DELETE to confirm/);
    // The warning is read with the field that confirms it.
    expect(field).toHaveAccessibleDescription(
      "Deleting your account removes your progress, study sets and history permanently. This cannot be undone. Deleting your account also cancels your Pro subscription."
    );
  });

  it("keeps the button off until DELETE is typed", () => {
    settings();
    const button = screen.getByRole("button", { name: "Delete my account permanently" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/), { target: { value: "DELETE" } });
    expect(button).toBeEnabled();
  });

  it("shows the server's own sentence when the subscription could not be canceled, and does not sign out", async () => {
    const sentence =
      "Your account could not be deleted because your subscription could not be canceled. Please try again, or write to support@certbench.dev.";
    api.mockRejectedValue(new ApiError("conflict", sentence));
    settings();
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/), { target: { value: "DELETE" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete my account permanently" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(sentence);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("never shows a machine's own message", async () => {
    api.mockRejectedValue(new ApiError("internal", "Request failed (500)"));
    settings();
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/), { target: { value: "DELETE" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete my account permanently" }));
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "Your account could not be deleted. Please try again. If the problem continues, write to support@certbench.dev."
    );
    expect(alert).not.toHaveTextContent("500");
  });
});

describe("ProfileSettings, the cards", () => {
  it("titles each card as a heading of the page", () => {
    settings();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Account",
      "Exam dates",
      "Delete your account",
    ]);
  });

  it("names each exam's update button by its exam", () => {
    settings();
    // (The test's DOM library drops the space at the edge of an inline span; a browser keeps it.)
    expect(screen.getByRole("button", { name: /^Update ?the Security\+ exam date$/ })).toBeInTheDocument();
  });
});
