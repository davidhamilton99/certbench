"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { deleteStudySet, updateStudySet } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";

/** Owner controls on a study-set page: visibility toggle + delete. */
export function StudySetSettings({
  setId,
  isPublic,
}: {
  setId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"visibility" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function toggleVisibility() {
    setBusy("visibility");
    try {
      await api(updateStudySet, { setId, isPublic: !isPublic });
      toast.success(isPublic ? "Set is now private" : "Set is now public");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy("delete");
    try {
      await api(deleteStudySet, { setId });
      router.push("/study-materials");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(null);
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleVisibility}
        disabled={busy !== null}
      >
        {busy === "visibility" ? (
          <Loader2 className="animate-spin" />
        ) : isPublic ? (
          <Globe className="size-3.5" />
        ) : (
          <Lock className="size-3.5" />
        )}
        {isPublic ? "Public" : "Private"}
      </Button>
      <Button
        variant={confirming ? "destructive" : "ghost"}
        size="sm"
        onClick={remove}
        disabled={busy === "delete"}
        onBlur={() => setConfirming(false)}
      >
        {busy === "delete" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
        {confirming ? "Really delete?" : "Delete"}
      </Button>
    </div>
  );
}
