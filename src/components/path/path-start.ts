/**
 * `path_started` counts a visitor's first answer on a study path's own page.
 * The path page records it when the device's copy of the path has not started.
 *
 * The home page's sample questions are the path's own first questions, and
 * their answers are kept on the device as the path's first answers, so that
 * the path does not ask them again. A visitor who answers a sample and then
 * opens the path therefore arrives with a copy that has started already, and
 * the path page would never record the event for them: the top of every
 * funnel that begins at `path_started` would shrink without anything having
 * changed for visitors.
 *
 * So the public page leaves a mark when its answer is the copy's first, and
 * the path page records `path_started` once for such a copy, at the visitor's
 * first answer there, and removes the mark. The event keeps its meaning.
 *
 * Dependency-free, like local-path.ts, so a public page can use it.
 */
const key = (cert: string) => `cb_path_start_owed_${cert}`;

/** Exams for which this tab has already found no mark, so a later answer does not read storage again. */
const settled = new Set<string>();

/**
 * Called by a public page as it records an answer that begins the device's
 * copy of a path: the path page still owes its `path_started` for this copy.
 */
export function oweStartEvent(cert: string): void {
  settled.delete(cert);
  try {
    window.localStorage.setItem(key(cert), "1");
  } catch {
    // A browser that keeps nothing keeps no copy either, so the path page
    // finds the path not started and records the event in the ordinary way.
  }
}

/**
 * True once, on the path page, when a public page's answers began this copy:
 * the caller then records `path_started`. The mark is removed, so it is true
 * for one answer only.
 */
export function takeOwedStartEvent(cert: string): boolean {
  if (settled.has(cert)) return false;
  settled.add(cert);
  try {
    if (window.localStorage.getItem(key(cert)) === null) return false;
    window.localStorage.removeItem(key(cert));
    return true;
  } catch {
    return false;
  }
}
