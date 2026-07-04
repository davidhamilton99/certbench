import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import {
  ApiError,
  type ApiErrorEnvelope,
  type EndpointContract,
} from "@/contracts/common";
import { getOptionalUser, requireAdmin, requirePro, requireUser } from "@/server/auth";
import { rateLimiter, type RateLimitOptions } from "@/server/rate-limit";
import type { Db } from "@/server/supabase/server";

type AuthLevel = "public" | "user" | "pro" | "admin";

interface HandlerContext<I> {
  input: I;
  /** Non-null unless auth: "public". */
  user: User | null;
  /** RLS-scoped Supabase client bound to the requester's session. */
  db: Db;
  request: NextRequest;
}

interface EndpointOptions<C extends EndpointContract> {
  auth: AuthLevel;
  rateLimit?: RateLimitOptions;
  handler: (
    ctx: HandlerContext<z.output<C["input"]>>
  ) => Promise<z.input<C["output"]>>;
}

function errorResponse(error: ApiError): NextResponse<ApiErrorEnvelope> {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status }
  );
}

/**
 * The one route-handler factory. Pipeline, in order:
 *   auth gate -> rate limit -> input parse -> handler -> output check (dev) -> JSON
 *
 * Every API route exports `GET/POST/... = defineEndpoint(contract, options)`.
 * Errors are always the uniform `{ error: { code, message } }` envelope.
 */
export function defineEndpoint<C extends EndpointContract>(
  contract: C,
  options: EndpointOptions<C>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Auth
      let user: User | null = null;
      let db: Db;
      if (options.auth === "public") {
        ({ db, user } = await getOptionalUser());
      } else if (options.auth === "admin") {
        ({ db, user } = await requireAdmin());
      } else if (options.auth === "pro") {
        ({ db, user } = await requirePro());
      } else {
        ({ db, user } = await requireUser());
      }

      // 2. Rate limit (keyed per user when available, else per IP)
      if (options.rateLimit) {
        const subject =
          user?.id ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "anonymous";
        const allowed = await rateLimiter.check(
          `${contract.path}:${subject}`,
          options.rateLimit
        );
        if (!allowed) throw new ApiError("rate_limited");
      }

      // 3. Input
      const raw =
        contract.method === "GET"
          ? Object.fromEntries(request.nextUrl.searchParams)
          : await request.json().catch(() => ({}));
      const parsed = contract.input.safeParse(raw);
      if (!parsed.success) {
        throw new ApiError(
          "validation_failed",
          z.prettifyError(parsed.error)
        );
      }

      // 4. Handle
      const result = await options.handler({
        // safeParse on a generic ZodType loses the inferred type — safe cast.
        input: parsed.data as z.output<C["input"]>,
        user,
        db,
        request,
      });

      // 5. Output contract check — dev only, catches schema drift early
      if (process.env.NODE_ENV !== "production") {
        const out = contract.output.safeParse(result);
        if (!out.success) {
          console.error(
            `[contract drift] ${contract.method} ${contract.path}:`,
            z.prettifyError(out.error)
          );
        }
      }

      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err);
      console.error(`[${contract.method} ${contract.path}]`, err);
      const { captureException } = await import("@sentry/nextjs");
      captureException(err);
      return errorResponse(new ApiError("internal", "Something went wrong"));
    }
  };
}
