"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { completeOnboarding } from "@/contracts/user";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CertOption {
  id: string;
  name: string;
  examCode: string;
}

export function OnboardingForm({
  certifications,
}: {
  certifications: CertOption[];
}) {
  const router = useRouter();
  const [certId, setCertId] = useState<string | null>(null);
  const [examDate, setExamDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!certId) {
      setError("Pick a certification to continue");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api(completeOnboarding, {
        certId,
        examDate: examDate || null,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Certification" className="grid gap-2">
        {certifications.map((cert) => (
          <button
            key={cert.id}
            type="button"
            role="radio"
            aria-checked={certId === cert.id}
            onClick={() => setCertId(cert.id)}
            className={cn(
              "flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              certId === cert.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-accent"
            )}
          >
            <span className="font-medium">{cert.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {cert.examCode}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="examDate">
          Exam date{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="examDate"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
        />
        <p className="text-xs text-muted-foreground">
          With a date set, your study plan adapts as the exam approaches.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Start studying
      </Button>
    </form>
  );
}
