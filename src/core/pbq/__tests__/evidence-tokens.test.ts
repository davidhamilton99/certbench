import { describe, expect, it } from "vitest";
import { pbqRegistry } from "@/data/pbq";
import type { SimulationScenario } from "@/data/pbq/types";
import { hangOf, isColumnar, isTable, MAX_HANG, toneLine, type EvidenceTone } from "@/core/pbq/evidence-tokens";

const toned = (line: string, tone: EvidenceTone) =>
  toneLine(line)
    .filter((t) => t.tone === tone)
    .map((t) => t.text);

describe("evidence color", () => {
  it("gives every line of every lab's evidence back exactly", () => {
    const sims = Object.values(pbqRegistry)
      .flat()
      .filter((s): s is SimulationScenario => s.type === "simulation");
    let lines = 0;
    for (const s of sims)
      for (const t of s.tasks)
        for (const e of t.evidence ?? [])
          for (const line of e.content.split("\n")) {
            expect(
              toneLine(line)
                .map((tok) => tok.text)
                .join(""),
              `${s.id}: ${line}`
            ).toBe(line);
            lines += 1;
          }
    expect(lines).toBeGreaterThan(300);
  });

  it("picks out failures, successes, addresses and units in a ping", () => {
    expect(toned("Request timed out.", "bad")).toEqual(["Request timed out"]);
    const reply = "Reply from 10.10.1.1: bytes=32 time=1ms TTL=64";
    expect(toned(reply, "good")).toEqual(["Reply from"]);
    expect(toned(reply, "addr")).toEqual(["10.10.1.1"]);
    expect(toned(reply, "num")).toEqual(["1ms"]);
  });

  it("marks what a line reports, not what it means: a login that worked is green", () => {
    const line = "Mar 14 02:25:21 web01 sshd[9811]: Accepted password for admin from 185.220.101.47 port 52082";
    expect(toned(line, "good")).toEqual(["Accepted"]);
    expect(toned(line, "addr")).toEqual(["185.220.101.47"]);
    expect(toned(line, "dim")).toEqual(["02:25:21"]);
  });

  it("picks out CVEs, informational findings and ruled lines", () => {
    expect(toned("CVE-2024-27982   5.3   Med   [Informational — Node.js not installed]", "id")).toEqual([
      "CVE-2024-27982",
    ]);
    expect(toned("[Informational — Node.js not installed]", "warn")).toEqual(["Informational", "not installed"]);
    expect(toneLine("---------  ---------------  -------")).toEqual([
      { text: "---------  ---------------  -------", tone: "dim" },
    ]);
  });

  it("leaves a word alone when the match is only part of it", () => {
    expect(toned("Media State: Media disconnected", "good")).toEqual([]);
    expect(toned("Media State: Media disconnected", "bad")).toEqual(["disconnected"]);
    expect(toneLine("")).toEqual([{ text: "", tone: "plain" }]);
  });

  it("keeps tables in columns and lets prose wrap", () => {
    expect(isColumnar("Port      State   Service\n22/tcp    open    ssh")).toBe(true);
    expect(isColumnar("Test 1: Brightness keys — No change to screen brightness.")).toBe(false);
  });
});

// A replay on a phone: a tracert wrapped, and its times fell under the wrong
// hop. Kept whole and scrolled sideways instead, every value of an ipconfig was
// off the screen. So a table is kept whole, and other output in columns wraps
// under its own columns.
describe("evidence in columns on a narrow screen", () => {
  const tracert = [
    "Tracing route to 8.8.8.8 over a maximum of 30 hops:",
    "",
    "  1     1 ms     1 ms     1 ms  10.10.1.1",
    "  2     *        *        *     Request timed out.",
    "  3     *        *        *     Request timed out.",
  ].join("\n");

  it("knows a table by its rule of dashes, or by rows whose cells start in the same places", () => {
    expect(isTable("Rule  Seq  Src\n----  ---  ---------\n1     10   Any")).toBe(true);
    expect(isTable(tracert)).toBe(true);
    // Keys and values, however well aligned, are not a table.
    expect(isTable("Server:  dns1.corp.internal\nAddress:  10.10.1.254")).toBe(false);
    expect(
      isTable(
        "LAN Subnet      : 192.168.1.0/24\nStatic range    : 192.168.1.1 to 192.168.1.19  (excluded from DHCP)\nDHCP pool       : 192.168.1.20 to 192.168.1.254"
      )
    ).toBe(false);
    // Two aligned rows are not yet a table.
    expect(isTable("a  b  c\nd  e  f")).toBe(false);
  });

  it("hangs a wrapped part under its value, or under its second cell", () => {
    expect(hangOf("Static range    : 192.168.1.1 to 192.168.1.19  (excluded from DHCP)")).toBe(18);
    expect(hangOf("1L+3S    : Memory not installed / incompatible")).toBe(11);
    expect(hangOf("Server:  dns1.corp.internal")).toBe(9);
    expect(hangOf("C        10.10.1.0/24 is directly connected, GigabitEthernet0/0")).toBe(9);
    expect(hangOf("  Channel     : 6 (Auto)")).toBe(16);
    // An indented line that is not in cells hangs under its own first character.
    expect(hangOf("      10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks")).toBe(6);
    expect(hangOf("Radio 0 (2.4 GHz)")).toBe(0);
    // A deep column is capped, so that a phone keeps room for the wrapped part.
    expect(hangOf("   IPv4 Address. . . . . . . . . . . : 10.10.1.55")).toBe(MAX_HANG);
  });

  it("keeps the labs' tables whole and lets their other output in columns wrap", () => {
    const blocks = Object.values(pbqRegistry)
      .flat()
      .filter((s): s is SimulationScenario => s.type === "simulation")
      .flatMap((s) => s.tasks.flatMap((t) => t.evidence ?? []));
    const content = (label: string) => blocks.find((b) => b.label.startsWith(label))!.content;
    expect(isTable(content("tracert 8.8.8.8"))).toBe(true);
    expect(isTable(content("netstat -tulnp"))).toBe(true);
    expect(isTable(content("ipconfig /all"))).toBe(false);
    expect(isTable(content("Router show ip route"))).toBe(false);
  });
});
