"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ProfileEditor({
  userId,
  email,
  displayName: initialName,
  memberSince,
  examDate: initialExamDate,
  certificationId,
}: {
  userId: string;
  email: string;
  displayName: string;
  memberSince: string;
  examDate: string | null;
  certificationId: string | null;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName);
  const [examDate, setExamDate] = useState(initialExamDate || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", userId);

    if (profileError) {
      setMessage({ type: "error", text: "Failed to update profile." });
      setSaving(false);
      return;
    }

    if (certificationId) {
      const { error: certError } = await supabase
        .from("user_enrollments")
        .update({ exam_date: examDate || null })
        .eq("user_id", userId)
        .eq("certification_id", certificationId);

      if (certError) {
        setMessage({ type: "error", text: "Failed to update exam date." });
        setSaving(false);
        return;
      }
    }

    setMessage({ type: "success", text: "Profile updated successfully." });
    setSaving(false);
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "delete my account") return;
    setDeleting(true);

    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setMessage({
          type: "error",
          text: data.error || "Failed to delete account.",
        });
        setDeleting(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Profile Information */}
      <section>
        <h2 className="text-[16px] font-semibold text-text-primary mb-1">
          Profile
        </h2>
        <p className="text-[13px] text-text-muted mb-4">
          Your public display information.
        </p>
        <Card padding="lg">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4 pb-2">
                <div className="w-14 h-14 rounded-full bg-bg-page border-2 border-border flex items-center justify-center text-[20px] font-bold text-text-secondary shrink-0">
                  {displayName.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-text-primary truncate">
                    {displayName || "No name set"}
                  </p>
                  <p className="text-[13px] text-text-muted truncate">
                    {email}
                  </p>
                </div>
              </div>

              <Input
                label="Display Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
              />

              {certificationId && (
                <Input
                  label="Target Exam Date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              )}

              {message && (
                <p
                  className={`text-[13px] rounded-md px-3 py-2 ${
                    message.type === "success"
                      ? "text-green-700 bg-green-50 border border-green-200"
                      : "text-danger bg-red-50 border border-red-200"
                  }`}
                >
                  {message.text}
                </p>
              )}

              <div>
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </section>

      {/* Account Details */}
      <section>
        <h2 className="text-[16px] font-semibold text-text-primary mb-1">
          Account
        </h2>
        <p className="text-[13px] text-text-muted mb-4">
          Account details and email.
        </p>
        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-text-primary">
                  Email address
                </p>
                <p className="text-[14px] text-text-muted font-mono mt-0.5">
                  {email}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-text-primary">
                    Password
                  </p>
                  <p className="text-[13px] text-text-muted mt-0.5">
                    Set a new password for your account.
                  </p>
                </div>
                <a href="/forgot-password">
                  <Button variant="secondary" size="sm">
                    Change password
                  </Button>
                </a>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-text-primary">
                    Member since
                  </p>
                  <p className="text-[14px] text-text-muted font-mono mt-0.5">
                    {new Date(memberSince).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Session */}
      <section>
        <h2 className="text-[16px] font-semibold text-text-primary mb-1">
          Session
        </h2>
        <p className="text-[13px] text-text-muted mb-4">
          Manage your current session.
        </p>
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-text-primary">
                Sign out
              </p>
              <p className="text-[13px] text-text-muted mt-0.5">
                Sign out of CertBench on this device.
              </p>
            </div>
            <Button variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </Card>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-[16px] font-semibold text-danger mb-1">
          Danger Zone
        </h2>
        <p className="text-[13px] text-text-muted mb-4">
          Irreversible actions that permanently affect your account.
        </p>
        <Card padding="lg" className="!border-red-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-text-primary">
                  Delete account
                </p>
                <p className="text-[13px] text-text-muted mt-0.5">
                  Permanently delete your account, study data, and all
                  associated content. This cannot be undone.
                </p>
              </div>
              {!showDeleteConfirm && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="!text-danger !border-red-200 hover:!bg-red-50 shrink-0 ml-4"
                >
                  Delete account
                </Button>
              )}
            </div>

            {showDeleteConfirm && (
              <div className="border-t border-red-200 pt-4">
                <p className="text-[13px] text-text-secondary mb-3">
                  To confirm, type{" "}
                  <span className="font-mono font-medium text-text-primary">
                    delete my account
                  </span>{" "}
                  below:
                </p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="delete my account"
                      className="w-full text-[14px] px-3 py-2 border border-red-200 rounded-md bg-bg-page text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDeleteAccount}
                    loading={deleting}
                    disabled={deleteConfirmText !== "delete my account"}
                    className="!bg-red-600 !text-white !border-red-600 hover:!bg-red-700 disabled:!opacity-50 disabled:!bg-red-600 shrink-0"
                  >
                    Permanently delete
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="shrink-0"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Footer Links */}
      <div className="flex items-center gap-4 pt-2 pb-4">
        <a
          href="/privacy"
          className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
        >
          Privacy Policy
        </a>
        <span className="text-[12px] text-text-muted">&middot;</span>
        <a
          href="/terms"
          className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
        >
          Terms of Service
        </a>
      </div>
    </div>
  );
}
