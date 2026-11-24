// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EvidenceConsole } from "../SimCaseFile";

afterEach(cleanup);

const tracert = {
  label: "tracert 8.8.8.8",
  content: `Tracing route to 8.8.8.8 over a maximum of 30 hops:

  1     1 ms     1 ms     1 ms  10.10.1.1
  2     *        *        *     Request timed out.

Trace complete.`,
};
const ping = {
  label: "ping 10.10.1.1",
  content: `Pinging 10.10.1.1 with 32 bytes of data:
Reply from 10.10.1.1: bytes=32 time=1ms TTL=64`,
};

const rows = (label: string) => [...screen.getByRole("group", { name: label }).querySelectorAll(":scope > div > div")];

// A replay on a phone: the tracert's lines wrapped, a line number stood beside
// each hop number, and the learner could not tell which hop failed.
describe("the evidence console", () => {
  it("keeps output in columns on one line each, with no line numbers beside its own", () => {
    render(<EvidenceConsole evidence={[tracert]} />);
    const lines = rows("tracert 8.8.8.8");
    expect(lines.map((l) => l.textContent)).toEqual([
      "Tracing route to 8.8.8.8 over a maximum of 30 hops:",
      " ",
      "  1     1 ms     1 ms     1 ms  10.10.1.1",
      "  2     *        *        *     Request timed out.",
      " ",
      "Trace complete.",
    ]);
    for (const line of lines) expect(line.lastElementChild?.className).toContain("whitespace-pre");
    expect(lines[2].lastElementChild?.className).not.toContain("whitespace-pre-wrap");
  });

  it("numbers the lines of other output, which wraps", () => {
    render(<EvidenceConsole evidence={[ping]} />);
    const [first] = rows("ping 10.10.1.1");
    expect(first.firstElementChild?.textContent).toBe("1");
    expect(first.lastElementChild?.className).toContain("whitespace-pre-wrap");
  });
});
