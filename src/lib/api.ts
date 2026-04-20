/**
 * Thin JSON fetch wrapper for client components.
 *
 * Every endpoint in this app returns JSON with one of two shapes:
 *   - Success: any payload
 *   - Error:   { error: string }
 *
 * This wrapper centralises:
 *   - JSON request/response handling
 *   - Credential forwarding (Supabase session cookies)
 *   - Consistent error messages so useMutation/useQuery get a real Error
 *
 * For non-JSON responses (e.g. the streaming generate endpoint), use
 * `fetch()` directly — this wrapper would be a bad fit.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  /** Query-string params. Values are coerced to strings; undefined keys are dropped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body for POST/PATCH/PUT. Serialised via JSON.stringify. */
  body?: unknown;
  /** AbortSignal for request cancellation (React Query passes one automatically). */
  signal?: AbortSignal;
  /** Extra headers (content-type is injected for bodied requests). */
  headers?: HeadersInit;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const url = buildUrl(path, opts.params);
  const hasBody = opts.body !== undefined;

  const res = await fetch(url, {
    method,
    credentials: "include",
    signal: opts.signal,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
    },
    body: hasBody ? JSON.stringify(opts.body) : undefined,
  });

  // 204 No Content and similar — return undefined but typed as T for caller ergonomics.
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Non-JSON body — fall through to error path if status is bad, else return as string.
      if (res.ok) return text as unknown as T;
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : undefined) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, opts?: RequestOptions) =>
    request<T>("POST", path, opts),
  patch: <T>(path: string, opts?: RequestOptions) =>
    request<T>("PATCH", path, opts),
  put: <T>(path: string, opts?: RequestOptions) =>
    request<T>("PUT", path, opts),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, opts),
};
