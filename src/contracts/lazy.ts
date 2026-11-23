import type { EndpointContract } from "./common";

/**
 * A contract a page can name without carrying its schemas.
 *
 * A contract object holds the schemas for an endpoint's input and output, and
 * so brings the whole schema library into any page that imports it. A page
 * that only needs to CALL the endpoint names it with this instead: the path
 * and the method are plain strings, known at once, and the schemas arrive by
 * themselves when the first request is made. `api()` starts the request
 * straight away and checks the response once the schemas are there, so
 * nothing is checked less than before; it is only loaded later.
 *
 *   // src/contracts/client/path.ts
 *   export const getPathProgress = lazyContract("/api/path/progress", "GET", () =>
 *     import("../path").then((m) => m.getPathProgress)
 *   );
 *
 * The path and method are written twice (here and in the contract), so
 * src/contracts/__tests__/lazy-contracts.test.ts holds each pair to its
 * contract.
 */
export interface LazyContract<C extends EndpointContract = EndpointContract> {
  path: string;
  method: C["method"];
  /** The full contract, with its schemas. */
  load: () => Promise<C>;
}

export function lazyContract<C extends EndpointContract>(
  path: string,
  method: C["method"],
  load: () => Promise<C>
): LazyContract<C> {
  return { path, method, load };
}

/**
 * Fetch the schemas of these endpoints now, in the background. For a page
 * that a person stays on and that will certainly call them (the study path):
 * once the schemas are in memory, a new version of the site published during
 * the visit cannot take them away. Call it when the page is idle, never
 * during its first load. A failed fetch is left for the first real call.
 */
export function warmContracts(contracts: readonly LazyContract[]): void {
  for (const contract of contracts) void contract.load().catch(() => {});
}

export function isLazyContract(value: unknown): value is LazyContract {
  return typeof value === "object" && value !== null && typeof (value as { load?: unknown }).load === "function";
}
