// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));

import { PATH_CERTS } from "@/core/path/types";
import { EXAM_NAMES, OBJECTIVE_TITLES } from "@/data/path/titles";
import { EXAM_LIST, ExamPicker } from "../ExamPicker";

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

/** A study path as this device keeps it: one answer, and `steps` finished steps, the last at `at`. */
function started(steps: number, at: number): string {
  return JSON.stringify({
    v: 1,
    owner: null,
    progress: {
      items: { "a|1.2|w3": { a: 1, c: 1, s: 1, t: at - 1000 } },
      stops: Object.fromEntries(Array.from({ length: steps }, (_, i) => [i === 0 ? "warmup" : `1.${i}`, { n: 1, c: 6, t: 8, at }])),
      checkpoint: null,
      rehearsals: [],
      labs: {},
      goal: null,
    },
  });
}

/** The server's markup for the list, placed in the page as a browser would have it before any script runs. */
function serverMarkup(upgraded = false): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = renderToString(<ExamPicker surface="test" upgraded={upgraded} />);
  document.body.appendChild(container);
  return container;
}

/** Run the list's inline script as the browser does when it reaches it. */
function runInlineScript(container: HTMLElement) {
  const script = container.querySelector("script");
  if (!script) throw new Error("the list's markup holds no script");
  Object.defineProperty(document, "currentScript", { configurable: true, get: () => script });
  try {
    new Function(script.textContent ?? "")();
  } finally {
    Reflect.deleteProperty(document, "currentScript");
  }
}

