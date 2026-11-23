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
 * first answer there, and removes the mark. The event keeps its meaning. The
 * public pages that leave it are the home page's sample questions and the
 * quick rounds of the practice-test and objective pages.
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

/**
 * Whether the path page of an exam still owes its `path_started`, read without
 * taking the mark: for a newer version of the exam, whose first visit carries
 * this copy's answers along (usePathProgress.ts).
 */
export function startEventOwed(cert: string): boolean {
  try {
    return window.localStorage.getItem(key(cert)) !== null;
  } catch {
    return false;
  }
}

/**
 * `path_account_linked` with the method "redirect" counts an account that the
 * study path's save request produced: its Google sign-in returns to the study
 * path, which then carries the visitor's work on this device into the account.
 * Work begun on a public page can be carried into an account made anywhere
 * else (the header's sign-up, the practice exam's score gate, Google from the
 * header) without the save request ever having been shown, and it must not be
 * counted as the request's.
 *
 * So a public page marks the visitor's work as begun there when its answer
 * begins it, and the study path does not record the link for work so marked.
 * Showing the save request removes the mark: from then on the request may be
 * what produced the account, and the event is recorded as before.
 */
const begunKey = (cert: string) => `cb_path_begun_public_${cert}`;

/** Called by a public page as its answer begins a signed-out visitor's work for an exam. */
export function markBegunOnPublicPage(cert: string): void {
  try {
    window.localStorage.setItem(begunKey(cert), "1");
  } catch {
    // A browser that keeps nothing keeps no work either: nothing is carried.
  }
}

/** Whether the visitor's work for an exam was begun on a public page, and no save request has been shown since. */
export function begunOnPublicPage(cert: string): boolean {
  try {
    return window.localStorage.getItem(begunKey(cert)) !== null;
  } catch {
    return false;
  }
}

/** The save request has been shown, or the work has been carried into an account. */
export function clearBegunOnPublicPage(cert: string): void {
  try {
    window.localStorage.removeItem(begunKey(cert));
  } catch {
    /* nothing was kept */
  }
}
