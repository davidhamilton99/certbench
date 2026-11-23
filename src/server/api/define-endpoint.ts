import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import {
  ApiError,
  type ApiErrorEnvelope,
  type EndpointContract,
} from "@/contracts/common";
import { isSentence } from "@/lib/errors/user-message";
import { afterResponse } from "@/server/api/after-response";
import { reportServerError } from "@/server/api/report-error";
import { getOptionalUser, requireAdmin, requirePro, requireUser } from "@/server/auth";
import { rateLimiter, type RateLimitOptions } from "@/server/rate-limit";
import type { Db } from "@/server/supabase/server";

type AuthLevel = "public" | "user" | "pro" | "admin";

interface HandlerContext<I> {
  input: I;
  /** Non-null unless auth: "public". */
  user: User | null;
  /**
   * False only on a public endpoint, when the session could not be checked
   * (the sign-in service did not answer). `user` is then null without meaning
   * that nobody is signed in: a handler that would refuse a visitor must
   * answer "the account could not be checked" instead (accountNotChecked).
   */
  sessionChecked: boolean;
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

/** What a caller is told when the fault's own words are not for them. */
const INTERNAL_ERROR = "The request could not be completed. Please try again.";

/** Marks of a database's or a network layer's own text: names in quotes or with underscores, and its usual words. */
const NOT_FOR_PEOPLE =
  /["`_<>{}=]|\b(?:relation|constraint|violates|column|schema|syntax|row-level|statement|json|sql|fetch|econn\w*|timeout|aborted|undefined|null)\b/i;

/**
 * Whether an internal error's message was written for the person who made the
 * request: a sentence that begins with a capital and holds none of those marks.
 */
function writtenForPeople(message: string): boolean {
  return isSentence(message) && /^[A-Z]/.test(message.trim()) && !NOT_FOR_PEOPLE.test(message);
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
 *
 * A fault on our side (an unexpected error, or an ApiError with the code
 * "internal") is written to the log and reported to the owner once the
 * response has gone. A refusal (not signed in, not allowed, bad input, too
 * many requests) is an answer, not a fault, and is not reported.
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
      let sessionChecked = true;
      if (options.auth === "public") {
        const session = await getOptionalUser();
        ({ db, user } = session);
        sessionChecked = session.checked !== false;
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
        sessionChecked,
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
      if (err instanceof ApiError && err.code !== "internal") return errorResponse(err);
      console.error(`[${contract.method} ${contract.path}]`, err);
      const place = { route: contract.path, path: contract.path, method: contract.method, kind: "route" };
      afterResponse(() => reportServerError(err, place));
      // An internal error keeps its message only when the message is a sentence
      // written for the member (the account checks throw one: "Your account
      // could not be checked. Please try again."). Many data functions throw
      // the database's or the network layer's own text instead, which names
      // tables, columns and policies and never ends as a sentence does. That
      // text is in the log above; it does not go to the caller.
      return errorResponse(
        err instanceof ApiError && writtenForPeople(err.message) ? err : new ApiError("internal", INTERNAL_ERROR)
      );
    }
  };
}
