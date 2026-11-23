"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { updateDisplayName, deleteAccount } from "@/contracts/profile";
import { updateExamDate } from "@/contracts/user";
import { userMessage } from "@/lib/errors/user-message";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ProfileEnrollment {
  certId: string;
  certName: string;
  examCode: string;
  examDate: string | null;
}

export interface AvailableCert {
  certId: string;
  certName: string;
  examCode: string;
}

export function ProfileSettings({
  initialDisplayName,
  email,
  enrollments,
  availableCerts,
}: {
  initialDisplayName: string;
  email: string;
  enrollments: ProfileEnrollment[];
  availableCerts: AvailableCert[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [savingName, setSavingName] = useState(false);
  const [dates, setDates] = useState<Record<string, string>>(
    Object.fromEntries(enrollments.map((e) => [e.certId, e.examDate ?? ""]))
  );
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteHintId = useId();
  const deleteErrorId = useId();

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      await api(updateDisplayName, { displayName });
      toast.success("Your display name has been updated.");
      router.refresh();
    } catch (err) {
      toast.error(userMessage(err, "Your display name could not be saved. Please try again."));
    } finally {
      setSavingName(false);
    }
  }

  async function saveDate(certId: string) {
    setSavingDate(certId);
    try {
      await api(updateExamDate, {
        certId,
        examDate: dates[certId] || null,
      });
      toast.success("Your exam date has been updated.");
      router.refresh();
    } catch (err) {
      toast.error(userMessage(err, "Your exam date could not be saved. Please try again."));
    } finally {
      setSavingDate(null);
    }
  }

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api(deleteAccount, { confirm: "DELETE" });
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      // Said beside the button and kept there: this is not a message to miss.
      setDeleteError(
        userMessage(
          err,
          "Your account could not be deleted. Please try again. If the problem continues, write to support@certbench.dev."
        )
      );
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Account</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="flex max-w-sm flex-col gap-3">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={60}
                autoComplete="name"
              />
            </div>
            <Button
              type="submit"
              loading={savingName}
              disabled={displayName.trim() === initialDisplayName}
              className="self-start"
            >
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Exam dates</CardTitle>
          <CardDescription>Your study plan takes the date of each exam into account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {enrollments.map((e) => (
            <div key={e.certId} className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-56 gap-2">
                <Label htmlFor={`date-${e.certId}`}>
                  {e.certName}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {e.examCode}
                  </span>
                </Label>
                <Input
                  id={`date-${e.certId}`}
                  type="date"
                  value={dates[e.certId]}
                  onChange={(ev) =>
                    setDates((d) => ({ ...d, [e.certId]: ev.target.value }))
                  }
                />
              </div>
              <Button
                variant="outline"
                loading={savingDate === e.certId}
                disabled={dates[e.certId] === (e.examDate ?? "")}
                onClick={() => saveDate(e.certId)}
              >
                Update<span className="sr-only"> the {e.certName} exam date</span>
              </Button>
            </div>
          ))}
          {availableCerts.length > 0 && (
            <div className="border-t pt-4">
              <Button asChild variant="outline">
                <Link href="/upgrade?reason=add-cert">Add a certification</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Delete your account</CardTitle>
          <CardDescription id={deleteHintId} className="cb-measure">
            Deleting your account removes your progress, study sets and history permanently. This cannot be undone.
            Deleting your account also cancels your Pro subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDelete} className="flex max-w-sm flex-col gap-3">
            <div className="grid gap-2">
              <Label htmlFor="deleteConfirm">
                <span>
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm
                </span>
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby={deleteError ? `${deleteHintId} ${deleteErrorId}` : deleteHintId}
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              loading={deleting}
              disabled={deleteConfirm !== "DELETE"}
              className="self-start"
            >
              Delete my account permanently
            </Button>
            {deleteError && (
              <p id={deleteErrorId} role="alert" className="text-small text-destructive">
                {deleteError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