beforeEach(() => {
  track.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("ExamPicker", () => {
  it("shows one tile per exam, Security+ once", () => {
    render(<ExamPicker surface="test" />);
    expect(screen.getByRole("button", { name: /Security\+/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Network\+/ }).getAttribute("href")).toBe("/path/network-plus-n10-009");
    expect(screen.getByRole("link", { name: /A\+ Core 1/ }).getAttribute("href")).toBe("/path/a-plus-core1-220-1201");
    expect(screen.getByRole("link", { name: /A\+ Core 2/ }).getAttribute("href")).toBe("/path/a-plus-core2-220-1202");
    expect(screen.queryByRole("link", { name: /SY0-801/ })).toBeNull();
  });

  it("asks which Security+ version, newest first, and says how to tell", () => {
    render(<ExamPicker surface="test" upgraded />);
    const tile = screen.getByRole("button", { name: /Security\+/ });
    fireEvent.click(tile);
    expect(tile.getAttribute("aria-expanded")).toBe("true");
    expect(track).toHaveBeenCalledWith("path_versions_opened", { exam: "Security+", surface: "test" });

    const versions = screen.getAllByRole("link").filter((a) => /SY0-\d{3}/.test(a.textContent ?? ""));
    expect(versions.map((a) => a.getAttribute("href"))).toEqual([
      "/path/security-plus-sy0-801?upgraded=1",
      "/path/security-plus-sy0-701?upgraded=1",
    ]);
    expect(versions[0].textContent).toMatch(/This is the newest version\. It has 27 objectives\./);
    expect(versions[1].textContent).toMatch(/This version can be taken until June 11, 2027\. It has 28 objectives\./);
    expect(document.body.textContent).toContain(
      "If you will take the exam in English after June 11, 2027, choose SY0-801."
    );

    fireEvent.click(versions[0]);
    expect(track).toHaveBeenCalledWith("path_exam_picked", { cert: "security-plus-sy0-801", surface: "test" });
  });

  it("prints each exam's name and its number of objectives as the titles table has them, without loading the table", () => {
    for (const cert of PATH_CERTS) {
      expect(EXAM_LIST[cert].name, cert).toBe(EXAM_NAMES[cert]);
      expect(EXAM_LIST[cert].objectives, cert).toBe(Object.keys(OBJECTIVE_TITLES[cert]).length);
    }
    expect(Object.keys(EXAM_LIST).sort()).toEqual([...PATH_CERTS].sort());
    // The table holds every objective title of five exams; the list is on the home page.
    const source = readFileSync(join(process.cwd(), "src/components/path/ExamPicker.tsx"), "utf8");
    expect(source).not.toMatch(/from "@\/data\/path\/titles"/);
  });

  it("sets each exam code in the code face and the word between them in the text face", () => {
    render(<ExamPicker surface="test" />);
    const tile = screen.getByRole("button", { name: /SY0-801 and SY0-701/ });
    const codes = [...tile.querySelectorAll(".font-mono")].map((el) => el.textContent);
    expect(codes).toEqual(["SY0-801", "SY0-701"]);
    // The word that joins them is outside both.
    expect(tile.querySelector(".font-mono")?.parentElement?.textContent).toBe("SY0-801 and SY0-701");
    expect(tile.querySelector(".font-mono")?.parentElement?.className).not.toContain("font-mono");
  });

  it("shows keyboard focus on a row with the page's own outline, drawn inside the row", () => {
    render(<ExamPicker surface="test" />);
    const rows = [screen.getByRole("button", { name: /Security\+/ }), screen.getByRole("link", { name: /Network\+/ })];
    for (const row of rows) {
      // The list's card clips what is drawn outside it, so the ring is set inside.
      expect(row.className).toContain("focus-visible:-outline-offset-2");
      expect(row.className).not.toMatch(/outline-none|focus-visible:bg-|focus-visible:ring/);
    }
  });
});

describe("the study path already started on this device", () => {
  it("is offered first, in the list's first drawing in the browser", () => {
    window.localStorage.setItem("cb_path_network-plus-n10-009", started(1, 2_000));
    window.localStorage.setItem("cb_path_security-plus-sy0-701", started(3, 9_000));
    render(<ExamPicker surface="test" />);

    const card = screen.getByRole("link", { name: /Continue your Security\+ study path \(SY0-701\)/ });
    expect(card.getAttribute("href")).toBe("/path/security-plus-sy0-701");
    expect(card.textContent).toContain("You have completed 3 steps.");
    // It comes before the list of exams.
    const list = screen.getByRole("list");
    expect(card.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(card);
    expect(track).toHaveBeenCalledWith("path_exam_picked", { cert: "security-plus-sy0-701", surface: "test_resume" });
  });

  it("says one step in the singular, and nothing about steps before the first is finished", () => {
    window.localStorage.setItem("cb_path_network-plus-n10-009", started(1, 2_000));
    const { unmount } = render(<ExamPicker surface="test" />);
    expect(screen.getByRole("link", { name: /Continue your Network\+ study path/ }).textContent).toContain(
      "You have completed 1 step."
    );
    unmount();

    window.localStorage.setItem("cb_path_network-plus-n10-009", started(0, 2_000));
    render(<ExamPicker surface="test" />);
    expect(screen.getByRole("link", { name: /Continue your Network\+ study path/ }).textContent).not.toMatch(/completed/);
  });

  it("is not offered on a device that has started none", () => {
    render(<ExamPicker surface="test" />);
    expect(screen.queryByRole("link", { name: /Continue your/ })).toBeNull();

    const container = serverMarkup();
    runInlineScript(container);
    expect(container.querySelector("[hidden]")).not.toBeNull();
    expect(container.querySelector("[data-resume='title']")?.textContent).toBe("");
  });

  it("is filled in by the server's markup before the page's scripts run, so the list does not move", () => {
    window.localStorage.setItem("cb_path_network-plus-n10-009", started(1, 2_000));
    window.localStorage.setItem("cb_path_security-plus-sy0-701", started(3, 9_000));

    // What the browser has drawn in the browser alone, to compare with.
    const drawn = render(<ExamPicker surface="test" upgraded />);
    const card = screen.getByRole("link", { name: /Continue your/ });
    const expected = { text: card.textContent, href: card.getAttribute("href"), className: card.className };
    drawn.unmount();

    // As sent: the card is there, empty and out of sight, and leads nowhere.
    const container = serverMarkup(true);
    const slot = container.querySelector("[hidden]");
    expect(slot).not.toBeNull();
    expect(slot?.querySelector("a")?.hasAttribute("href")).toBe(false);
    expect(slot?.textContent?.trim()).toBe("");

    // The inline script, run as text exactly as the page carries it.
    runInlineScript(container);
    const filled = container.querySelector("a");
    expect(slot?.hasAttribute("hidden")).toBe(false);
    expect(filled?.textContent).toBe(expected.text);
    expect(filled?.getAttribute("href")).toBe(expected.href);
    expect(filled?.className).toBe(expected.className);
  });

  it("is taken over by the page's scripts without a correction", async () => {
    window.localStorage.setItem("cb_path_security-plus-sy0-701", started(2, 9_000));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recovered = vi.fn();

    const container = serverMarkup();
    runInlineScript(container);
    const before = container.querySelector("a")?.textContent;

    const root = await act(async () =>
      hydrateRoot(container, <ExamPicker surface="test" />, { onRecoverableError: recovered })
    );

    expect(recovered).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    const cards = [...container.querySelectorAll("a")].filter((a) => /Continue your/.test(a.textContent ?? ""));
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toBe(before);
    expect(cards[0].getAttribute("href")).toBe("/path/security-plus-sy0-701");
    // The script has done its work and is not kept.
    expect(container.querySelector("script")).toBeNull();
    await act(async () => root.unmount());
  });

  it("reads the device again when another tab writes to it", () => {
    render(<ExamPicker surface="test" />);
    expect(screen.queryByRole("link", { name: /Continue your/ })).toBeNull();
    window.localStorage.setItem("cb_path_a-plus-core2-220-1202", started(1, 5_000));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "cb_path_a-plus-core2-220-1202" }));
    });
    expect(screen.getByRole("link", { name: /Continue your A\+ Core 2 study path/ }).getAttribute("href")).toBe(
      "/path/a-plus-core2-220-1202"
    );
  });
});
