import { mergePathProgress } from "@/core/path/progress";
import { readLocalPath, writeLocalPath } from "./local-path";
import { PRE_V15_SLUG, pathRehearsalKey, pathStorageKey, pathUnlockedKey } from "./storage-key";

/**
 * Move this device's 220-1101/1102 path to the exam's V15 slug, once: answers
 * and finished stops re-keyed for V15 (src/data/a-plus-v15), merged into
 * anything already saved under the new slug, and the old copy removed. Only a
 * device that has an old copy loads the V15 data to do it.
 */
export async function carryOverPreV15Path(cert: string): Promise<void> {
  const old = PRE_V15_SLUG[cert];
  if (!old) return;
  try {
    if (!window.localStorage.getItem(pathStorageKey(old))) return;
  } catch {
    return; // storage blocked: nothing saved to carry
  }

  const before = readLocalPath(old);
  const { A_PLUS_V15, migrateAPlusV14Progress } = await import("@/data/a-plus-v15");
  const exam = A_PLUS_V15.find((e) => e.slug === cert);
  const current = readLocalPath(cert);
  // Never fold one account's path into another's on a shared device.
  const theirs = before && current?.owner && before.owner && before.owner !== current.owner;
  if (before && exam && !theirs) {
    const carried = migrateAPlusV14Progress(before.progress, exam);
    writeLocalPath(cert, {
      v: 1,
      owner: current?.owner ?? before.owner,
      progress: current ? mergePathProgress(current.progress, carried) : carried,
    });
  }

  try {
    // Pro's unlock moment, seen on the old exam, stays seen.
    const unlocked = window.localStorage.getItem(pathUnlockedKey(old));
    if (unlocked && !window.localStorage.getItem(pathUnlockedKey(cert))) {
      window.localStorage.setItem(pathUnlockedKey(cert), unlocked);
    }
    window.localStorage.removeItem(pathStorageKey(old));
    window.localStorage.removeItem(pathUnlockedKey(old));
    // A rehearsal begun on the old exam asked its questions; it can't resume on V15.
    window.localStorage.removeItem(pathRehearsalKey(old));
  } catch {
    /* storage blocked mid-way: the old copy is carried again next time, harmlessly */
  }
}
