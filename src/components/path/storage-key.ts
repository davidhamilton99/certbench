/** Where this device keeps one exam's path progress (shared by server and client code). */
export const pathStorageKey = (cert: string) => `cb_path_${cert}`;

/** Set once this device has shown Pro opening one exam's path. */
export const pathUnlockedKey = (cert: string) => `cb_path_unlocked_${cert}`;

/** This device's exam rehearsal for one exam: one in progress, or the last one finished. */
export const pathRehearsalKey = (cert: string) => `cb_path_rehearsal_${cert}`;

/**
 * The slug an exam's path had before A+ moved to 220-1201/1202. A device that
 * studied the old exam keeps its path there until carry-over.ts moves it.
 * (src/data/a-plus-v15 holds the same pairs; a test keeps them equal.)
 */
export const PRE_V15_SLUG: Readonly<Record<string, string>> = {
  "a-plus-core1-220-1201": "a-plus-core1-220-1101",
  "a-plus-core2-220-1202": "a-plus-core2-220-1102",
};

/** Every key one exam's path progress may be under on this device, its own first. */
export function pathStorageKeys(cert: string): string[] {
  const old = PRE_V15_SLUG[cert];
  return old ? [pathStorageKey(cert), pathStorageKey(old)] : [pathStorageKey(cert)];
}
