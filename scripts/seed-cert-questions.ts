/**
 * Generic cert question seeder — works for any certification.
 *
 * Usage:
 *   npx tsx scripts/seed-cert-questions.ts <cert-slug> <data-file>
 *
 * Example:
 *   npx tsx scripts/seed-cert-questions.ts a-plus-core1-220-1101 data/aplus-core1.txt
 *   npx tsx scripts/seed-cert-questions.ts network-plus-n10-009 data/network-plus-n10-009.txt
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
  );
  process.exit(1);
}

const certSlug = process.argv[2];
const dataFile = process.argv[3];

if (!certSlug || !dataFile) {
  console.error("Usage: npx tsx scripts/seed-cert-questions.ts <cert-slug> <data-file>");
  console.error("Example: npx tsx scripts/seed-cert-questions.ts a-plus-core1-220-1101 data/aplus-core1.txt");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ParsedQuestion {
  domain: string;
  subObjective: string;
  questionText: string;
  options: { text: string; is_correct: boolean }[];
  correctIndex: number;
  explanation: string;
}

function parseQuestions(content: string): ParsedQuestion[] {
  const blocks = content.split(/\n(?=Domain:)/g).filter((b) => b.trim());
  const questions: ParsedQuestion[] = [];

  for (const block of blocks) {
    try {
      const domainMatch = block.match(/^Domain:\s*(.+)/m);
      const subObjMatch = block.match(/^Sub-objective:\s*(.+)/m);
      const questionMatch = block.match(/^Question:\s*(.+(?:\n(?![A-D]\)).*)*)/m);
      const optionA = block.match(/^A\)\s*(.+(?:\n(?![B-D]\)|Correct:).*)*)/m);
      const optionB = block.match(/^B\)\s*(.+(?:\n(?![C-D]\)|Correct:).*)*)/m);
      const optionC = block.match(/^C\)\s*(.+(?:\n(?![D]\)|Correct:).*)*)/m);
      const optionD = block.match(/^D\)\s*(.+(?:\n(?!Correct:).*)*)/m);
      const correctMatch = block.match(/^Correct:\s*([A-D])/m);
      const explanationMatch = block.match(
        /^Explanation:\s*(.+(?:\n(?!Domain:).*)*)/m
      );

      if (
        !domainMatch ||
        !questionMatch ||
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD ||
        !correctMatch
      ) {
        console.warn("Skipping malformed block:", block.substring(0, 80));
        continue;
      }

      const correctLetter = correctMatch[1];
      const correctIndex = "ABCD".indexOf(correctLetter);

      const options = [
        optionA[1].trim(),
        optionB[1].trim(),
        optionC[1].trim(),
        optionD[1].trim(),
      ].map((text, i) => ({
        text,
        is_correct: i === correctIndex,
      }));

      questions.push({
        domain: domainMatch[1].trim(),
        subObjective: subObjMatch?.[1]?.trim() || "",
        questionText: questionMatch[1].trim(),
        options,
        correctIndex,
        explanation: explanationMatch?.[1]?.trim() || "",
      });
    } catch (err) {
      console.warn("Error parsing block:", (err as Error).message);
    }
  }

  return questions;
}

function questionHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function main() {
  const filePath = path.resolve(dataFile);

  if (!fs.existsSync(filePath)) {
    console.error(`Question file not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseQuestions(content);
  console.log(`Parsed ${parsed.length} questions from ${dataFile}`);

  // Fetch certification
  const { data: cert, error: certError } = await supabase
    .from("certifications")
    .select("id, name")
    .eq("slug", certSlug)
    .single();

  if (certError || !cert) {
    console.error(`Certification '${certSlug}' not found. Run seed migrations first.`);
    process.exit(1);
  }

  console.log(`Seeding into: ${cert.name} (${certSlug})`);

  // Fetch domains
  const { data: domains } = await supabase
    .from("cert_domains")
    .select("id, domain_number, title")
    .eq("certification_id", cert.id);

  // Fetch sub-objectives
  const domainIds = (domains || []).map((d) => d.id);
  const { data: subObjectives } = await supabase
    .from("cert_sub_objectives")
    .select("id, code, domain_id")
    .in("domain_id", domainIds);

  if (!domains) {
    console.error("Domains not found.");
    process.exit(1);
  }

  // Build lookup maps
  const domainMap = new Map(domains.map((d) => [d.domain_number, d]));
  const subObjMap = new Map((subObjectives || []).map((s) => [s.code, s]));

  // Check existing questions for dedup
  const { data: existingQuestions } = await supabase
    .from("cert_questions")
    .select("question_text")
    .eq("certification_id", cert.id);

  const existingHashes = new Set(
    (existingQuestions || []).map((q) => questionHash(q.question_text))
  );

  console.log(`Existing questions: ${existingHashes.size}`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  // Batch insert for performance
  const BATCH_SIZE = 50;
  const toInsert: any[] = [];

  for (const q of parsed) {
    const hash = questionHash(q.questionText);
    if (existingHashes.has(hash)) {
      skipped++;
      continue;
    }

    const domainNumber = q.domain.match(/^(\d+\.\d+)/)?.[1];
    const domain = domainNumber ? domainMap.get(domainNumber) : null;

    if (!domain) {
      console.warn(`Domain not found for: ${q.domain}`);
      failed++;
      continue;
    }

    const subObjCode = q.subObjective.match(/^(\d+\.\d+)/)?.[1];
    const subObj = subObjCode ? subObjMap.get(subObjCode) : null;

    toInsert.push({
      certification_id: cert.id,
      domain_id: domain.id,
      sub_objective_id: subObj?.id || null,
      question_text: q.questionText,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation,
      difficulty: 2,
    });

    existingHashes.add(hash);
  }

  // Insert in batches
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("cert_questions")
      .insert(batch);

    if (insertError) {
      console.warn(`Batch insert failed at ${i}: ${insertError.message}`);
      // Fall back to individual inserts
      for (const row of batch) {
        const { error } = await supabase.from("cert_questions").insert(row);
        if (error) {
          failed++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }

    if ((i + BATCH_SIZE) % 200 === 0) {
      console.log(`  ...inserted ${inserted} so far`);
    }
  }

  console.log(`\nResults:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (duplicate): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total in DB: ${inserted + (existingQuestions?.length || 0)}`);
}

main().catch(console.error);
