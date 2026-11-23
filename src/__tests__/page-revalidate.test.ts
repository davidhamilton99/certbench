import { describe, expect, it, vi } from "vitest";

/**
 * How often two pages that are drawn from the question bank are rebuilt. The
 * bank changes only when questions are added or withdrawn, every deployment
 * builds both pages again, and the study path's later steps come from the
 * server's own copy of the bank, so once a day is enough (the comments beside
 * each `revalidate` say so). Once an hour cost 24 rebuilds a day, and for each
 * study path a read of its whole bank.
 */

// The pages are imported for their settings only: nothing is rendered, so
// their data and the study path's app are stood in for.
vi.mock("@/server/path/inventory", () => ({ examInventory: async () => [] }));
vi.mock("@/server/path/bank", () => ({ loadPathBank: async () => null }));
vi.mock("@/server/path/build-stop", () => ({ buildStop: () => null }));
vi.mock("@/components/path/PathApp", () => ({ PathApp: () => null }));

import * as educators from "@/app/(marketing)/educators/page";
import * as studyPath from "@/app/(path)/path/[cert]/page";

const ONE_DAY = 24 * 60 * 60;

describe("pages drawn from the question bank", () => {
  it("rebuilds the page for educators once a day", () => {
    expect(educators.revalidate).toBe(ONE_DAY);
  });

  it("rebuilds each study path page once a day, and makes none for an address that is not an exam's", () => {
    expect(studyPath.revalidate).toBe(ONE_DAY);
    expect(studyPath.dynamicParams).toBe(false);
  });
});
