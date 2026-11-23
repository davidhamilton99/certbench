import { z } from "zod";
import { API_ERROR_CODES } from "./errors";

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

// The codes and the error class live in ./errors, which has no schema library in it.
export { API_ERROR_CODES, ApiError, HTTP_STATUS_BY_CODE, type ApiErrorCode } from "./errors";

/** Uniform error envelope returned by every endpoint. */
export const apiErrorEnvelope = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelope>;

export const uuid = z.uuid;
