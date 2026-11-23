import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getProfile: vi.fn(async () => ({ displayName: "Avery" })),
  listEnrollments: vi.fn(async () => []),
  listActiveCertifications: vi.fn(async () => []),
}));
vi.mock("@/server/data/profiles", () => ({ getProfile: h.getProfile }));
vi.mock("@/server/data/enrollments", () => ({ listEnrollments: h.listEnrollments }));
vi.mock("@/server/data/certifications", () => ({ listActiveCertifications: h.listActiveCertifications }));

import { pageCertifications, pageEnrollments, pageProfile } from "../page-reads";

describe("the reads that a signed-in layout and its page share", () => {
  it("read through to the plain functions with the same arguments", async () => {
    const db = {} as never;
    expect(await pageProfile(db, "user-1")).toEqual({ displayName: "Avery" });
    await pageEnrollments(db, "user-1");
    await pageCertifications(db);
    expect(h.getProfile).toHaveBeenCalledWith(db, "user-1");
    expect(h.listEnrollments).toHaveBeenCalledWith(db, "user-1");
    expect(h.listActiveCertifications).toHaveBeenCalledWith(db);
  });

  // The layout and the page each used to read the profile, the enrollments
  // and the exam list for themselves: two or three round trips more on every
  // page that a member opens.
  it("are used by the workspace layout and pages, which no longer read these for themselves", () => {
    const root = join(process.cwd(), "src", "app", "(workspace)");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name !== "__tests__") walk(path);
        } else if (name === "layout.tsx" || name === "page.tsx") files.push(path);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(10);
    const direct = files.filter((file) =>
      /\b(?:getProfile\(db, user\.id\)|listEnrollments\(db, user\.id\)|listActiveCertifications\(db\))/.test(
        readFileSync(file, "utf8")
      )
    );
    expect(direct).toEqual([]);
  });
});
