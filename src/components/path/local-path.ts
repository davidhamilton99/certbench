import { sanitizePathProgress } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";
import { pathStorageKey } from "./storage-key";

/**
 * This device's copy of one exam's path, in localStorage. Dependency-free so
 * public pages (the exam picker, inline quick rounds) can use it without
 * pulling in the account client.
 */
export interface LocalPath {
  v: 1;
  /** Account the progress belongs to; null = anonymous visitor. */
  owner: string | null;
  progress: PathProgress;
}

export function readLocalPath(cert: string): LocalPath | null {
  try {
    const raw = window.localStorage.getItem(pathStorageKey(cert));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalPath>;
    return {
      v: 1,
      owner: typeof parsed.owner === "string" ? parsed.owner : null,
      progress: sanitizePathProgress(parsed.progress),
    };
  } catch {
    return null;
  }
}

export function writeLocalPath(cert: string, state: LocalPath): void {
  try {
    window.localStorage.setItem(pathStorageKey(cert), JSON.stringify(state));
  } catch {
    /* storage blocked — progress still works for this tab */
  }
}

/**
 * Apply a change to this device's saved path for an exam, keeping whose it
 * is. For public pages that play a stop inline: the path picks the work up
 * (and saves it to the account) the next time it opens.
 */
export function updateLocalPath(cert: string, change: (p: PathProgress) => PathProgress): void {
  const local = readLocalPath(cert);
  writeLocalPath(cert, {
    v: 1,
    owner: local?.owner ?? null,
    progress: change(local?.progress ?? EMPTY_PATH_PROGRESS),
  });
}
