import { describe, expect, it } from "vitest";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { objectivePageDescription, objectivePageTitle } from "../objective-meta";

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

describe("objective page titles", () => {
  it("are in sentence case: the topic keeps its own capitals and nothing else is raised", () => {
    const title = (topic: string) => objectivePageTitle({ ...security, topic });
    expect(title("Signs of an attack")).toBe("Signs of an attack practice questions (SY0-701 1.2)");
    expect(title("Motherboard, RAM, CPU and power problems")).toBe(
      "Motherboard, RAM, CPU and power problems practice questions (SY0-701 1.2)"
    );
    expect(title("macOS")).toBe("macOS practice questions (SY0-701 1.2)");
  });

  it("open with a capital for every objective's short name", () => {
    for (const titles of Object.values(OBJECTIVE_TITLES)) {
      for (const topic of Object.values(titles)) {
        // "macOS" is the one name that starts lowercase.
        if (topic !== "macOS") expect(topic[0], topic).toBe(topic[0].toUpperCase());
      }
    }
  });

  it("lead with the topic and cite Security+ objective numbers, which are CompTIA's", () => {
    expect(objectivePageTitle(security)).toBe("Core security concepts practice questions (SY0-701 1.2)");
    expect(objectivePageDescription(security)).toContain("objective 1.2: Summarize fundamental security concepts");
  });

  it("never cite a Network+ number, because ours do not follow N10-009's", () => {
    expect(objectivePageTitle(network)).toBe("IP addressing and subnets practice questions (Network+ N10-009)");
    expect(objectivePageDescription(network)).not.toMatch(/objective|1\.4|Given a scenario/);
  });

  it("cite A+ objective numbers now that they are 220-1201's", () => {
    expect(objectivePageTitle(aPlus)).toBe("Displays practice questions (220-1201 3.1)");
    expect(objectivePageDescription(aPlus)).toBe(
      "Free A+ Core 1 (220-1201) practice questions for objective 3.1: Display components and attributes. Original, exam-style, with full explanations."
    );
  });
});
