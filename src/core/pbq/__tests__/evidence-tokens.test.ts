import { describe, expect, it } from "vitest";
import { pbqRegistry } from "@/data/pbq";
import type { SimulationScenario } from "@/data/pbq/types";
import { isColumnar, toneLine, type EvidenceTone } from "@/core/pbq/evidence-tokens";

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
