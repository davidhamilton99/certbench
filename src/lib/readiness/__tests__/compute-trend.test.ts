import { describe, it, expect } from "vitest";
import { computeReadinessTrend } from "../compute-trend";

const NOW = new Date("2026-04-16T12:00:00Z");

function snapshot(score: number, daysAgo: number) {
  const computed_at = new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();
  return { overall_score: score, computed_at };
}

describe("computeReadinessTrend", () => {
  it("returns null when there are no snapshots", () => {
    expect(computeReadinessTrend(70, [], 7, NOW)).toBeNull();
  });

  it("compares against the newest snapshot older than the window", () => {
    const snapshots = [
      snapshot(68, 1), // too recent
      snapshot(60, 9), // eligible (9 days ago)
      snapshot(55, 20),
    ];
    const trend = computeReadinessTrend(70, snapshots, 7, NOW);
    expect(trend).not.toBeNull();
    expect(trend!.delta).toBe(10);
    expect(trend!.baselineScore).toBe(60);
    expect(trend!.daysSpan).toBe(9);
    expect(trend!.hasBaseline).toBe(true);
  });

  it("falls back to the oldest snapshot when nothing qualifies yet", () => {
    const snapshots = [snapshot(65, 2), snapshot(60, 3)];
    const trend = computeReadinessTrend(70, snapshots, 7, NOW);
    expect(trend).not.toBeNull();
    expect(trend!.baselineScore).toBe(60);
    expect(trend!.delta).toBe(10);
    expect(trend!.hasBaseline).toBe(false);
  });

  it("handles score strings from Postgres decimal columns", () => {
    const raw = [
      {
        overall_score: "62.50" as unknown as number,
        computed_at: snapshot(0, 10).computed_at,
      },
    ];
    const trend = computeReadinessTrend(70, raw, 7, NOW);
    expect(trend?.baselineScore).toBe(62.5);
    expect(trend?.delta).toBe(7.5);
  });

  it("rounds delta to one decimal place", () => {
    const snapshots = [snapshot(60.333, 10)];
    const trend = computeReadinessTrend(70.01, snapshots, 7, NOW);
    expect(trend?.delta).toBe(9.7);
  });

  it("ignores snapshots newer than the clock (skew defence)", () => {
    const snapshots = [
      {
        overall_score: 90,
        computed_at: new Date(NOW.getTime() + 60_000).toISOString(),
      },
    ];
    expect(computeReadinessTrend(70, snapshots, 7, NOW)).toBeNull();
  });
});
