/**
 * Pure command engine for terminal PBQ scenarios. The player feeds it the
 * current working directory and a typed command; it returns the output lines
 * (and the new cwd). Universal shell commands — ls, cd, pwd, cat, grep,
 * whoami, hostname, id, clear, help — are driven entirely by the scenario's
 * `dirs`/`files`, so authoring a new case is data, never code. Scenario-specific
 * commands (ps, ss, last, crontab -l, …) come from `scenario.commands`.
 *
 * Kept pure (no DOM, no state) so it is unit-tested directly.
 */

import type { TerminalScenario, TerminalLine } from "@/data/pbq/types";

export interface TerminalResult {
  lines: TerminalLine[];
  cwd: string;
  /** When true, the player clears the scrollback (the `clear` command). */
  clear?: boolean;
}

function home(scenario: TerminalScenario): string {
  return "/home/" + scenario.user;
}

/** Collapse whitespace and lowercase — for matching canned commands. */
export function normalizeCommand(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Resolve an argument against the cwd into a canonical absolute path. */
export function resolvePath(cwd: string, arg: string, homeDir: string): string {
  let p: string;
  if (!arg || arg === "~") p = homeDir;
  else if (arg === "~/" || arg.startsWith("~/")) p = homeDir + arg.slice(1);
  else if (arg.startsWith("/")) p = arg;
  else p = cwd + "/" + arg;

  const stack: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  return "/" + stack.join("/");
}

function fileAt(scenario: TerminalScenario, path: string): TerminalLine[] | null {
  if (scenario.files[path]) return scenario.files[path];
  // Allow a dir entry spelled with a trailing slash in files map too.
  return null;
}

function dirAt(
  scenario: TerminalScenario,
  path: string
): Record<string, "file" | "dir"> | null {
  return scenario.dirs[path] ?? null;
}

function line(text: string, tone?: TerminalLine["tone"], prefix?: string): TerminalLine {
  return prefix ? { text, tone, prefix } : tone ? { text, tone } : { text };
}

function helpLines(scenario: TerminalScenario): TerminalLine[] {
  const builtins: [string, string][] = [
    ["ls [-a] [dir]", "list files (-a shows hidden)"],
    ["cd <dir>", "change directory"],
    ["cat <file>", "print a file"],
    ["grep <text> <file>", "search a file"],
    ["pwd / whoami / clear", "basics"],
  ];
  const extra = Array.from(new Set(scenario.commands.map((c) => c.match[0]))).join(", ");
  const out = builtins.map(([c, d]) => line(c.padEnd(20) + d, "cyan"));
  if (extra) out.push(line("also: " + extra, "muted"));
  return out;
}

function lsLines(
  scenario: TerminalScenario,
  cwd: string,
  args: string[]
): TerminalLine[] {
  const flags = args.filter((a) => a.startsWith("-")).join("");
  const rest = args.filter((a) => !a.startsWith("-"));
  const target = resolvePath(cwd, rest[0] || "", home(scenario));
  const dir = dirAt(scenario, target);
  if (!dir) {
    if (fileAt(scenario, target)) return [line(rest[0] || target)];
    return [line("ls: cannot access '" + (rest[0] || target) + "': No such file or directory", "amber")];
  }
  const showHidden = flags.includes("a");
  const longFmt = flags.includes("l");
  const names = Object.keys(dir)
    .filter((n) => showHidden || !n.startsWith("."))
    .sort();
  if (!names.length) return [line("(empty)", "dim")];
  const isDir = (n: string) => dir[n] === "dir" || n.endsWith("/");
  if (longFmt) {
    return names.map((n) =>
      line(
        (isDir(n) ? "dir   " : "file  ") + n,
        isDir(n) ? "cyan" : n.startsWith(".") ? "amber" : "default"
      )
    );
  }
  // Compact listing: one wrapped line, directories marked with a trailing slash.
  const display = names
    .map((n) => (isDir(n) && !n.endsWith("/") ? n + "/" : n))
    .join("  ");
  return [line(display)];
}

function grepLines(
  scenario: TerminalScenario,
  cwd: string,
  args: string[]
): TerminalLine[] {
  if (args.length < 2) return [line("usage: grep <text> <file>", "muted")];
  const needle = args[0].replace(/^["']|["']$/g, "").toLowerCase();
  const path = resolvePath(cwd, args.slice(1).join(" "), home(scenario));
  const file = fileAt(scenario, path);
  if (!file) return [line("grep: " + args.slice(1).join(" ") + ": No such file or directory", "amber")];
  const hits = file.filter((l) => ((l.prefix || "") + l.text).toLowerCase().includes(needle));
  return hits.length ? hits : [line("(no matches)", "dim")];
}

export function runCommand(
  scenario: TerminalScenario,
  cwd: string,
  raw: string
): TerminalResult {
  const input = raw.trim();
  if (!input) return { lines: [], cwd };
  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "help":
      return { lines: helpLines(scenario), cwd };
    case "clear":
      return { lines: [], cwd, clear: true };
    case "pwd":
      return { lines: [line(cwd)], cwd };
    case "whoami":
      return { lines: [line(scenario.user)], cwd };
    case "hostname":
      return { lines: [line(scenario.host)], cwd };
    case "id":
      return { lines: [line("uid=1001(" + scenario.user + ") gid=1001(" + scenario.user + ") groups=1001(" + scenario.user + ")", "muted")], cwd };
    case "ls":
      return { lines: lsLines(scenario, cwd, args), cwd };
    case "cd": {
      const target = resolvePath(cwd, args[0] || "~", home(scenario));
      if (dirAt(scenario, target)) return { lines: [], cwd: target };
      return { lines: [line("cd: " + (args[0] || "") + ": No such file or directory", "amber")], cwd };
    }
    case "cat": {
      if (!args.length) return { lines: [line("usage: cat <file>", "muted")], cwd };
      const path = resolvePath(cwd, args[0], home(scenario));
      const file = fileAt(scenario, path);
      if (file) return { lines: file, cwd };
      if (dirAt(scenario, path)) return { lines: [line("cat: " + args[0] + ": Is a directory", "amber")], cwd };
      return { lines: [line("cat: " + args[0] + ": No such file or directory", "amber")], cwd };
    }
    case "grep":
      return { lines: grepLines(scenario, cwd, args), cwd };
  }

  // Scenario-specific canned commands (ps aux, ss -tulpn, last, crontab -l…).
  const norm = normalizeCommand(input);
  for (const c of scenario.commands) {
    if (c.match.some((m) => normalizeCommand(m) === norm)) {
      return { lines: c.output, cwd };
    }
  }

  return { lines: [line(cmd + ": command not found", "amber"), line("(type help)", "dim")], cwd };
}

/** Command/filename completion for the Tab key. Returns the completed input, or null. */
export function completeInput(scenario: TerminalScenario, cwd: string, value: string): string | null {
  const toks = value.split(/\s+/);
  if (toks.length <= 1) {
    const base = ["ls", "cd", "cat", "grep", "pwd", "whoami", "clear", "help", "hostname"];
    const cands = Array.from(new Set(base.concat(scenario.commands.map((c) => c.match[0].split(" ")[0]))));
    const m = cands.filter((c) => c.startsWith(value));
    return m.length === 1 ? m[0] + " " : null;
  }
  const dir = dirAt(scenario, cwd);
  if (!dir) return null;
  const frag = toks[toks.length - 1];
  const m = Object.keys(dir).filter((n) => n.startsWith(frag));
  if (m.length === 1) {
    toks[toks.length - 1] = m[0];
    return toks.join(" ");
  }
  return null;
}
