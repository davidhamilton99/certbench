"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Certification {
  id: string;
  slug: string;
  name: string;
  exam_code: string;
  vendor: string;
}

export function AddCertificationForm({
  certifications,
  userId,
}: {
  certifications: Certification[];
  userId: string;
}) {
  const router = useRouter();
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [examDate, setExamDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!selectedCertId) {
      setError("Please select a certification.");
      return;
    }

    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error: enrollError } = await supabase
      .from("user_enrollments")
      .insert({
        user_id: userId,
        certification_id: selectedCertId,
        exam_date: examDate || null,
      });

    if (enrollError) {
      setError(enrollError.message);
      setLoading(false);
      return;
    }

    const cert = certifications.find((c) => c.id === selectedCertId);
    router.push(`/dashboard?cert=${cert?.slug || ""}`);
    router.refresh();
  }

  if (certifications.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-[15px] text-text-secondary">
          You are already enrolled in all available certifications.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl flex flex-col gap-6">
      <div>
        <h3 className="text-[15px] font-medium text-text-primary mb-3">
          Select a certification
        </h3>
        <div className="flex flex-col gap-3">
          {certifications.map((cert) => (
            <button
              key={cert.id}
              type="button"
              onClick={() => setSelectedCertId(cert.id)}
              className="text-left"
            >
              <Card
                className={`cursor-pointer transition-all duration-150 ${
                  selectedCertId === cert.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-text-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-text-primary">
                      {cert.name}
                    </p>
                    <p className="text-[13px] text-text-secondary mt-0.5">
                      {cert.vendor} {cert.exam_code}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedCertId === cert.id
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {selectedCertId === cert.id && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="exam-date"
          className="block text-[15px] font-medium text-text-primary mb-1.5"
        >
          When is your exam?
        </label>
        <p className="text-[13px] text-text-muted mb-2">
          Optional. This helps us prioritise your study plan as the date
          approaches.
        </p>
        <input
          id="exam-date"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full px-3 py-2 text-[15px] text-text-primary bg-bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>

      {error && (
        <Card accent="danger" padding="md">
          <p className="text-[13px] text-danger">{error}</p>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading}>
          Enroll &amp; start studying
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
