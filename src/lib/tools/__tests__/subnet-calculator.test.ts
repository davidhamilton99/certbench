import { describe, expect, it } from "vitest";
import { calculateSubnet, parseIpv4 } from "../subnet-calculator";

describe("parseIpv4", () => {
  it("accepts valid dotted quads", () => {
    expect(parseIpv4("192.168.1.1")).toEqual([192, 168, 1, 1]);
    expect(parseIpv4("0.0.0.0")).toEqual([0, 0, 0, 0]);
    expect(parseIpv4("255.255.255.255")).toEqual([255, 255, 255, 255]);
  });

  it("rejects malformed or out-of-range input", () => {
    expect(parseIpv4("256.1.1.1")).toBeNull();
    expect(parseIpv4("1.2.3")).toBeNull();
    expect(parseIpv4("1.2.3.4.5")).toBeNull();
    expect(parseIpv4("abc")).toBeNull();
    expect(parseIpv4("")).toBeNull();
  });
});

describe("calculateSubnet", () => {
  it("computes a /26 the block-size way", () => {
    const r = calculateSubnet("192.168.1.130", 26)!;
    expect(r.network).toBe("192.168.1.128");
    expect(r.broadcast).toBe("192.168.1.191");
    expect(r.firstHost).toBe("192.168.1.129");
    expect(r.lastHost).toBe("192.168.1.190");
    expect(r.usableHosts).toBe(62);
    expect(r.mask).toBe("255.255.255.192");
    expect(r.wildcard).toBe("0.0.0.63");
    expect(r.ipClass).toBe("C");
    expect(r.addressType).toBe("Private");
    expect(r.cidr).toBe("192.168.1.128/26");
  });

  it("handles a /24 (254 usable)", () => {
    const r = calculateSubnet("10.0.0.50", 24)!;
    expect(r.network).toBe("10.0.0.0");
    expect(r.broadcast).toBe("10.0.0.255");
    expect(r.usableHosts).toBe(254);
    expect(r.addressType).toBe("Private");
    expect(r.ipClass).toBe("A");
  });

  it("treats /30 as a point-to-point-ish 2 usable", () => {
    const r = calculateSubnet("172.16.5.1", 30)!;
    expect(r.usableHosts).toBe(2);
    expect(r.firstHost).toBe("172.16.5.1");
    expect(r.lastHost).toBe("172.16.5.2");
    expect(r.addressType).toBe("Private");
  });

  it("treats /31 as RFC-3021 (2 usable, no broadcast)", () => {
    const r = calculateSubnet("192.168.1.4", 31)!;
    expect(r.usableHosts).toBe(2);
    expect(r.broadcast).toBe("—");
    expect(r.firstHost).toBe("192.168.1.4");
    expect(r.lastHost).toBe("192.168.1.5");
  });

  it("treats /32 as a single host", () => {
    const r = calculateSubnet("8.8.8.8", 32)!;
    expect(r.usableHosts).toBe(1);
    expect(r.broadcast).toBe("—");
    expect(r.hostRange).toBe("8.8.8.8");
    expect(r.addressType).toBe("Public");
  });

  it("classifies public vs private and loopback", () => {
    expect(calculateSubnet("8.8.8.8", 24)!.addressType).toBe("Public");
    expect(calculateSubnet("127.0.0.1", 8)!.addressType).toBe("Loopback");
    expect(calculateSubnet("169.254.1.1", 16)!.addressType).toBe(
      "Link-local (APIPA)"
    );
  });

  it("returns null on invalid input", () => {
    expect(calculateSubnet("999.1.1.1", 24)).toBeNull();
    expect(calculateSubnet("10.0.0.0", 33)).toBeNull();
    expect(calculateSubnet("10.0.0.0", -1)).toBeNull();
  });
});
