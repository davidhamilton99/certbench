// @vitest-environment jsdom
//
// The test of src/app/not-found.tsx. It is kept in this folder because
// src/app/__tests__ was another writer's while this was written: it can be
// moved there without a change.
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import NotFound, { metadata } from "../../not-found";

const doc = new DOMParser().parseFromString(renderToString(<NotFound />), "text/html");

describe("the page for an address that leads nowhere", () => {
  it("is titled as what it is, and names no canonical address", () => {
    // Without these it took the home page's title and the internal address /_not-found.
    expect(metadata.title).toBe("Page not found");
    expect(metadata.alternates).toEqual({ canonical: null });
  });

  it("has the wordmark in a header and one main region that the skip link can move to", () => {
    expect(doc.querySelector("header a")?.getAttribute("aria-label")).toBe("CertBench home");
    const mains = doc.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe("main-content");
    expect(mains[0].getAttribute("tabindex")).toBe("-1");
  });

  it("says what happened in one title, and offers two ways on", () => {
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe("This page could not be found.");
    const links = [...doc.querySelectorAll("main a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(links).toEqual([
      ["Choose your exam", "/start"],
      ["Return to the home page", "/"],
    ]);
  });

  it("stays plain markup, because it is sent with every page of the site", () => {
    // No navigation, no footer, and no icon: an arrow here would bring a script with it.
    expect(doc.querySelector("nav")).toBeNull();
    expect(doc.querySelector("footer")).toBeNull();
    expect(doc.querySelector("main svg")).toBeNull();
  });
});
