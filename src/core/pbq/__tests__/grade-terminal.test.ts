import { describe, expect, it } from "vitest";
import { gradeTerminal } from "@/core/pbq/grade-terminal";
import type { TerminalScenario } from "@/data/pbq/types";

const scn: TerminalScenario = {
  type: "terminal",
  id: "t",
  title: "T",
  briefing: "b",
  domain_number: "4.0",
  domain_title: "Security Operations",
  user: "analyst",
  host: "web-01",
  cwd: "/home/analyst",
  dirs: {},
  files: {},
  commands: [],
  findings: [
    { id: "ip", label: "IP", accept: ["198.51.100.74"], explanation: "" },
    { id: "acct", label: "Account", accept: ["admin"], explanation: "" },
    {
      id: "file",
      label: "File",
      accept: ["/tmp/.sysupdate", ".sysupdate"],
      acceptBasename: true,
      explanation: "",
    },
  ],
  explanation: "",
  estimatedMinutes: 6,
};

describe("gradeTerminal", () => {
  it("scores all findings correct", () => {
    const r = gradeTerminal(scn, {
      values: { ip: "198.51.100.74", acct: "admin", file: "/tmp/.sysupdate" },
    });
    expect(r.score).toBe(100);
    expect(r.correct).toBe(3);
  });

  it("is case- and whitespace-insensitive", () => {
    const r = gradeTerminal(scn, {
      values: { ip: " 198.51.100.74 ", acct: "ADMIN", file: ".sysupdate" },
    });
    expect(r.correct).toBe(3);
  });

  it("accepts a different path with a matching basename", () => {
    const r = gradeTerminal(scn, { values: { file: "/var/tmp/.sysupdate" } });
    expect(r.findings.find((f) => f.id === "file")?.correct).toBe(true);
  });

  it("gives partial credit with per-finding marks", () => {
    const r = gradeTerminal(scn, {
      values: { ip: "198.51.100.74", acct: "root", file: "" },
    });
    expect(r.correct).toBe(1);
    expect(r.score).toBe(33);
    expect(r.findings.find((f) => f.id === "acct")?.correct).toBe(false);
  });

  it("treats blank answers as wrong", () => {
    expect(gradeTerminal(scn, { values: {} }).correct).toBe(0);
  });
});
