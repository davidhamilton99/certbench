import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";

export interface Certification {
  id: string;
  slug: string;
  name: string;
  examCode: string;
  vendor: string;
  totalExamQuestions: number;
  passingScore: number;
  maxScore: number;
  examDurationMinutes: number;
}

export interface CertDomain {
  id: string;
  domainNumber: string;
  title: string;
  examWeight: number;
  sortOrder: number;
}

export async function listActiveCertifications(db: Db): Promise<Certification[]> {
  const { data, error } = await db
    .from("certifications")
    .select(
      "id, slug, name, exam_code, vendor, total_exam_questions, passing_score, max_score, exam_duration_minutes"
    )
    .eq("is_active", true)
    .order("name");
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map(mapCertification);
}

export async function getCertification(
  db: Db,
  certId: string
): Promise<Certification | null> {
  const { data, error } = await db
    .from("certifications")
    .select(
      "id, slug, name, exam_code, vendor, total_exam_questions, passing_score, max_score, exam_duration_minutes"
    )
    .eq("id", certId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  return data ? mapCertification(data) : null;
}

export async function getCertificationBySlug(
  db: Db,
  slug: string
): Promise<Certification | null> {
  const { data, error } = await db
    .from("certifications")
    .select(
      "id, slug, name, exam_code, vendor, total_exam_questions, passing_score, max_score, exam_duration_minutes"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  return data ? mapCertification(data) : null;
}

export async function listDomains(db: Db, certId: string): Promise<CertDomain[]> {
  const { data, error } = await db
    .from("cert_domains")
    .select("id, domain_number, title, exam_weight, sort_order")
    .eq("certification_id", certId)
    .order("sort_order");
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map((d) => ({
    id: d.id,
    domainNumber: d.domain_number,
    title: d.title,
    examWeight: Number(d.exam_weight),
    sortOrder: d.sort_order,
  }));
}

export interface SubObjective {
  id: string;
  code: string;
  title: string;
  domain_id: string;
}

export async function listSubObjectives(
  db: Db,
  certId: string
): Promise<SubObjective[]> {
  // Sub-objectives hang off domains; two-step lookup keeps RLS simple.
  const { data: domains, error: dErr } = await db
    .from("cert_domains")
    .select("id")
    .eq("certification_id", certId);
  if (dErr) throw new ApiError("internal", dErr.message);
  const domainIds = (domains ?? []).map((d) => d.id);
  if (domainIds.length === 0) return [];

  const { data, error } = await db
    .from("cert_sub_objectives")
    .select("id, code, title, domain_id")
    .in("domain_id", domainIds)
    .order("sort_order");
  if (error) throw new ApiError("internal", error.message);
  return data ?? [];
}

function mapCertification(row: {
  id: string;
  slug: string;
  name: string;
  exam_code: string;
  vendor: string;
  total_exam_questions: number;
  passing_score: number;
  max_score: number;
  exam_duration_minutes: number;
}): Certification {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    examCode: row.exam_code,
    vendor: row.vendor,
    totalExamQuestions: row.total_exam_questions,
    passingScore: row.passing_score,
    maxScore: row.max_score,
    examDurationMinutes: row.exam_duration_minutes,
  };
}
