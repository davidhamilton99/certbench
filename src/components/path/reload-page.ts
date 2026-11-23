/**
 * Load the page again, as the browser's own reload button does: the one thing
 * that puts right a page that is out of date. It is a module of its own so
 * that a test can see that a press leads here.
 */
export function reloadPage(): void {
  window.location.reload();
}
