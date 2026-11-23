import { describe, expect, it } from "vitest";
import { americanSpelling } from "../spelling";

describe("americanSpelling", () => {
  it("returns American text unchanged", () => {
    const text = "The organization authorizes access to the data center. Exercise the premises' controls.";
    expect(americanSpelling(text)).toBe(text);
    expect(americanSpelling("")).toBe("");
  });

  it("changes -ise and -isation where they are the British spelling", () => {
    expect(americanSpelling("The organisation centralised authorisation for unauthorised users.")).toBe(
      "The organization centralized authorization for unauthorized users."
    );
    expect(americanSpelling("Tokenisation minimises exposure; prioritise the optimised path.")).toBe(
      "Tokenization minimizes exposure; prioritize the optimized path."
    );
    expect(americanSpelling("Organisations recognise synchronisation issues.")).toBe(
      "Organizations recognize synchronization issues."
    );
  });

  it("leaves words that only look British", () => {
    const text =
      "An exercise in emphasis: the analyses of the enterprise premises are otherwise precise, and malvertising rises. An organism is a specialist's hypothesis.";
    expect(americanSpelling(text)).toBe(text);
  });

  it("changes -our, -re and the other regular differences", () => {
    expect(americanSpelling("Behavioural analysis of neighbouring colours in the data centre.")).toBe(
      "Behavioral analysis of neighboring colors in the data center."
    );
    expect(americanSpelling("A fibre run of 100 metres needs a licence; defence in depth applies.")).toBe(
      "A fiber run of 100 meters needs a license; defense in depth applies."
    );
    // The storage protocol's name is "Fibre Channel" in its standards and in CompTIA's objectives.
    expect(americanSpelling("A Fibre Channel SAN runs over multimode fibre, unlike FCoE.")).toBe(
      "A Fibre Channel SAN runs over multimode fiber, unlike FCoE."
    );
    expect(americanSpelling("The programme was cancelled while they analysed the artefacts.")).toBe(
      "The program was canceled while they analyzed the artifacts."
    );
    expect(americanSpelling("Slight discolouration is a rumour.")).toBe("Slight discoloration is a rumor.");
  });

  it("leaves words where -our is not a suffix", () => {
    const text = "Pour four hours of your tour into the contour. A sour detour.";
    expect(americanSpelling(text)).toBe(text);
  });

  it("keeps each word's capitals", () => {
    expect(americanSpelling("Centre. Organisation. UNAUTHORISED. Practise enrolment.")).toBe(
      "Center. Organization. UNAUTHORIZED. Practice enrollment."
    );
    expect(americanSpelling("In the final fortnight")).toBe("In the final two weeks");
  });
});
