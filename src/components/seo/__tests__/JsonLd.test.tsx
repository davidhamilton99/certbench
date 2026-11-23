import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd, jsonForScript } from "../JsonLd";

/** The text between the script tags of what the component renders. */
function scriptBody(markup: string): string {
  const open = '<script type="application/ld+json">';
  expect(markup.startsWith(open)).toBe(true);
  expect(markup.endsWith("</script>")).toBe(true);
  return markup.slice(open.length, -"</script>".length);
}

describe("JsonLd", () => {
  it("writes the data as JSON that reads back unchanged", () => {
    const data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      name: "CompTIA Security+ (SY0-701) practice test",
      mainEntity: [{ "@type": "Question", name: "Is 5 < 7 and 7 > 5?" }],
    };
    const body = scriptBody(renderToStaticMarkup(<JsonLd data={data} />));
    expect(JSON.parse(body)).toEqual(data);
  });

  it("cannot be closed early by a value that holds a script end tag", () => {
    const hostile = {
      "@type": "Review",
      reviewBody: 'Good practice. </script><script>alert("x")</script><img src=x onerror=alert(1)>',
    };
    const markup = renderToStaticMarkup(<JsonLd data={hostile} />);
    const body = scriptBody(markup);
    // The only end tag is the element's own, and no markup opens inside the data.
    expect(markup.match(/<\/script>/g)).toHaveLength(1);
    expect(body).not.toContain("<");
    // A reader of the structured data still gets the text as it was written.
    expect(JSON.parse(body)).toEqual(hostile);
  });

  it("escapes a comment opener as well, which would otherwise change how the script is read", () => {
    const body = jsonForScript({ note: "<!-- <script>" });
    expect(body).not.toContain("<");
    expect(JSON.parse(body)).toEqual({ note: "<!-- <script>" });
  });
});
