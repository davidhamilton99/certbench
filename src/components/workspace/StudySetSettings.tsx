"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { deleteStudySet, updateStudySet } from "@/contracts/study-sets";
import { userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * The owner's controls on a study set's page: make the set public or private,
 * and delete it. Each button says what it does. A set cannot be made again
 * once it is deleted, so deleting asks first.
 */
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
    if (busy) return;
    setBusy("visibility");
    try {
      await api(updateStudySet, { setId, isPublic: !isPublic });
      toast.success(
        isPublic
          ? "The study set is now private."
          : "The study set is now public. Other members can find it under Community."
      );
      router.refresh();
    } catch (err) {
      toast.error(userMessage(err, "The study set could not be changed. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy("delete");
    try {
      await api(deleteStudySet, { setId });
      router.push("/study-materials");
      router.refresh();
    } catch (err) {
      toast.error(userMessage(err, "The study set could not be deleted. Please try again."));
      setBusy(null);
      setConfirming(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={toggleVisibility} loading={busy === "visibility"}>
        {isPublic ? "Make this set private" : "Make this set public"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} loading={busy === "delete"}>
        Delete this set
      </Button>
      <ConfirmDialog
        open={confirming && busy !== "delete"}
        title="Delete this study set?"
        message="The study set and its questions will be deleted permanently. This cannot be undone."
        confirmLabel="Delete the study set"
        cancelLabel="Keep the study set"
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
