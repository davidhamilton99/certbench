import { describe, expect, it, vi } from "vitest";

// The email job's module reads the server's settings and makes its database
// client as it loads; the count under test touches neither.
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  serverEnv: vi.fn(),
  serverEnvOptional: vi.fn(),
}));

import { freeLabs } from "@/core/path/free-labs";
import { PATH_CERTS } from "@/core/path/types";
import { pbqRegistry } from "@/data/pbq";
import { freeOnPublicPages } from "@/lib/path/free-parts";
import { PBQ_EXAMPLE_PAGES } from "@/lib/seo/cert-pages";
import { freeLabCount } from "@/server/services/lifecycle-email";

/**
 * The emails, the study path's outline and the exams' public pages of labs
 * must say the same about what is free. Until November 2026 the email job
 * counted the free labs with a copy of the outline's calls, which the server
 * could not import from the study path's page: one change to either would have
 * let an email state another number than the page it leads to.
 */
describe("what is free on an exam's public pages", () => {
  /** The labs that an exam's public page of labs offers free, as that page works them out (PbqExampleLanding). */
  const shownOnLabsPage = (cert: string) => {
    const page = PBQ_EXAMPLE_PAGES.find((p) => p.certSlug === cert);
    return page ? freeLabs(pbqRegistry[page.certSlug] ?? []).map((lab) => lab.id) : [];
  };

  it("is the same number of labs in the emails as the public pages show, for every exam of the study path", () => {
    for (const cert of PATH_CERTS) {
      expect(freeLabCount(cert), cert).toBe(shownOnLabsPage(cert).length);
      expect(freeOnPublicPages(cert).labIds, cert).toEqual(shownOnLabsPage(cert));
    }
  });

  it("names free labs for the exams that have a public page of labs, and none for an exam without one", () => {
    const counts = Object.fromEntries(PATH_CERTS.map((cert) => [cert, freeLabCount(cert)]));
    expect(counts["security-plus-sy0-801"]).toBe(0);
    for (const page of PBQ_EXAMPLE_PAGES) {
      if (page.certSlug in counts) expect(counts[page.certSlug], page.certSlug).toBeGreaterThan(0);
    }
  });
});
