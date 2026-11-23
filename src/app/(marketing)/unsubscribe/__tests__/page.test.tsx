// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
}));

import Page, { generateMetadata } from "../page";

const TOKEN = "3f2b8c1e-7a4d-4e9b-9c55-0d1e2f3a4b5c";

type Query = Record<string, string | string[] | undefined>;

/** The page as the server sends it for one address. Rendering it is all a GET does. */
async function served(query: Query): Promise<Document> {
  const html = renderToString(await Page({ searchParams: Promise.resolve(query) }));
  return new DOMParser().parseFromString(html, "text/html");
}

const text = (doc: Document) => (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
const title = async (query: Query) => (await generateMetadata({ searchParams: Promise.resolve(query) })).title;

describe("the unsubscribe page", () => {
  it("says what will stop and offers one button, which sends a POST to the address in the email", async () => {
    const doc = await served({ token: TOKEN });
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe("Unsubscribe from study emails");
    expect(text(doc)).toContain(
      "If you unsubscribe, CertBench will stop sending you study emails: the reminders in the two weeks before your exam date, the reminder to continue your study path, the result of your readiness checkpoint, and the question about how your exam went."
    );
    expect(text(doc)).toContain("Emails that you request, such as a password reset, will still be sent.");
    expect(text(doc)).toContain("Nothing changes until you press the button.");

    const forms = doc.querySelectorAll("form");
    expect(forms).toHaveLength(1);
    expect(forms[0].getAttribute("method")).toBe("post");
    expect(forms[0].getAttribute("action")).toBe(`/api/email/unsubscribe?token=${TOKEN}`);
    // The handler answers this form with the page again, and a mail client with JSON.
    expect(forms[0].querySelector('input[type="hidden"][name="from"]')?.getAttribute("value")).toBe("page");
    const buttons = forms[0].querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute("type")).toBe("submit");
    expect(buttons[0].textContent).toBe("Unsubscribe");
    expect(doc.querySelector('[role="alert"]')).toBeNull();
    expect(await title({ token: TOKEN })).toBe("Unsubscribe from study emails");
  });

  it("names the one email that a study plan link stops, and keeps the scope in the form", async () => {
    const doc = await served({ token: TOKEN, scope: "lead" });
    expect(doc.querySelector("h1")?.textContent).toBe("Unsubscribe from the study plan email");
    expect(text(doc)).toContain("CertBench will not send this study plan email to your address again.");
    expect(text(doc)).not.toContain("password reset");
    expect(doc.querySelector("form")?.getAttribute("action")).toBe(`/api/email/unsubscribe?token=${TOKEN}&scope=lead`);
  });

  it("says that the other study emails continue when a link stops only the daily reminder", async () => {
    const doc = await served({ token: TOKEN, scope: "daily" });
    expect(doc.querySelector("h1")?.textContent).toBe("Unsubscribe from the daily study reminder");
    expect(text(doc)).toContain("Your other study emails, such as the reminders before your exam date, are not affected.");
    expect(doc.querySelector("form")?.getAttribute("action")).toBe(`/api/email/unsubscribe?token=${TOKEN}&scope=daily`);
  });

  it("confirms the change in the words the email promised, with nothing left to press", async () => {
    const doc = await served({ status: "done" });
    // Heading, then the sentence: "You have been unsubscribed. You will no longer receive study emails from CertBench."
    expect(doc.querySelector("h1")?.textContent).toBe("You have been unsubscribed.");
    expect(doc.querySelector("h1 ~ div p")?.textContent).toBe("You will no longer receive study emails from CertBench.");
    expect(doc.querySelector("form")).toBeNull();
    expect(doc.querySelector("a[href='/']")?.textContent).toBe("Return to the home page");
    expect(await title({ status: "done" })).toBe("You have been unsubscribed");

    const lead = await served({ status: "done", scope: "lead" });
    expect(text(lead)).toContain("You will no longer receive this study plan email from CertBench.");
  });

  it("says so, announced as an alert, when the change could not be saved, and offers the button again", async () => {
    const doc = await served({ status: "failed", token: TOKEN });
    const alert = doc.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("You could not be unsubscribed. Please try again.");
    expect(alert?.querySelector("a")?.getAttribute("href")).toBe("mailto:support@certbench.dev");
    expect(doc.querySelector("form")?.getAttribute("action")).toBe(`/api/email/unsubscribe?token=${TOKEN}`);
    // The browser tab says what happened first: it is what a screen reader announces.
    expect(await title({ status: "failed", token: TOKEN })).toBe("You could not be unsubscribed");
  });

  it.each<[string, Query]>([
    ["no token", {}],
    ["a token in the wrong shape", { token: "abc" }],
    ["a token that no row holds", { status: "invalid" }],
    ["a failed attempt without its token", { status: "failed" }],
  ])("says that the link is not valid for %s, and offers nothing to press", async (_, query) => {
    const doc = await served(query);
    expect(doc.querySelector("h1")?.textContent).toBe("This unsubscribe link is not valid.");
    expect(text(doc)).toContain("Please use the link in the most recent email that CertBench sent you.");
    expect(doc.querySelector("form")).toBeNull();
    expect(await title(query)).toBe("This unsubscribe link is not valid");
  });

  it("reads the first value when a parameter is repeated", async () => {
    const doc = await served({ token: [TOKEN, "other"], scope: ["lead", "daily"] });
    expect(doc.querySelector("form")?.getAttribute("action")).toBe(`/api/email/unsubscribe?token=${TOKEN}&scope=lead`);
  });

  it("is kept out of search, because its address carries a personal token", async () => {
    for (const query of [{ token: TOKEN }, { status: "done" }, {}]) {
      expect((await generateMetadata({ searchParams: Promise.resolve(query) })).robots).toEqual({
        index: false,
        follow: false,
      });
    }
  });

  it("draws its content only: the public frame supplies the header, the main region and the footer", async () => {
    const doc = await served({ token: TOKEN });
    expect(doc.querySelector("main")).toBeNull();
    expect(doc.querySelector("footer")).toBeNull();
    expect(doc.querySelector("nav")).toBeNull();
  });
});
