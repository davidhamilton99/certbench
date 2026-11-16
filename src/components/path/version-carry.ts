import { api } from "@/lib/api-client";
import { getPathProgress } from "@/contracts/path";
import { hasStarted, mergePathProgress, sanitizePathProgress } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathCert, type PathProgress } from "@/core/path/types";
import { examVersions } from "@/core/path/versions";
import { carryProgress, type CarriedProgress, type VersionMapping } from "@/core/path/version-carry";
import { readLocalPath } from "./local-path";

/**
 * How to carry a version's path into the version after it, loaded only when a
 * learner has something to carry. Security+ SY0-701 → SY0-801: questions by
 * the copies' fixed ids (src/data/sy0-801/copies.json, the ids migration 030
 * gives them), reps by key, minus the ones SY0-801 rewords (src/data/path).
 */
const MAPPINGS: Partial<Record<PathCert, () => Promise<VersionMapping>>> = {
  "security-plus-sy0-801": async () => {
    const [{ default: questions }, content, { SY0_801_MAP }] = await Promise.all([
      import("@/data/sy0-801/copies.json"),
      import("@/data/path/security-plus-sy0-801"),
      import("@/data/sy0-801/map"),
    ]);
    const { SY0_801_PATH_CONTENT, SY0_701_REWORDED } = content;
    const reps: Record<string, string> = {};
    for (const rep of [...SY0_801_PATH_CONTENT.authored, ...(SY0_801_PATH_CONTENT.warmup.authored ?? [])]) {
      if (!(rep.key in SY0_701_REWORDED)) reps[rep.key] = rep.objective;
    }
    return {
      questions: questions as unknown as VersionMapping["questions"],
      reps,
      replacedLabs: SY0_801_MAP.replacedLabs,
    };
  },
};

export type VersionCarry = CarriedProgress & { from: PathCert; source: "device" | "account" | "both" };

/**
 * A first visit to the newer version's path, with nothing on it yet: the
 * earlier version's answers, from this device and (signed in) the account,
 * re-keyed for the newer one. Null when there's nothing to carry. The earlier
 * version keeps its own path untouched, so switching back is safe.
 */
export async function carryFromEarlierVersion(cert: PathCert, userId: string | null): Promise<VersionCarry | null> {
  const load = MAPPINGS[cert];
  const [newest, earlier] = examVersions(cert);
  if (!load || newest !== cert || !earlier) return null;

  // Never another account's path from a shared device.
  const local = readLocalPath(earlier);
  const device = local && (local.owner === null || local.owner === userId) ? local.progress : EMPTY_PATH_PROGRESS;
  let account: PathProgress = EMPTY_PATH_PROGRESS;
  if (userId) {
    try {
      account = sanitizePathProgress((await api(getPathProgress, { cert: earlier })).progress);
    } catch {
      /* unreachable: the device's copy is still worth carrying */
    }
  }
  const from = mergePathProgress(account, device);
  if (!hasStarted(from)) return null;

  const carried = carryProgress(from, await load());
  if (carried.answers === 0 && carried.labs === 0) return null;
  const onDevice = hasStarted(device);
  const onAccount = hasStarted(account);
  return { ...carried, from: earlier, source: onDevice && onAccount ? "both" : onAccount ? "account" : "device" };
}
