import { describe, expect, it } from "vitest";
import {
  runCommand,
  resolvePath,
  completeInput,
} from "@/core/pbq/terminal-engine";
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
  dirs: {
    "/home/analyst": { "readme.txt": "file", "notes/": "dir", ".secret": "file" },
    "/home/analyst/notes": { "x.txt": "file" },
    "/tmp": { ".sysupdate": "file" },
  },
  files: {
    "/home/analyst/readme.txt": [{ text: "hello world" }, { text: "second line" }],
    "/tmp/.sysupdate": [{ text: "connect to 198.51.100.74 port 4444", tone: "red" }],
  },
  commands: [
    {
      match: ["ps aux", "ps"],
      output: [{ text: "PID COMMAND" }, { text: "3344 python3", tone: "red" }],
    },
  ],
  findings: [],
  explanation: "e",
  estimatedMinutes: 6,
};

describe("resolvePath", () => {
  it("resolves ~, absolute, relative, and ..", () => {
    expect(resolvePath("/home/analyst", "~", "/home/analyst")).toBe("/home/analyst");
    expect(resolvePath("/home/analyst", "/tmp", "/home/analyst")).toBe("/tmp");
    expect(resolvePath("/home/analyst", "notes", "/home/analyst")).toBe("/home/analyst/notes");
    expect(resolvePath("/home/analyst/notes", "..", "/home/analyst")).toBe("/home/analyst");
    expect(resolvePath("/home/analyst", "~/notes", "/home/analyst")).toBe("/home/analyst/notes");
  });
});

describe("runCommand", () => {
  it("cat prints file contents (relative and absolute)", () => {
    expect(runCommand(scn, "/home/analyst", "cat readme.txt").lines.map((l) => l.text)).toEqual([
      "hello world",
      "second line",
    ]);
    expect(runCommand(scn, "/home/analyst", "cat /tmp/.sysupdate").lines[0].text).toContain("4444");
  });

  it("cat reports a missing file and a directory", () => {
    expect(runCommand(scn, "/home/analyst", "cat nope").lines[0].text).toContain("No such file");
    expect(runCommand(scn, "/home/analyst", "cat notes").lines[0].text).toContain("Is a directory");
  });

  it("cd changes cwd and rejects unknown directories", () => {
    expect(runCommand(scn, "/home/analyst", "cd notes").cwd).toBe("/home/analyst/notes");
    const bad = runCommand(scn, "/home/analyst", "cd nope");
    expect(bad.cwd).toBe("/home/analyst");
    expect(bad.lines[0].text).toContain("No such file");
  });

  it("ls hides dotfiles unless -a, and marks directories", () => {
    const plain = runCommand(scn, "/home/analyst", "ls").lines[0].text;
    expect(plain).not.toContain(".secret");
    expect(plain).toContain("notes/");
    expect(runCommand(scn, "/home/analyst", "ls -a").lines[0].text).toContain(".secret");
  });

  it("grep filters the lines of a file", () => {
    expect(runCommand(scn, "/home/analyst", "grep world readme.txt").lines.map((l) => l.text)).toEqual([
      "hello world",
    ]);
    expect(runCommand(scn, "/home/analyst", "grep zzz readme.txt").lines[0].text).toContain("no matches");
  });

  it("matches canned scenario commands regardless of spacing and case", () => {
    const r = runCommand(scn, "/home/analyst", "PS  AUX");
    expect(r.lines.some((l) => l.text.includes("python3"))).toBe(true);
  });

  it("signals clear, reports unknown commands, and handles basics", () => {
    expect(runCommand(scn, "/home/analyst", "clear").clear).toBe(true);
    expect(runCommand(scn, "/home/analyst", "frobnicate").lines[0].text).toContain("command not found");
    expect(runCommand(scn, "/tmp", "pwd").lines[0].text).toBe("/tmp");
    expect(runCommand(scn, "/tmp", "whoami").lines[0].text).toBe("analyst");
  });
});

describe("completeInput", () => {
  it("completes a unique command and filename", () => {
    expect(completeInput(scn, "/home/analyst", "who")).toBe("whoami ");
    expect(completeInput(scn, "/home/analyst", "cat read")).toBe("cat readme.txt");
    expect(completeInput(scn, "/home/analyst", "cat ")).toBe(null);
  });
});
