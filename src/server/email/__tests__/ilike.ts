/**
 * ILIKE as the database and its REST layer read a pattern, for the stand-in
 * tables in tests: "%" is any run of characters, "_" is any one character, a
 * backslash makes the next character literal, and capitals do not count. The
 * REST layer also reads "*" as "%". A stand-in that matched a pattern as plain
 * text would hide a wildcard that the code forgot to escape.
 */
export function ilike(pattern: string): (value: unknown) => boolean {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "\\" && i + 1 < pattern.length) source += literal(pattern[++i]);
    else if (char === "%" || char === "*") source += "[\\s\\S]*";
    else if (char === "_") source += "[\\s\\S]";
    else source += literal(char);
  }
  const matcher = new RegExp(`^${source}$`, "i");
  return (value) => typeof value === "string" && matcher.test(value);
}

const literal = (char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
