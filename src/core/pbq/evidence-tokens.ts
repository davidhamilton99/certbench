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
 * some line), so it keeps its spacing and scrolls sideways instead of wrapping.
 */
export function isColumnar(content: string): boolean {
  return content.split("\n").some((l) => /\S {2,}\S/.test(l));
}
