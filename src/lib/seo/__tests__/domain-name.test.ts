import { describe, expect, it } from "vitest";
import { domainName } from "../objective-meta";

/**
 * Every domain of the five exams that have a study path, as the database names
 * it (the seeds in supabase/migrations: 002 for SY0-701, N10-009 and A+ Core 1,
 * whose names 029 kept when it moved Core 1 to 220-1201; 011 for A+ Core 2,
 * kept the same way for 220-1202; 030 for SY0-801), beside the name the site
 * prints. The words are CompTIA's, as its five exam pages gave them on
 * November 22, 2026 (see src/data/pbq/__tests__/domain-titles.test.ts), set in
 * sentence case as every heading on the site is.
 */
const DOMAINS: Record<string, [stored: string, printed: string][]> = {
  "security-plus-sy0-701": [
    ["General Security Concepts", "General security concepts"],
    ["Threats, Vulnerabilities, and Mitigations", "Threats, vulnerabilities, and mitigations"],
    ["Security Architecture", "Security architecture"],
    ["Security Operations", "Security operations"],
    ["Security Program Management and Oversight", "Security program management and oversight"],
  ],
  "security-plus-sy0-801": [
    ["General Security Concepts", "General security concepts"],
    ["Threats, Vulnerabilities, and Attacks", "Threats, vulnerabilities, and attacks"],
    ["Security Architecture", "Security architecture"],
    ["Security Operations", "Security operations"],
    ["Security Program Management and Oversight", "Security program management and oversight"],
  ],
  "network-plus-n10-009": [
    ["Networking Concepts", "Networking concepts"],
    ["Network Implementation", "Network implementation"],
    ["Network Operations", "Network operations"],
    ["Network Security", "Network security"],
    ["Network Troubleshooting", "Network troubleshooting"],
  ],
  "a-plus-core1-220-1201": [
    ["Mobile Devices", "Mobile devices"],
    ["Networking", "Networking"],
    ["Hardware", "Hardware"],
    ["Virtualization and Cloud Computing", "Virtualization and cloud computing"],
    ["Hardware and Network Troubleshooting", "Hardware and network troubleshooting"],
  ],
  "a-plus-core2-220-1202": [
    ["Operating Systems", "Operating systems"],
    ["Security", "Security"],
    ["Software Troubleshooting", "Software troubleshooting"],
    ["Operational Procedures", "Operational procedures"],
  ],
};

describe("a domain's name on the study path and the public pages", () => {
  it.each(Object.keys(DOMAINS))("is CompTIA's words in sentence case for every domain of %s", (cert) => {
    for (const [stored, printed] of DOMAINS[cert]) {
      expect(domainName(stored), cert).toBe(printed);
      // The same words as stored: only the case of a letter changes.
      expect(domainName(stored).toLowerCase()).toBe(stored.toLowerCase());
    }
  });

  it("is left as it is when it is in sentence case already", () => {
    for (const printed of Object.values(DOMAINS).flat().map(([, p]) => p)) {
      expect(domainName(printed)).toBe(printed);
    }
  });

  // No domain of the five exams holds one today, but an abbreviation or a
  // product's name in a domain is written with its capitals in any sentence.
  it("keeps the capitals of an abbreviation and of a product's name, wherever it stands", () => {
    expect(domainName("Supporting IT Operations")).toBe("Supporting IT operations");
    expect(domainName("Mobile OS Support")).toBe("Mobile OS support");
    expect(domainName("Supporting Windows, Linux and macOS Clients")).toBe("Supporting Windows, Linux and macOS clients");
    expect(domainName("Wireless Networks, Wi-Fi and Bluetooth")).toBe("Wireless networks, Wi-Fi and Bluetooth");
    expect(domainName("Securing IoT Devices")).toBe("Securing IoT devices");
  });
});
