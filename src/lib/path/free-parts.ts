import { freeLabs, type FreeOnPublicPages } from "@/core/path/free-labs";
import type { PathCert } from "@/core/path/types";
import { pbqRegistry } from "@/data/pbq";
import { PBQ_EXAMPLE_PAGES, practicePageFor } from "@/lib/seo/cert-pages";
import { SY0_801_CERT, SY0_801_PRACTICE_PATH } from "@/lib/seo/exam-versions";

/**
 * What an exam gives away on its public pages: one full practice exam, and for
 * the exams that have a public page of labs, the labs that are free there. The
 * study path's outline says so and leads to those pages, and the emails count
 * the same labs, so that the outline, the emails, the home page and the
 * pricing page agree about what is free.
 *
 * The free labs are the ones the exam's public page of labs itself offers
 * (the same call, on the same list). An exam without such a page, Security+
 * SY0-801 today, has none to name here: its labs are opened by Pro.
 *
 * It lives here and not beside the study path's page, so that the server's
 * email job can ask it too; and not in src/core, because it reads the list of
 * public pages and the labs themselves.
 */
export function freeOnPublicPages(cert: PathCert): FreeOnPublicPages {
  const labsPage = PBQ_EXAMPLE_PAGES.find((page) => page.certSlug === cert);
  return {
    // SY0-801 has a practice test page of its own, which the list of practice test pages does not hold.
    examHref: cert === SY0_801_CERT ? SY0_801_PRACTICE_PATH : practicePageFor(cert),
    labsHref: labsPage ? `/${labsPage.path}` : null,
    labIds: labsPage ? freeLabs(pbqRegistry[cert] ?? []).map((lab) => lab.id) : [],
  };
}
