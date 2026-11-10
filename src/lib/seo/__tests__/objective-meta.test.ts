import { describe, expect, it } from "vitest";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { objectivePageDescription, objectivePageTitle, titleCase } from "../objective-meta";

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

describe("titleCase", () => {
  it("capitalizes words but leaves small words and acronyms alone", () => {
    expect(titleCase("Signs of an attack")).toBe("Signs of an Attack");
    expect(titleCase("Motherboard, RAM, CPU and power problems")).toBe(
      "Motherboard, RAM, CPU and Power Problems"
    );
    expect(titleCase("macOS")).toBe("macOS");
    expect(titleCase("IP addressing and subnets")).toBe("IP Addressing and Subnets");
  });

  it("reads cleanly for every objective's short name", () => {
    for (const titles of Object.values(OBJECTIVE_TITLES)) {
      for (const topic of Object.values(titles)) {
        const cased = titleCase(topic);
        // "macOS" is the one name that starts lowercase.
        if (topic !== "macOS") expect(cased[0]).toBe(cased[0].toUpperCase());
        expect(cased.toLowerCase()).toBe(topic.toLowerCase());
      }
    }
  });
});

describe("objective page titles", () => {
  it("lead with the topic and cite Security+ objective numbers, which are CompTIA's", () => {
    expect(objectivePageTitle(security)).toBe("Core Security Concepts Practice Questions (SY0-701 1.2)");
    expect(objectivePageDescription(security)).toContain("objective 1.2: Summarize fundamental security concepts");
  });

  it("never cite a Network+ number, because ours don't follow N10-009's", () => {
    expect(objectivePageTitle(network)).toBe("IP Addressing and Subnets Practice Questions (Network+ N10-009)");
    expect(objectivePageDescription(network)).not.toMatch(/objective|1\.4|Given a scenario/);
  });

  it("cite A+ objective numbers now that they're 220-1201's", () => {
    expect(objectivePageTitle(aPlus)).toBe("Displays Practice Questions (220-1201 3.1)");
    expect(objectivePageDescription(aPlus)).toBe(
      "Free A+ Core 1 (220-1201) practice questions for objective 3.1: Display components and attributes. Original, exam-style, with full explanations."
    );
  });
});
