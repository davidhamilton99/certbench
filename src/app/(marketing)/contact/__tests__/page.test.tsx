// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import ContactPage, { metadata } from "../page";

const doc = new DOMParser().parseFromString(renderToString(<ContactPage />), "text/html");

describe("the contact page", () => {
  it("has one title, and each subject as a heading under it", () => {
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe("Contact CertBench");
    expect([...doc.querySelectorAll("h2")].map((h) => h.textContent)).toEqual([
      "Email",
      "Response time",
      "Reporting a problem",
      "Reporting an incorrect question",
      "Colleges and training providers",
    ]);
  });

  it("gives the address to write to as a link that opens an email", () => {
    const address = doc.querySelector('a[href="mailto:support@certbench.dev"]');
    expect(address?.textContent).toBe("support@certbench.dev");
  });

  it("underlines every link, because each one stands inside a sentence", () => {
    const links = [...doc.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["mailto:support@certbench.dev", "/educators", "/help"]);
    expect(links.filter((a) => !a.classList.contains("cb-link"))).toEqual([]);
  });

  it("keeps running text to its measure", () => {
    const paragraphs = [...doc.querySelectorAll("section p, section li")];
    expect(paragraphs.length).toBeGreaterThan(5);
    expect(paragraphs.filter((p) => !p.closest(".cb-measure"))).toEqual([]);
  });

  it("draws its content only: the public frame supplies the header, the main region and the footer", () => {
    expect(doc.querySelector("main")).toBeNull();
    expect(doc.querySelector("footer")).toBeNull();
    expect(doc.querySelector("nav")).toBeNull();
  });

  it("has its own address as the canonical one", () => {
    expect(metadata.alternates).toEqual({ canonical: "/contact" });
  });
});
