import { describe, expect, it } from "vitest";
import { mentionsOptionLetter, repairText, splitExplanation, withoutAnswerLead } from "../text";

/** The em dash, as stored text carries it. Named by its code so that this file holds none. */
const DASH = String.fromCharCode(0x2014);

describe("withoutAnswerLead", () => {
  it("drops the lead that names the answer by its letter", () => {
    expect(withoutAnswerLead("Why B is correct: TLS encrypts data in transit.")).toBe("TLS encrypts data in transit.");
  });

  it("drops the lead in every form the pattern knows", () => {
    const rest = "A firewall filters traffic.";
    const leads = [
      "Why A is correct:",
      "Why B is correct.",
      "Why C is correct,",
      "Why D is correct -",
      `Why D is correct ${DASH}`,
      "Why option C is correct:",
      "Why B is the correct answer:",
      "Why option A is the correct answer.",
      "why b is correct:",
      "WHY OPTION D IS THE CORRECT ANSWER:",
      "  Why B is correct:  ",
    ];
    for (const lead of leads) expect(withoutAnswerLead(`${lead} ${rest}`), lead).toBe(rest);
  });

  it("returns an explanation without a lead exactly as it is", () => {
    const unchanged = [
      "TLS encrypts data in transit.",
      "",
      "  Spaces before and after are not its business.  ",
      // The words are there, but not as the opening of the explanation.
      "Candidates often ask why B is correct: it is the only encrypted protocol listed.",
      // Not a letter that names one of four answers.
      "Why E is correct: a fifth option would be needed.",
      "Why Bluetooth is correct: it is the short-range radio in the list.",
      // It says that an answer is wrong, which is not this lead.
      "Why B is incorrect: Telnet sends the session in clear text.",
      "Why B is correct and A is not needs a longer answer.",
    ];
    for (const text of unchanged) expect(withoutAnswerLead(text), text).toBe(text);
  });

  it("drops only the lead: a letter named further on stays, and is still seen", () => {
    const text = withoutAnswerLead("Why B is correct: SSH encrypts the session. Option A (Telnet) sends it in clear text.");
    expect(text).toBe("SSH encrypts the session. Option A (Telnet) sends it in clear text.");
    expect(mentionsOptionLetter(text)).toBe(true);
  });

  it("frees an explanation that names no other letter to be shown beside answers in any order", () => {
    const stored = "Why B is correct: SSH encrypts the session.";
    // The lead itself reads as a letter that names an answer.
    expect(mentionsOptionLetter(stored)).toBe(true);
    expect(mentionsOptionLetter(withoutAnswerLead(stored))).toBe(false);
  });

  it("leaves nothing of an explanation that was only its lead", () => {
    expect(withoutAnswerLead("Why B is correct.")).toBe("");
  });

  it("drops a lead that ended in a dash, once the stored text has been repaired", () => {
    // The readers repair first: the dash after the lead becomes a comma or a colon, and the lead may end in either.
    const stored = `Why C is correct ${DASH} the firewall drops the packet ${DASH} and logs it.`;
    expect(withoutAnswerLead(repairText(stored))).toBe("the firewall drops the packet, and logs it.");
  });

  it("is the one pattern: splitExplanation drops the same lead and shows the same words", () => {
    const stored = "Why C is correct: AES is a symmetric cipher. RSA is asymmetric.";
    const { takeaway, rest } = splitExplanation(stored);
    expect(takeaway).toBe("AES is a symmetric cipher.");
    expect(`${takeaway} ${rest}`).toBe(withoutAnswerLead(stored));
    // An explanation the readers have already cleaned splits into the same two parts.
    expect(splitExplanation(withoutAnswerLead(stored))).toEqual({ takeaway, rest });
  });
});
