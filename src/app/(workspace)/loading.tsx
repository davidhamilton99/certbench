import { Loader2 } from "lucide-react";

/** Shown inside the workspace's frame while a page's data is on the way. */
export default function WorkspaceLoading() {
  return (
    <div role="status" className="mx-auto flex w-full max-w-2xl items-center gap-3 py-24 text-small text-muted-foreground">
      <Loader2 aria-hidden className="size-5 animate-spin" />
      The page is loading.
    </div>
  );
}
