// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WelcomeV2Modal } from "@/components/workspace/WelcomeV2Modal";

const SEEN_KEY = "certbench-v2-welcome-seen";

// Node's own experimental `localStorage` global shadows jsdom's.
const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

beforeEach(() => {
  store.clear();
});

describe("WelcomeV2Modal", () => {
  it("is a modal dialog with a name and a description, and opens with the focus on its one button", () => {
    render(
      <>
        <button type="button">Behind the dialog</button>
        <WelcomeV2Modal enabled />
      </>
    );
    const dialog = screen.getByRole("dialog", { name: "CertBench has been rebuilt." });
    expect(dialog).toHaveAccessibleDescription(
      "Your account, your progress and everything that you have studied are where you left them."
    );
    expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();
    // The page behind it is hidden from assistive technology while it is open.
    expect(screen.queryByRole("button", { name: "Behind the dialog" })).toBeNull();
  });

  it("says what has changed in sentences, with no decoration and no motion", () => {
    render(<WelcomeV2Modal enabled />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "The site has a light theme and a dark theme, and you can change between them at any time.",
      "The readiness report shows a score for each exam domain.",
      "The design of the site is plainer.",
    ]);
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("svg")).toBeNull();
    expect(dialog.getAttribute("style") ?? "").not.toContain("animation");
  });

  it("closes on Continue, and is not shown again in this browser", () => {
    const first = render(<WelcomeV2Modal enabled />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(store.get(SEEN_KEY)).toBe("1");
    first.unmount();

    // The next visit, in the same browser.
    render(<WelcomeV2Modal enabled />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", () => {
    render(<WelcomeV2Modal enabled />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(store.get(SEEN_KEY)).toBe("1");
  });

  it("is not shown to an account that is newer than the rebuilt site", () => {
    render(<WelcomeV2Modal enabled={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
