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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createClient();

    // Update display name
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", userId);

    if (profileError) {
      setMessage({ type: "error", text: "Failed to update profile." });
      setSaving(false);
      return;
    }

    // Update exam date if user has an active enrollment
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

    setMessage({ type: "success", text: "Profile updated." });
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card padding="lg">
        <div className="flex flex-col gap-5">
          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
          />

          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              Email
            </label>
            <p className="text-[15px] text-text-muted font-mono bg-bg-page border border-border rounded-md px-3 py-2">
              {email}
            </p>
          </div>

          {certificationId && (
            <Input
              label="Exam Date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          )}

          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              Member Since
            </label>
            <p className="text-[15px] text-text-primary font-mono">
              {new Date(memberSince).toLocaleDateString()}
            </p>
          </div>

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
      </Card>
    </form>
  );
}
