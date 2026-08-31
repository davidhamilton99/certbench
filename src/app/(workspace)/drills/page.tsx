import { redirect } from "next/navigation";

/**
 * Drills folded into Recall — /drills now lives under /recall (which hosts the
 * same subnetting drill plus the verified recall decks). Redirect keeps old
 * links and bookmarks working.
 */
export default async function DrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert } = await searchParams;
  redirect(cert ? `/recall?cert=${cert}` : "/recall");
}
