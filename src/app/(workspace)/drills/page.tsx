import { redirect } from "next/navigation";

/**
 * The drills are part of Recall now: /recall holds the subnetting drill beside
 * the recall decks. This redirect keeps old links and bookmarks working.
 */
export default async function DrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert } = await searchParams;
  redirect(cert ? `/recall?cert=${cert}` : "/recall");
}
