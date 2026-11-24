/**
 * Colour for a lab's evidence (logs, command output, test results), so it can
 * be scanned the way a console is: failures in red, successes in green,
 * addresses and IDs picked out, timestamps and rules dimmed. The colour says
 * what a line reports, not whether it's the clue: a green "Accepted password"
 * after a run of red "Failed" lines is exactly what an analyst looks for.
 */

export type EvidenceTone = "plain" | "bad" | "warn" | "good" | "addr" | "id" | "num" | "dim";

export interface EvidenceToken {
  text: string;
  tone: EvidenceTone;
}

/** Tried in this order at each position; the first that matches wins. */
const PATTERNS: [Exclude<EvidenceTone, "plain">, string][] = [
  ["dim", String.raw`\b\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?\b|\b\d{2}:\d{2}:\d{2}\b`],
  ["addr", String.raw`\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?(?::\d{1,5})?\b|\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b`],
  ["id", String.raw`\bCVE-\d{4}-\d{4,7}\b`],
  [
    "bad",
    String.raw`\b(?:fail(?:ed|ures?|s)?|errors?|denied|refused|(?:request )?timed out|unreachable|critical|crit|corrupt(?:ed|ion)?|invalid|rejected|dropped|disconnected|offline|expired|mismatch(?:ed)?|no change|not responding|malicious)\b`,
  ],
  ["warn", String.raw`\b(?:warn(?:ing)?|degraded|excessive|retries|not installed|informational)\b`],
  ["good", String.raw`\b(?:ok|pass(?:ed)?|success(?:ful(?:ly)?)?|accepted|connected|reply from|no issues|healthy|resolved|up)\b`],
  ["num", String.raw`\b\d+(?:\.\d+)?\s?(?:ms|dBm|dB|MHz|GHz|Mbps|Gbps|GB|MB|KB|TB)\b|\b\d+(?:\.\d+)?%`],
];

const MATCHER = new RegExp(PATTERNS.map(([, p]) => `(${p})`).join("|"), "gi");

/** A rule line, e.g. "---------  -------", is dimmed whole. */
const RULE = /^[\s\-=_|+*]+$/;

/** One line of evidence as coloured runs. Joining the runs' text gives the line back. */
export function toneLine(line: string): EvidenceToken[] {
  if (line.trim() && RULE.test(line)) return [{ text: line, tone: "dim" }];
  const out: EvidenceToken[] = [];
  let last = 0;
  for (const m of line.matchAll(MATCHER)) {
    const at = m.index ?? 0;
    if (!m[0]) continue;
    const group = m.slice(1).findIndex((g) => g !== undefined);
    if (at > last) out.push({ text: line.slice(last, at), tone: "plain" });
    out.push({ text: m[0], tone: PATTERNS[group][0] });
    last = at + m[0].length;
  }
  if (last < line.length || out.length === 0) out.push({ text: line.slice(last), tone: "plain" });
  return out;
}

/**
 * Whether a block is laid out in columns (two or more spaces between words on
 * some line), so its spacing is kept and it is not numbered line by line. A
 * table among them (`isTable`) also keeps every line whole and scrolls
 * sideways; the rest wrap, each wrapped part under its own column (`hangOf`).
 */
export function isColumnar(content: string): boolean {
  return content.split("\n").some((l) => /\S {2,}\S/.test(l));
}

/** Where each cell of a line starts: runs of text split by two or more spaces. */
function cellStarts(line: string): number[] {
  return [...line.matchAll(/\S+(?: \S+)*/g)].map((m) => m.index ?? 0);
}

/** A rule under a table's header: two or more runs of dashes, e.g. "----  -------". */
const TABLE_RULE = /^[\s-]*-{2,} +-{2,}[\s-]*$/;

/**
 * Whether a block is a table, whose rows mean something only whole: it has a
 * rule of dashes under its header, or three rows running with three or more
 * cells each that start in the same places (a tracert). A table keeps every
 * line whole and scrolls sideways where it is wider than its box. Wrapped on a
 * phone, a tracert's times and hosts fell under the wrong hop.
 */
export function isTable(content: string): boolean {
  const lines = content.split("\n");
  if (lines.some((l) => TABLE_RULE.test(l))) return true;
  let rows = 1;
  for (let i = 1; i < lines.length; i++) {
    const a = cellStarts(lines[i - 1]);
    const b = cellStarts(lines[i]);
    const same = b.length >= 3 && a.length === b.length && b.every((x, k) => Math.abs(x - a[k]) <= 1);
    rows = same ? rows + 1 : 1;
    if (rows >= 3) return true;
  }
  return false;
}

/** The deepest a wrapped part is set, in characters: past this a phone has too little room left. */
export const MAX_HANG = 20;

/**
 * How far in, in characters, the wrapped part of a line in columns is set:
 * under the value of a "Key : value" line, under the second cell of a line in
 * cells, under its own first character for a line that is only indented. So a
 * line that wraps on a phone stays in its column ("Static range    : 192.168.1.1
 * to" wraps under the address, not under "Static"), and a line that fits is
 * drawn exactly as it is. Never deeper than MAX_HANG.
 */
export function hangOf(line: string): number {
  const indent = /^ */.exec(line)?.[0].length ?? 0;
  const rest = line.slice(indent);
  // "Key : value", "Key: value", "Key . . . : value": where the value starts.
  const key = /^[^:]{1,60}?:\s+(?=\S)/.exec(rest)?.[0].length;
  // Where the second cell starts, after a run of two or more spaces.
  const cell = /^\S+(?: \S+)* {2,}(?=\S)/.exec(rest)?.[0].length;
  let at = indent + Math.min(key ?? Infinity, cell ?? Infinity);
  if (!Number.isFinite(at)) return Math.min(indent, MAX_HANG);
  // A second cell that opens with the colon ("Static range    : 192…") hangs under the value after it.
  const colon = cell !== undefined && cell < (key ?? Infinity) ? /^: +(?=\S)/.exec(line.slice(at))?.[0].length : undefined;
  if (colon) at += colon;
  return Math.min(at, MAX_HANG);
}
