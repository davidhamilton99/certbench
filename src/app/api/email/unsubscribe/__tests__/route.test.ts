import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
}));

const createAdminClient = vi.hoisted(() => vi.fn(() => ({ admin: true })));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient }));

// The real helpers (the token's shape, the scope, the page's path) with the one
// function that writes replaced, so each test can see whether it was called.
const unsubscribe = vi.hoisted(() => vi.fn());
vi.mock("@/server/email/unsubscribe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/email/unsubscribe")>()),
  unsubscribe,
}));

import { GET, POST } from "../route";

const TOKEN = "3f2b8c1e-7a4d-4e9b-9c55-0d1e2f3a4b5c";
const API = "https://certbench.dev/api/email/unsubscribe";

const get = (query: string) => GET(new NextRequest(`${API}${query}`));

/** A POST as a mail client's own "Unsubscribe" button sends it (RFC 8058). */
const oneClick = (query: string) =>
  POST(
    new NextRequest(`${API}${query}`, {
      method: "POST",
      body: "List-Unsubscribe=One-Click",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
  );

/** A POST as the button on the page at /unsubscribe sends it. */
const fromPage = (query: string) =>
  POST(
    new NextRequest(`${API}${query}`, {
      method: "POST",
      body: "from=page",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
  );

beforeEach(() => {
  createAdminClient.mockClear();
  unsubscribe.mockReset();
  unsubscribe.mockResolvedValue("done");
});

describe("GET /api/email/unsubscribe (the link in an email)", () => {
  // Mail scanners and link previews open every link in a message. Before this,
  // opening the link was the unsubscribe.
  it("changes nothing and leads to the page that asks first", async () => {
    const res = await get(`?token=${TOKEN}`);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://certbench.dev/unsubscribe?token=${TOKEN}`);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("keeps the scope of a study plan or daily reminder link", async () => {
    for (const scope of ["lead", "daily"]) {
      const res = await get(`?token=${TOKEN}&scope=${scope}`);
      expect(res.headers.get("location")).toBe(`https://certbench.dev/unsubscribe?token=${TOKEN}&scope=${scope}`);
    }
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("drops a token that is not in the right shape, so the page says the link is not valid", async () => {
    for (const query of ["", "?token=abc", `?token=${TOKEN}%27%3B--`]) {
      const res = await get(query);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://certbench.dev/unsubscribe");
    }
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

describe("POST /api/email/unsubscribe", () => {
  it("unsubscribes on a mail client's one-click request, and answers in JSON", async () => {
    const res = await oneClick(`?token=${TOKEN}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(unsubscribe).toHaveBeenCalledExactlyOnceWith({ admin: true }, TOKEN, null);
  });

  it("unsubscribes when a mail client sends no body it can read", async () => {
    const res = await POST(new NextRequest(`${API}?token=${TOKEN}&scope=lead`, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(unsubscribe).toHaveBeenCalledExactlyOnceWith({ admin: true }, TOKEN, "lead");
  });

  it("answers the page's button with the page again, saying it is done, without the token", async () => {
    const res = await fromPage(`?token=${TOKEN}&scope=lead`);
    // 303: the browser fetches the result with a GET, so a reload does not send the form again.
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://certbench.dev/unsubscribe?status=done&scope=lead");
    expect(unsubscribe).toHaveBeenCalledExactlyOnceWith({ admin: true }, TOKEN, "lead");
  });

  it("turns away a token in the wrong shape without touching the database", async () => {
    const res = await oneClick("?token=not-a-token");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "validation_failed", message: "This unsubscribe link is not valid." },
    });
    const page = await fromPage("?token=not-a-token");
    expect(page.headers.get("location")).toBe("https://certbench.dev/unsubscribe?status=invalid");
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("says so when no row holds the token", async () => {
    unsubscribe.mockResolvedValue("invalid");
    const res = await oneClick(`?token=${TOKEN}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "This unsubscribe link is not valid." } });
    const page = await fromPage(`?token=${TOKEN}`);
    expect(page.headers.get("location")).toBe("https://certbench.dev/unsubscribe?status=invalid");
  });

  it("answers 500 when the change could not be saved, and sends the page's visitor back with the token to try again", async () => {
    unsubscribe.mockResolvedValue("failed");
    const res = await oneClick(`?token=${TOKEN}`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "internal", message: "You could not be unsubscribed. Please try again." },
    });
    const page = await fromPage(`?token=${TOKEN}`);
    expect(page.status).toBe(303);
    expect(page.headers.get("location")).toBe(`https://certbench.dev/unsubscribe?status=failed&token=${TOKEN}`);
  });

  it("treats a fault while unsubscribing as a failure, not as a crash", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    unsubscribe.mockRejectedValue(new Error("Missing required environment variable SUPABASE_SERVICE_ROLE_KEY"));
    const res = await oneClick(`?token=${TOKEN}`);
    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith("unsubscribe failed:", expect.any(Error));
    consoleError.mockRestore();
  });
});
