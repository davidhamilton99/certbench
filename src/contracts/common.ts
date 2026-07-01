import { z } from "zod";

/**
 * The endpoint contract — single source of truth for an API route's path,
 * method, input and output shapes. Imported by BOTH the route handler
 * (validation) and the client (`api()` in lib/api-client.ts, type inference).
 */
export interface EndpointContract<
  I extends z.ZodType = z.ZodType,
  O extends z.ZodType = z.ZodType,
> {
  /** Route path, e.g. "/api/diagnostic/start". */
  path: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  input: I;
  output: O;
}

export type ContractInput<C extends EndpointContract> = z.input<C["input"]>;
export type ContractOutput<C extends EndpointContract> = z.output<C["output"]>;

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

/** Uniform error envelope returned by every endpoint. */
export const apiErrorEnvelope = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelope>;

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

export const uuid = z.uuid;
