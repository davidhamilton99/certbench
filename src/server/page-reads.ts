import "server-only";

import { cache } from "react";
import { listActiveCertifications } from "@/server/data/certifications";
import { listEnrollments } from "@/server/data/enrollments";
import { getProfile } from "@/server/data/profiles";

/**
 * The reads that the signed-in layout and the page under it both make, made
 * once for each render. React's cache keys each call on its arguments: the
 * render's own client (the same object for the layout and for the page, both
 * of which take it from getPageSession) and the user's id. So a layout and its
 * page share one read, where each used to make its own, and nothing is shared
 * between requests or visitors. Outside a render, in a test for example, each
 * call simply reads.
 *
 * A page that changes one of these rows during its render and then needs it
 * again must read it with the plain function, which this does not cache.
 */
export const pageProfile = cache(getProfile);
export const pageEnrollments = cache(listEnrollments);
export const pageCertifications = cache(listActiveCertifications);
