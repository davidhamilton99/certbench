// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PathStructure } from "@/core/path/types";
import { RehearsalIntro } from "../RehearsalIntro";

const structure: PathStructure = {
  certSlug: "security-plus-sy0-701",
  examName: "Security+",
  examCode: "SY0-701",
  domains: [
    { number: "1.0", title: "General Security Concepts", weight: 40, objectives: [{ code: "1.1", title: "Security controls" }] },
    { number: "2.0", title: "Threats, Vulnerabilities, and Mitigations", weight: 60, objectives: [{ code: "2.1", title: "Threat actors" }] },
  ],
};

function intro(props: Partial<Parameters<typeof RehearsalIntro>[0]> = {}) {
  const onStart = vi.fn();
  const onBack = vi.fn();
  render(<RehearsalIntro structure={structure} stopNumber={null} reading={null} onStart={onStart} onBack={onBack} {...props} />);
  return { onStart, onBack };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the screen before a practice exam on the study path", () => {
  it("has its own title, which takes the focus as the screen opens", () => {
    intro();
    // It is a screen of its own on the study path, so its heading is the screen's one title.
    const titles = screen.getAllByRole("heading", { level: 1 });
    expect(titles).toHaveLength(1);
    expect(titles[0]).toHaveTextContent("Take a full-length practice exam.");
    expect(titles[0]).toHaveFocus();
    expect(titles[0]).toHaveAttribute("tabindex", "-1");
    // The exam's limits come from the one place that holds them.
    expect(
      screen.getByText(/The practice exam has 90 questions and a time limit of 90 minutes, which are the limits of the real SY0-701 exam\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/drawn from all 2 domains/)).toBeInTheDocument();
  });

  it("says where it stands on the study path when it is the last step, and says nothing of it otherwise", () => {
    intro({ stopNumber: 41 });
    expect(screen.getByText("Step 41: practice exam")).toBeInTheDocument();
    cleanup();
    intro();
    expect(screen.queryByText(/^Step \d+/)).toBeNull();
  });

  it("names the result that the score will be compared with, with its date in English whatever the browser's language", () => {
    const format = vi.spyOn(Date.prototype, "toLocaleDateString");
    const at = Date.UTC(2026, 10, 14, 18);
    intro({ reading: { source: "checkpoint", score: 58, at } });
    const day = new Date(at).toLocaleDateString("en-US", { month: "long", day: "numeric" });
    expect(
      screen.getByText(`Your score is compared with the readiness target and with your checkpoint result of 58% from ${day}.`)
    ).toBeInTheDocument();
    // The date is asked for in English, not in the language the browser happens to be set to.
    for (const call of format.mock.calls) expect(call[0]).toBe("en-US");
    expect(format).toHaveBeenCalled();
    cleanup();

    intro({ reading: { source: "rehearsal", score: 71, at } });
    expect(screen.getByText(new RegExp(`with your last practice exam result of 71% from ${day}\\.$`))).toBeInTheDocument();
    cleanup();

    intro();
    expect(screen.getByText("Your score is compared with the readiness target, and every answer is explained.")).toBeInTheDocument();
  });

  it("starts the full exam or the half-length one, and leads back to the study path", () => {
    const { onStart, onBack } = intro();
    fireEvent.click(screen.getByRole("button", { name: /^Start the full practice exam/ }));
    expect(onStart).toHaveBeenLastCalledWith("full");
    fireEvent.click(screen.getByRole("button", { name: "Half-length exam: 45 questions in 45 minutes" }));
    expect(onStart).toHaveBeenLastCalledWith("half");
    fireEvent.click(screen.getByRole("button", { name: "Return to the study path" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
