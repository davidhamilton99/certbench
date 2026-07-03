import { Loader2 } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
