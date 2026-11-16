import { describe, expect, it } from "vitest";
import { PATH_CERTS } from "../types";
import { EXAM_CODES, LAST_EXAM_DAY, examVersions, longDate, newerVersion, otherVersions } from "../versions";

describe("exam versions", () => {
  it("knows every path exam's code", () => {
    expect(Object.keys(EXAM_CODES).sort()).toEqual([...PATH_CERTS].sort());
  });

  it("teaches Security+ in two versions, newest first, and everything else in one", () => {
    expect(examVersions("security-plus-sy0-701")).toEqual(["security-plus-sy0-801", "security-plus-sy0-701"]);
    expect(examVersions("security-plus-sy0-801")).toEqual(["security-plus-sy0-801", "security-plus-sy0-701"]);
    expect(otherVersions("security-plus-sy0-801")).toEqual(["security-plus-sy0-701"]);
    expect(otherVersions("security-plus-sy0-701")).toEqual(["security-plus-sy0-801"]);
    for (const cert of ["network-plus-n10-009", "a-plus-core1-220-1201", "a-plus-core2-220-1202", "nonsense"]) {
      expect(examVersions(cert)).toEqual([]);
      expect(otherVersions(cert)).toEqual([]);
    }
  });

  it("points a version with a last day to the one replacing it", () => {
    expect(LAST_EXAM_DAY["security-plus-sy0-701"]).toBe("2027-06-11");
    expect(newerVersion("security-plus-sy0-701")).toBe("security-plus-sy0-801");
    expect(newerVersion("security-plus-sy0-801")).toBeNull();
    expect(newerVersion("network-plus-n10-009")).toBeNull();
    expect(longDate("2027-06-11")).toBe("June 11, 2027");
  });
});
