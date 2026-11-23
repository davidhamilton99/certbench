import Link from "next/link";
import { track } from "@/lib/analytics";
import type { PathCert } from "@/core/path/types";
import { EXAM_CODES, LAST_EXAM_DAY, longDate, otherVersions } from "@/core/path/versions";

/**
 * Under the map of an exam taught in two versions: which one this path is, and
 * a way to the other. Pro covers both, and a switch carries their answers.
 */
export function VersionSwitch({ cert }: { cert: PathCert }) {
  const others = otherVersions(cert);
  if (!others.length) return null;
  const last = LAST_EXAM_DAY[cert];
  return (
    <p className="text-sm text-muted-foreground">
      You are studying {EXAM_CODES[cert]}
      {last ? `, which can be taken in English until ${longDate(last)}` : ""}.{" "}
      {others.map((other) => (
        <Link
          key={other}
          href={`/path/${other}`}
          onClick={() => track("path_version_switched", { from: cert, to: other })}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Change to {EXAM_CODES[other]}
        </Link>
      ))}
      .
    </p>
  );
}
