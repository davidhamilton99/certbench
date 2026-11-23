/**
 * Leave this page for another address: the payment page, or the page where a
 * visitor signs in or creates an account before paying. It is a module of its
 * own so that a test can see where a press leads.
 */
export function leaveFor(url: string): void {
  window.location.assign(url);
}
