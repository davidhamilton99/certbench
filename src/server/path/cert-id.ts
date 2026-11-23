import "server-only";

import { createAnonClient } from "@/server/supabase/anon";
import { getCertificationBySlug } from "@/server/data/certifications";
import type { PathCert } from "@/core/path/types";

/**
 * The database id of a study path's exam, from its slug.
 *
 * Most study path endpoints need this id and nothing else from the exam: to
 * read a member's access, to enroll them, to record their answers. They used
 * to load the exam's whole question bank (about a megabyte on a new server
 * instance) to learn it. This reads one row, once: an id never changes, so it
 * is kept for the life of the instance. An exam the database does not have
 * (null) is not kept, and is asked for again next time.
 */
const ids = new Map<PathCert, string>();

export async function certIdFor(slug: PathCert): Promise<string | null> {
  const known = ids.get(slug);
  if (known) return known;
  const cert = await getCertificationBySlug(createAnonClient(), slug);
  if (!cert) return null;
  ids.set(slug, cert.id);
  return cert.id;
}

/** For tests: forget every id. */
export function forgetCertIds(): void {
  ids.clear();
}
