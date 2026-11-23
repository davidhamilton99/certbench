// @vitest-environment jsdom
import { useEffect, useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../confirm-dialog";

/**
 * A page with a control that asks before it acts, as a lab's "Choose another
 * lab" does. `moveFocus` stands for a page that puts the focus somewhere of its
 * own once the answer is given.
 */
function Page({ moveFocus = false }: { moveFocus?: boolean }) {
  const [open, setOpen] = useState(false);
  const [answered, setAnswered] = useState(false);
  const elsewhere = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (moveFocus && answered) elsewhere.current?.focus();
  }, [moveFocus, answered]);
  return (
    <>
      <h2 ref={elsewhere} tabIndex={-1}>
        Labs
      </h2>
      <button type="button" onClick={() => setOpen(true)}>
        Choose another lab
      </button>
      <ConfirmDialog
        open={open}
        title="Do you want to leave this lab?"
        message="Your answers so far will not be kept."
        confirmLabel="Leave the lab"
        cancelLabel="Stay in the lab"
        onConfirm={() => {
          setOpen(false);
          setAnswered(true);
        }}
        onCancel={() => {
          setOpen(false);
          setAnswered(true);
        }}
      />
    </>
  );
}

/** Opens the dialog from its control with the keyboard, as a keyboard user does. */
async function openFromTheControl(moveFocus = false) {
  const user = userEvent.setup();
  render(<Page moveFocus={moveFocus} />);
  const opener = screen.getByRole("button", { name: "Choose another lab" });
  opener.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("dialog", { name: "Do you want to leave this lab?" });
  // It opens on the safe answer.
  expect(screen.getByRole("button", { name: "Stay in the lab" })).toHaveFocus();
  return { user, opener };
}

async function closed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("the confirm dialog", () => {
  it("returns the focus to the control that opened it after Escape", async () => {
    const { user, opener } = await openFromTheControl();
    await user.keyboard("{Escape}");
    await closed();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("returns the focus to the control that opened it after the safe answer", async () => {
    const { user, opener } = await openFromTheControl();
    await user.click(screen.getByRole("button", { name: "Stay in the lab" }));
    await closed();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("returns the focus to the control that opened it after the other answer, when the control is still there", async () => {
    const { user, opener } = await openFromTheControl();
    await user.click(screen.getByRole("button", { name: "Leave the lab" }));
    await closed();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("returns the focus to the control that opened it after a press outside the dialog", async () => {
    const { user, opener } = await openFromTheControl();
    const outside = document.querySelector<HTMLElement>(".bg-scrim");
    expect(outside).not.toBeNull();
    await user.click(outside!);
    await closed();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("leaves the focus where the page put it once the answer was given", async () => {
    const { user } = await openFromTheControl(true);
    await user.click(screen.getByRole("button", { name: "Leave the lab" }));
    await closed();
    const heading = screen.getByRole("heading", { name: "Labs" });
    await waitFor(() => expect(heading).toHaveFocus());
    // The dialog's own return comes a moment later and must not take it back.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(heading).toHaveFocus();
  });
});
