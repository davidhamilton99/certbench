import { createClient } from "@supabase/supabase-js";
import { E2E_EMAIL_PREFIX, loadLocalEnv } from "./helpers";

/**
 * Deletes every account created by the e2e suite (email prefix match).
 * auth.users cascades through profiles to all owned rows.
 */
export default async function globalTeardown() {
  const env = loadLocalEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("[e2e teardown] no service role available — skipping cleanup");
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let removed = 0;
  let page = 1;
  // listUsers is paginated; e2e accounts are few, one pass is plenty.
  for (; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    for (const user of data.users) {
      if (user.email?.startsWith(E2E_EMAIL_PREFIX)) {
        await admin.auth.admin.deleteUser(user.id);
        removed++;
      }
    }
    if (data.users.length < 200) break;
  }
  console.log(`[e2e teardown] removed ${removed} e2e account(s)`);
}
