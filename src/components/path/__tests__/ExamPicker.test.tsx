// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));

import { ExamPicker } from "../ExamPicker";

describe("ExamPicker", () => {
  beforeEach(() => {
    track.mockClear();
  });

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
    expect(versions[0].textContent).toMatch(/The newest version · 27 objectives/);
    expect(versions[1].textContent).toMatch(/Can be taken until June 11, 2027 · 28 objectives/);
    expect(document.body.textContent).toContain("Sitting it in English after June 11, 2027? Then it's SY0-801.");

    fireEvent.click(versions[0]);
    expect(track).toHaveBeenCalledWith("path_exam_picked", { cert: "security-plus-sy0-801", surface: "test" });
  });
});
