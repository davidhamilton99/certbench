"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { updateDisplayName, deleteAccount } from "@/contracts/profile";
import { addCertification, updateExamDate } from "@/contracts/user";
import { ApiError } from "@/contracts/common";
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
  const [newCertId, setNewCertId] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      await api(updateDisplayName, { displayName });
      toast.success("Display name updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
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
      toast.success("Exam date updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSavingDate(null);
    }
  }

  async function enroll() {
    if (!newCertId) return;
    setEnrolling(true);
    try {
      await api(addCertification, { certId: newCertId, examDate: null });
      toast.success("Certification added — set an exam date when you book");
      setNewCertId("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api(deleteAccount, { confirm: "DELETE" });
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
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
              />
            </div>
            <Button
              type="submit"
              disabled={savingName || displayName.trim() === initialDisplayName}
              className="self-start"
            >
              {savingName && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exam dates</CardTitle>
          <CardDescription>
            Your study plan adapts as each exam approaches.
          </CardDescription>
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
                disabled={
                  savingDate === e.certId ||
                  dates[e.certId] === (e.examDate ?? "")
                }
                onClick={() => saveDate(e.certId)}
              >
                {savingDate === e.certId && <Loader2 className="animate-spin" />}
                Update
              </Button>
            </div>
          ))}
          {availableCerts.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <select
                value={newCertId}
                onChange={(e) => setNewCertId(e.target.value)}
                aria-label="Certification to add"
                className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="">Add a certification…</option>
                {availableCerts.map((c) => (
                  <option key={c.certId} value={c.certId}>
                    {c.certName} ({c.examCode})
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={!newCertId || enrolling}
                onClick={enroll}
              >
                {enrolling && <Loader2 className="animate-spin" />}
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-4" />
            Danger zone
          </CardTitle>
          <CardDescription>
            Deleting your account removes your progress, study sets, and history
            permanently. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex max-w-sm flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="deleteConfirm">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button
            variant="destructive"
            disabled={deleteConfirm !== "DELETE" || deleting}
            onClick={handleDelete}
            className="self-start"
          >
            {deleting && <Loader2 className="animate-spin" />}
            Delete account permanently
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
