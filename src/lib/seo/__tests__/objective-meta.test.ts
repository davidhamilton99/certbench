import { describe, expect, it } from "vitest";
import { EXAM_CODES } from "@/core/path/versions";
import type { PathCert } from "@/core/path/types";
import { EXAM_NAMES, OBJECTIVE_TITLES } from "@/data/path/titles";
import { domainName, objectivePageDescription, objectivePageTitle, TITLE_TAG_MAX, topicInSentence } from "../objective-meta";

const security = {
  certSlug: "security-plus-sy0-701",
  shortCertName: "Security+",
  examCode: "SY0-701",
  code: "1.2",
  title: "Summarize fundamental security concepts",
  topic: "Core security concepts",
};
const network = {
  certSlug: "network-plus-n10-009",
  shortCertName: "Network+",
  examCode: "N10-009",
  code: "1.4",
  title: "Given a scenario, configure a subnet and use appropriate IP addressing schemes",
  topic: "IP addressing and subnets",
};
const aPlus = {
  certSlug: "a-plus-core1-220-1201",
  shortCertName: "A+ Core 1",
  examCode: "220-1201",
  code: "3.1",
  title: "Display components and attributes",
  topic: "Displays",
};

/** Every topic page that the copy can build, from the short names the pages use. */
const EVERY_TOPIC = Object.entries(OBJECTIVE_TITLES).flatMap(([certSlug, titles]) =>
  Object.entries(titles).map(([code, topic]) => ({
    certSlug,
    shortCertName: EXAM_NAMES[certSlug],
    examCode: EXAM_CODES[certSlug as PathCert],
    code,
    title: topic,
    topic,
  }))
);

describe("objective page titles", () => {
  it("are in sentence case: the topic keeps its own capitals and nothing else is raised", () => {
    const title = (topic: string) => objectivePageTitle({ ...security, topic });
    expect(title("Signs of an attack")).toBe("Signs of an attack: SY0-701 1.2 practice questions");
    expect(title("macOS")).toBe("macOS: SY0-701 1.2 practice questions | CertBench");
  });

  it("open with a capital for every objective's short name", () => {
    for (const titles of Object.values(OBJECTIVE_TITLES)) {
      for (const topic of Object.values(titles)) {
        // "macOS" is the one name that starts lowercase.
        if (topic !== "macOS") expect(topic[0], topic).toBe(topic[0].toUpperCase());
      }
    }
  });

  // A search result shows about 60 characters of a title. The template once ran
  // to 86 ("Motherboard, RAM, CPU and power problems practice questions
  // (220-1201 5.1) | CertBench"), and 95 objective pages were cut short.
  it(`are never longer than ${TITLE_TAG_MAX} characters, for every topic of every exam`, () => {
    expect(EVERY_TOPIC.length).toBeGreaterThan(140);
    const long = EVERY_TOPIC.map(objectivePageTitle).filter((title) => title.length > TITLE_TAG_MAX);
    expect(long).toEqual([]);
  });

  it("leave off the brand before the words that are searched, and those words only for a very long topic", () => {
    const titles = EVERY_TOPIC.map(objectivePageTitle);
    // Most keep "practice questions"; only a topic too long to fit beside them loses them.
    expect(titles.filter((t) => t.includes("practice questions")).length).toBeGreaterThan(130);
    expect(objectivePageTitle({ ...aPlus, code: "5.1", topic: "Motherboard, RAM, CPU and power problems" })).toBe(
      "Motherboard, RAM, CPU and power problems (220-1201 5.1)"
    );
    // A short topic keeps the brand as well.
    expect(objectivePageTitle(aPlus)).toBe("Displays: 220-1201 3.1 practice questions | CertBench");
  });

  it("lead with the topic and cite Security+ objective numbers, which are CompTIA's", () => {
    expect(objectivePageTitle(security)).toBe("Core security concepts: SY0-701 1.2 practice questions");
    expect(objectivePageDescription(security)).toBe(
      "CertBench offers free practice questions for Security+ (SY0-701) objective 1.2: Core security concepts. Each question is original and fully explained."
    );
  });

  it("never cite a Network+ number, because ours do not follow N10-009's", () => {
    expect(objectivePageTitle(network)).toBe("IP addressing and subnets: Network+ practice questions");
    expect(objectivePageTitle({ ...network, topic: "The OSI model" })).toBe("The OSI model: Network+ N10-009 practice questions");
    expect(objectivePageDescription(network)).not.toMatch(/objective|1\.4|Given a scenario/);
    expect(objectivePageDescription(network)).toBe(
      "CertBench offers free Network+ (N10-009) practice questions on IP addressing and subnets. Each question is original and fully explained."
    );
  });

  it("cite A+ objective numbers now that they are 220-1201's", () => {
    expect(objectivePageDescription(aPlus)).toBe(
      "CertBench offers free practice questions for A+ Core 1 (220-1201) objective 3.1: Displays. Each question is original and fully explained."
    );
  });
});

