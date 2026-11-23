import { describe, expect, it } from "vitest";
import { referenceRegistry } from "..";

/**
 * Distances in the cable tables that were read at the standard's own body on
 * November 22, 2026, so that a cell cannot drift back to a figure that belongs
 * to another speed.
 *
 * Multimode fiber, IEEE 802.3. At 10 Gb/s (10GBASE-S, clause 52) the reach is
 * 300 m on OM3 and 400 m on OM4: the OM4 row was accepted in the revision that
 * became IEEE Std 802.3-2012 (IEEE P802.3bh working group ballot, comment 112).
 * At 100 Gb/s the longest reach is that of 100GBASE-SR10 (clause 86): 100 m on
 * OM3 and 150 m on OM4. 550 m is a 1 Gb/s distance (1000BASE-SX). The Network+
 * table once gave 100 Gbps "500 m (OM4) / 400 m (OM3)", and the A+ table once
 * gave 10 Gbps "550 m (OM3/OM4)".
 *
 * USB 3.0, USB Implementers Forum (compliance update "USB 3.0 Cable Assembly
 * Maximum Lengths", effective October 2010): 3 meters for a cable assembly
 * without a micro series plug, and 1 meter with one.
 */
const IEEE_MULTIMODE_REACH: Record<string, Record<string, number>> = {
  "10 Gbps": { OM3: 300, OM4: 400 },
  "100 Gbps": { OM3: 100, OM4: 150 },
};

const cableRows = (cert: string) =>
  (referenceRegistry[cert] ?? []).find((table) => table.id === "cable-types")?.entries.map((entry) => entry.columns) ?? [];

const MULTIMODE = Object.keys(referenceRegistry).flatMap((cert) =>
  cableRows(cert)
    .filter((row) => row.cable.startsWith("Multimode fiber"))
    .map((row) => [cert, row] as const)
);

describe("distances in the cable tables", () => {
  it("has a multimode fiber row in the Network+ and the A+ Core 1 tables", () => {
    expect(MULTIMODE.map(([cert]) => cert).sort()).toEqual(["a-plus-core1-220-1201", "network-plus-n10-009"]);
  });

  it.each(MULTIMODE)("%s: gives multimode fiber the reach IEEE 802.3 specifies at the row's speed", (_cert, row) => {
    const reach = IEEE_MULTIMODE_REACH[row.maxSpeed];
    expect(reach, `a multimode row at ${row.maxSpeed}`).toBeDefined();
    // "150 m (OM4) / 100 m (OM3)": every distance is paired with the grade of fiber it is for.
    const stated = [...row.maxDistance.matchAll(/(\d+) m \((OM\d)\)/g)].map((found) => [found[2], Number(found[1])] as const);
    expect(stated.length, row.maxDistance).toBeGreaterThan(0);
    expect(stated.length, row.maxDistance).toBe(row.maxDistance.split(" / ").length);
    for (const [grade, meters] of stated) expect(meters, `${grade} at ${row.maxSpeed}`).toBe(reach[grade]);
  });

  it("names both grades of fiber where a table gives multimode fiber at 10 Gbps", () => {
    const [, row] = MULTIMODE.find(([cert]) => cert === "a-plus-core1-220-1201")!;
    expect(row.maxSpeed).toBe("10 Gbps");
    expect(row.maxDistance).toBe("300 m (OM3) / 400 m (OM4)");
  });

  it("keeps the USB 3.0 cable length that the USB Implementers Forum sets", () => {
    const usb3 = cableRows("a-plus-core1-220-1201").find((row) => row.cable === "USB 3.0 (3.2 Gen 1)")!;
    expect(usb3.maxSpeed).toBe("5 Gbps");
    expect(usb3.maxDistance).toBe("3 m");
  });
});
