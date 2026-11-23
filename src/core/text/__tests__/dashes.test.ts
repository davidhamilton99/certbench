import { describe, expect, it } from "vitest";
import { plainDashes } from "../dashes";

const D = "\u2014";
const N = "\u2013";

describe("plainDashes", () => {
  it("returns text without a dash unchanged", () => {
    const text = "Which port does SSH use? Ports 1024-49151 are registered.";
    expect(plainDashes(text)).toBe(text);
    expect(plainDashes("")).toBe("");
  });

  it("turns a pair around a short aside into commas", () => {
    expect(
      plainDashes(`A program focused on improving detection ${D} without conducting attacks ${D} is BEST described as:`)
    ).toBe("A program focused on improving detection, without conducting attacks, is BEST described as:");
    expect(plainDashes(`Quarantine the infected system${D}typically by disconnecting it${D}to prevent spread.`)).toBe(
      "Quarantine the infected system, typically by disconnecting it, to prevent spread."
    );
  });

  it("uses parentheses when the aside has commas of its own", () => {
    expect(
      plainDashes(`It checks device health attributes ${D} antivirus currency, patch status ${D} and grants access.`)
    ).toBe("It checks device health attributes (antivirus currency, patch status) and grants access.");
  });

  it("drops the closing comma when the aside ends the sentence", () => {
    expect(plainDashes(`It handles repetitive tasks ${D} triage and enrichment ${D}. The team keeps up.`)).toBe(
      "It handles repetitive tasks, triage and enrichment. The team keeps up."
    );
  });

  it("joins words that lean on what came before with a comma", () => {
    expect(plainDashes(`It reduces interception risk ${D} often the most feasible control.`)).toBe(
      "It reduces interception risk, often the most feasible control."
    );
    expect(plainDashes(`Only the minimum permissions necessary ${D} nothing more.`)).toBe(
      "Only the minimum permissions necessary, nothing more."
    );
    expect(plainDashes(`Federated authentication ${D} verifying user identity via an external provider`)).toBe(
      "Federated authentication, verifying user identity via an external provider"
    );
  });

  it("joins an explanation or a list with a colon", () => {
    expect(plainDashes(`Two devices are assigned 192.168.1.50 ${D} one by DHCP and one statically.`)).toBe(
      "Two devices are assigned 192.168.1.50: one by DHCP and one statically."
    );
    expect(plainDashes(`SQL injection ${D} the unsanitized input is passed to the query`)).toBe(
      "SQL injection: the unsanitized input is passed to the query"
    );
    expect(plainDashes(`Ransomware demands cryptocurrency${D}it does not display fake phone numbers.`)).toBe(
      "Ransomware demands cryptocurrency: it does not display fake phone numbers."
    );
  });

  it("uses a colon where a leaning word opens a clause of its own", () => {
    expect(plainDashes(`Its job is to isolate a single sheet ${D} when worn, it lets two sheets through.`)).toBe(
      "Its job is to isolate a single sheet: when worn, it lets two sheets through."
    );
    expect(plainDashes(`The key is rotated ${D} because it was exposed.`)).toBe(
      "The key is rotated, because it was exposed."
    );
  });

  it("reads dashes in a list of terms and meanings as colons, not as a pair", () => {
    expect(
      plainDashes(`Plans require accountability ${D} a named owner; tracking ${D} regular checkpoints; and triggers.`)
    ).toBe("Plans require accountability: a named owner; tracking: regular checkpoints; and triggers.");
  });

  it("treats a spaced en dash the same way, and keeps a range", () => {
    expect(plainDashes(`Port 443 ${N} HTTPS`)).toBe("Port 443: HTTPS");
    expect(plainDashes(`Ports 1024${N}49151 are registered.`)).toBe(`Ports 1024${N}49151 are registered.`);
    expect(plainDashes(`Between 10 ${D} 20 hosts`)).toBe("Between 10 to 20 hosts");
    expect(plainDashes(`1 TB ${D} 20 TB`)).toBe("1 TB to 20 TB");
    // A number inside a name does not start a range.
    expect(plainDashes(`MD5 ${D} 128-bit hash`)).toBe("MD5: 128-bit hash");
    expect(plainDashes(`SHA-256 ${D} 256-bit digest`)).toBe("SHA-256: 256-bit digest");
  });

  it("does not pair dashes that sit in different sentences", () => {
    expect(plainDashes(`It is wrong ${D} it encrypts nothing. The second is right ${D} it signs the hash.`)).toBe(
      "It is wrong: it encrypts nothing. The second is right: it signs the hash."
    );
  });

  it("leaves a dash that is a whole value, and drops one that opens or closes a line", () => {
    expect(plainDashes(D)).toBe(D);
    expect(plainDashes(`${D} Grace Hopper`)).toBe("Grace Hopper");
    expect(plainDashes(`First line\n${D} second line`)).toBe("First line\nsecond line");
    expect(plainDashes(`Trailing ${D}`)).toBe("Trailing");
  });

  it("adds nothing after punctuation that already joins", () => {
    expect(plainDashes(`Three tiers: ${D} web, app and data`)).toBe("Three tiers: web, app and data");
  });

  it("leaves no dash between words in any of these", () => {
    const samples = [
      `A user reports horizontal banding ${D} alternating light and dark stripes across the page. What is the MOST likely cause?`,
      `Each business function ${D} authentication, payment processing, fraud detection ${D} runs as its own service.`,
      `The error reads: "Your connection is not private ${D} NET::ERR_CERT_DATE_INVALID." What type of error is this?`,
      `One ${D} two ${D} three ${D} four.`,
    ];
    for (const s of samples) expect(plainDashes(s)).not.toMatch(/[\u2014\u2015]|\s\u2013\s/);
  });
});
