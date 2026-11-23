/**
 * The API's error codes and the error class that carries one. Kept apart from
 * the schemas in ./common so that a client component can catch and read an
 * ApiError without loading the schema library.
 */

/** Error codes the API can return; mapped to HTTP status in the factory. */
export const API_ERROR_CODES = [
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "quota_exceeded",
  "validation_failed",
  "conflict",
  "internal",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  quota_exceeded: 402,
  validation_failed: 400,
  conflict: 409,
  internal: 500,
};

/** Throwable, code-carrying error. Thrown by services/repos, serialized by the factory. */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }

  get status(): number {
    return HTTP_STATUS_BY_CODE[this.code];
  }
}
