import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

type RouteHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse | Response>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
      }
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, err);
      Sentry.captureException(err, {
        tags: {
          route: request.nextUrl.pathname,
          method: request.method,
        },
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
