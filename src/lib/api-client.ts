import type { ContractInput, ContractOutput, EndpointContract } from "@/contracts/common";
import { API_ERROR_CODES, ApiError, type ApiErrorCode } from "@/contracts/errors";
import { isLazyContract, type LazyContract } from "@/contracts/lazy";
import { CONNECTION_LOST, REQUEST_TIMED_OUT } from "@/lib/errors/user-message";

/** How long a request may take before the caller is told it took too long. */
export const API_TIMEOUT_MS = 15_000;

/**
 * Typed API client for client components. The contract carries the path, the
 * method and the schemas, so the return type is inferred and the response is
 * validated at run time, with no manual casting anywhere.
 *
 *   const result = await api(contracts.submitDiagnostic, { attemptId, responses });
 *
 * Give it a `LazyContract` (src/contracts/lazy.ts) from a page that must not
 * carry the schema library in its first load: the request starts at once and
 * the schemas are fetched beside it. This module itself imports no schemas.
 *
 * It always throws an ApiError. Show it with `userMessage(err)` from
 * `@/lib/errors/user-message`, never with `err.message`.
 */
export async function api<C extends EndpointContract>(
  contract: C | LazyContract<C>,
  input: ContractInput<C>,
  options: {
    timeoutMs?: number;
    /**
     * Let the request outlive the page: for a last save as a tab is hidden or
     * closed. The browser allows it only for a small body (under 64 KB).
     */
    keepalive?: boolean;
  } = {}
): Promise<ContractOutput<C>> {
  const isGet = contract.method === "GET";
  const url = isGet
    ? `${contract.path}?${new URLSearchParams(input as Record<string, string>)}`
    : contract.path;

  // The schemas travel beside the request, not in front of it.
  const schemas: Promise<C> = isLazyContract(contract) ? contract.load() : Promise.resolve(contract as C);
  // A failed load is reported where it is awaited, below.
  schemas.catch(() => {});

  let response: Response;
  try {
    response = await fetch(url, {
      method: contract.method,
      credentials: "same-origin",
      headers: isGet ? undefined : { "Content-Type": "application/json" },
      body: isGet ? undefined : JSON.stringify(input),
      signal: timeoutSignal(options.timeoutMs ?? API_TIMEOUT_MS),
      keepalive: options.keepalive,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    throw new ApiError("internal", name === "TimeoutError" || name === "AbortError" ? REQUEST_TIMED_OUT : CONNECTION_LOST);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = readErrorEnvelope(body);
    if (error) throw new ApiError(error.code, error.message);
    throw new ApiError("internal", `Request failed (${response.status})`);
  }

  let full: C;
  try {
    full = await schemas;
  } catch {
    // The request was answered, but the part of the page that checks the
    // answer could not be fetched: the connection went in between.
    throw new ApiError("internal", CONNECTION_LOST);
  }
  // parse() on a generic ZodType loses the inferred output type, so this cast is safe.
  return full.output.parse(body) as ContractOutput<C>;
}

/**
 * The API's error envelope, `{ error: { code, message } }`, read by hand so
 * that this module needs no schema library. Anything else is not an envelope.
 */
function readErrorEnvelope(body: unknown): { code: ApiErrorCode; message: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code !== "string" || typeof message !== "string") return null;
  if (!(API_ERROR_CODES as readonly string[]).includes(code)) return null;
  return { code: code as ApiErrorCode, message };
}

/** A signal that aborts after `ms`, where the browser can make one. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}