describe("objective page descriptions", () => {
  // Search and AI answers quote a description as it stands, so each is written in sentences.
  it("are complete sentences that say who offers what, for every topic of every exam", () => {
    for (const page of EVERY_TOPIC) {
      const description = objectivePageDescription(page);
      expect(description, page.certSlug).toMatch(/^CertBench offers free .*\. Each question is original and fully explained\.$/);
      expect(description, page.certSlug).not.toMatch(/Original, exam-style|Most topics carry over/);
    }
  });
});

describe("a domain's name", () => {
  // The database keeps CompTIA's capitals and the copy tables write sentence
  // case, so the pages set every domain's name in sentence case (the facts
  // file has these names, some of them as CompTIA capitalizes them).
  it("is set in sentence case, as every heading on the site is", () => {
    expect(
      [
        "General Security Concepts",
        "Threats, Vulnerabilities, and Mitigations",
        "Security Program Management and Oversight",
        "Networking Concepts",
        "Virtualization and Cloud Computing",
        "Hardware and Network Troubleshooting",
        "Operational Procedures",
      ].map(domainName)
    ).toEqual([
      "General security concepts",
      "Threats, vulnerabilities, and mitigations",
      "Security program management and oversight",
      "Networking concepts",
      "Virtualization and cloud computing",
      "Hardware and network troubleshooting",
      "Operational procedures",
    ]);
  });

  it("is left as it is when it is in sentence case already, and keeps an abbreviation", () => {
    expect(domainName("Networking concepts")).toBe("Networking concepts");
    expect(domainName("Security")).toBe("Security");
    expect(domainName("Mobile OS Support")).toBe("Mobile OS support");
  });
});

describe("a Network+ topic in the middle of a sentence", () => {
  // The Network+ topics are CertBench's own, and each opens with a common word,
  // so a sentence lowers its first letter. A new or renamed topic fails here
  // until someone has read how it reads in a sentence.
  it("reads as a phrase, with every abbreviation kept", () => {
    const inSentence = Object.fromEntries(
      Object.entries(OBJECTIVE_TITLES["network-plus-n10-009"]).map(([code, topic]) => [code, topicInSentence(topic)])
    );
    expect(inSentence).toEqual({
      "1.1": "the OSI model",
      "1.2": "network appliances",
      "1.3": "cables and connectors",
      "1.4": "IP addressing and subnets",
      "1.5": "ports and protocols",
      "1.6": "network tools and commands",
      "1.7": "datacenter architecture",
      "1.8": "cloud concepts",
      "2.1": "topologies and network types",
      "2.2": "routing and bandwidth",
      "2.3": "switching features",
      "2.4": "wireless standards",
      "3.1": "monitoring and availability",
      "3.2": "documentation and policies",
      "3.3": "network services",
      "3.4": "high availability and DR",
      "3.5": "discovery and management",
      "4.1": "security concepts",
      "4.2": "types of attacks",
      "4.3": "network hardening",
      "4.4": "remote access",
      "4.5": "physical security",
      "5.1": "troubleshooting method",
      "5.2": "cable problems",
      "5.3": "wireless problems",
      "5.4": "general network problems",
      "5.5": "network service problems",
    });
  });
});
