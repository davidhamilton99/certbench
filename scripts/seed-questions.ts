/**
 * Seed Security+ SY0-701 questions into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-questions.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (service role bypasses RLS for admin operations)
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ParsedQuestion {
  domain: string;
  subObjective: string;
  questionText: string;
  options: { text: string; is_correct: boolean }[];
  correctIndex: number;
  explanation: string;
}

/**
 * Parse the structured text file format:
 *
 * Domain: 4.0 Security Operations
 * Sub-objective: 4.3 — Given a scenario, use appropriate data sources...
 * Question: A security analyst is reviewing logs after...
 * A) Windows Security event logs...
 * B) NetFlow records...
 * C) The SIEM correlation rule...
 * D) DNS query logs...
 * Correct: B
 * Explanation: Why B is correct...
 */
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
  const filePath = path.resolve(__dirname, "../data/security-plus-sy0-701.txt");

  if (!fs.existsSync(filePath)) {
    console.error(`Question file not found: ${filePath}`);
    console.error(
      "Place the questions file at data/security-plus-sy0-701.txt"
    );
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseQuestions(content);
  console.log(`Parsed ${parsed.length} questions`);

  // Fetch certification
  const { data: cert, error: certError } = await supabase
    .from("certifications")
    .select("id")
    .eq("slug", "security-plus-sy0-701")
    .single();

  if (certError || !cert) {
    console.error("Certification not found. Run seed migrations first.");
    process.exit(1);
  }

  // Fetch domains
  const { data: domains } = await supabase
    .from("cert_domains")
    .select("id, domain_number, title")
    .eq("certification_id", cert.id);

  // Fetch sub-objectives
  const { data: subObjectives } = await supabase
    .from("cert_sub_objectives")
    .select("id, code, domain_id");

  if (!domains || !subObjectives) {
    console.error("Domains or sub-objectives not found.");
    process.exit(1);
  }

  // Build lookup maps
  const domainMap = new Map(
    domains.map((d) => [d.domain_number, d])
  );
  const subObjMap = new Map(
    subObjectives.map((s) => [s.code, s])
  );

  // Check existing questions for dedup
  const { data: existingQuestions } = await supabase
    .from("cert_questions")
    .select("question_text")
    .eq("certification_id", cert.id);

  const existingHashes = new Set(
    (existingQuestions || []).map((q) => questionHash(q.question_text))
  );

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of parsed) {
    // Dedup check
    const hash = questionHash(q.questionText);
    if (existingHashes.has(hash)) {
      skipped++;
      continue;
    }

    // Find domain by number (e.g., "4.0" from "4.0 Security Operations")
    const domainNumber = q.domain.match(/^(\d+\.\d+)/)?.[1];
    const domain = domainNumber ? domainMap.get(domainNumber) : null;

    if (!domain) {
      console.warn(`Domain not found for: ${q.domain}`);
      failed++;
      continue;
    }

    // Find sub-objective by code (e.g., "4.3" from "4.3 — Given a scenario...")
    const subObjCode = q.subObjective.match(/^(\d+\.\d+)/)?.[1];
    const subObj = subObjCode ? subObjMap.get(subObjCode) : null;

    const { error: insertError } = await supabase
      .from("cert_questions")
      .insert({
        certification_id: cert.id,
        domain_id: domain.id,
        sub_objective_id: subObj?.id || null,
        question_text: q.questionText,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation,
        difficulty: 2, // default medium
      });

    if (insertError) {
      console.warn(`Insert failed: ${insertError.message}`);
      failed++;
    } else {
      inserted++;
      existingHashes.add(hash);
    }
  }

  console.log(`\nResults:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (duplicate): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total in DB: ${inserted + (existingQuestions?.length || 0)}`);
}

main().catch(console.error);
