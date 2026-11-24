// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EvidenceConsole, hangStyle } from "../SimCaseFile";

afterEach(cleanup);

const tracert = {
  label: "tracert 8.8.8.8",
  content: `Tracing route to 8.8.8.8 over a maximum of 30 hops:

  1     1 ms     1 ms     1 ms  10.10.1.1
  2     *        *        *     Request timed out.
  3     *        *        *     Request timed out.

Trace complete.`,
};
const requirements = {
  label: "Network Requirements Document",
  content: `LAN Subnet      : 192.168.1.0/24
Static range    : 192.168.1.1 to 192.168.1.19  (excluded from DHCP)`,
};
const ping = {
  label: "ping 10.10.1.1",
  content: `Pinging 10.10.1.1 with 32 bytes of data:
Reply from 10.10.1.1: bytes=32 time=1ms TTL=64`,
};

const rows = (label: string) => [...screen.getByRole("group", { name: label }).querySelectorAll(":scope > div > div")];
const text = (row: Element) => row.lastElementChild as HTMLElement;

// A replay on a phone: the tracert's lines wrapped, a line number stood beside
// each hop number, and the learner could not tell which hop failed.
describe("the evidence console", () => {
  it("keeps a table's lines whole, with no line numbers beside its own", () => {
    render(<EvidenceConsole evidence={[tracert]} />);
    const lines = rows("tracert 8.8.8.8");
    expect(lines.map((l) => l.textContent)).toEqual([
      "Tracing route to 8.8.8.8 over a maximum of 30 hops:",
      " ",
      "  1     1 ms     1 ms     1 ms  10.10.1.1",
      "  2     *        *        *     Request timed out.",
      "  3     *        *        *     Request timed out.",
      " ",
      "Trace complete.",
    ]);
    for (const line of lines) {
      expect(line.children).toHaveLength(1);
      expect(text(line).className).toContain("whitespace-pre");
      expect(text(line).className).not.toContain("whitespace-pre-wrap");
    }
  });

  it("wraps other output in columns under each line's own column", () => {
    render(<EvidenceConsole evidence={[requirements]} />);
    const [subnet, range] = rows("Network Requirements Document");
    expect(subnet.children).toHaveLength(1);
    expect(text(range).className).toContain("whitespace-pre-wrap");
    // The wrapped part of "Static range    : 192.168.1.1 to …" starts under the address, and the
    // first line from the start. (jsdom keeps the indent and drops the min() padding it cannot read.)
    expect(text(range).style.textIndent).toContain("18ch");
    expect(hangStyle("Static range    : 192.168.1.1 to 192.168.1.19  (excluded from DHCP)")).toEqual({
      // At most 40% of the box in, so a phone keeps room for the value.
      paddingLeft: "min(18ch, 40cqw)",
      textIndent: "calc(-1 * min(18ch, 40cqw))",
    });
    expect(hangStyle("Radio 0 (2.4 GHz)")).toBeUndefined();
  });

  it("numbers the lines of other output, which wraps", () => {
    render(<EvidenceConsole evidence={[ping]} />);
    const [first] = rows("ping 10.10.1.1");
    expect(first.firstElementChild?.textContent).toBe("1");
    expect(text(first).className).toContain("whitespace-pre-wrap");
    expect(text(first).getAttribute("style")).toBeNull();
  });
});
