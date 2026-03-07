/**
 * Parse the Security+ question bank and generate SQL INSERT statements.
 *
 * Usage:
 *   npx tsx scripts/generate-seed-sql.ts > supabase/migrations/003_seed_questions.sql
 */

import * as fs from "fs";
import * as path from "path";

interface ParsedQuestion {
  domain: string;
  domainNumber: string;
  subObjective: string;
  subObjectiveCode: string;
  questionText: string;
  options: { text: string; is_correct: boolean }[];
  correctIndex: number;
  explanation: string;
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function parseQuestions(content: string): ParsedQuestion[] {
  const blocks = content.split(/\n(?=Domain:)/g).filter((b) => b.trim());
  const questions: ParsedQuestion[] = [];

  for (const block of blocks) {
    try {
      const domainMatch = block.match(/^Domain:\s*(.+)/m);
      const subObjMatch = block.match(/^Sub-objective:\s*(.+)/m);
      const questionMatch = block.match(/^Question:\s*([\s\S]*?)(?=\nA\))/m);
      const optionA = block.match(/^A\)\s*([\s\S]*?)(?=\nB\))/m);
      const optionB = block.match(/^B\)\s*([\s\S]*?)(?=\nC\))/m);
      const optionC = block.match(/^C\)\s*([\s\S]*?)(?=\nD\))/m);
      const optionD = block.match(/^D\)\s*([\s\S]*?)(?=\nCorrect:)/m);
      const correctMatch = block.match(/^Correct:\s*([A-D])/m);
      const explanationMatch = block.match(/^Explanation:\s*([\s\S]*?)$/m);

      if (
        !domainMatch ||
        !questionMatch ||
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD ||
        !correctMatch
      ) {
        console.error("Skipping malformed block:", block.substring(0, 80));
        continue;
      }

      const correctLetter = correctMatch[1];
      const correctIndex = "ABCD".indexOf(correctLetter);

      const domainNumber = domainMatch[1].trim().match(/^(\d+\.\d+)/)?.[1] || "";
      const subObjCode = subObjMatch?.[1]?.trim().match(/^(\d+\.\d+)/)?.[1] || "";

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
        domainNumber,
        subObjective: subObjMatch?.[1]?.trim() || "",
        subObjectiveCode: subObjCode,
        questionText: questionMatch[1].trim(),
        options,
        correctIndex,
        explanation: explanationMatch?.[1]?.trim() || "",
      });
    } catch (err) {
      console.error("Error parsing block:", (err as Error).message);
    }
  }

  return questions;
}

function main() {
  const filePath = path.resolve(__dirname, "../data/security-plus-sy0-701.txt");
  const content = fs.readFileSync(filePath, "utf-8");
  const questions = parseQuestions(content);

  console.error(`Parsed ${questions.length} questions`);

  const lines: string[] = [];

  lines.push("-- ============================================================");
  lines.push("-- CertBench — Seed Security+ SY0-701 Questions");
  lines.push(`-- Auto-generated: ${questions.length} questions`);
  lines.push("-- ============================================================");
  lines.push("");
  lines.push("DO $$");
  lines.push("DECLARE");
  lines.push("  v_cert_id uuid;");
  lines.push("  v_domain_id uuid;");
  lines.push("  v_sub_obj_id uuid;");
  lines.push("BEGIN");
  lines.push("");
  lines.push("  -- Get certification ID");
  lines.push("  SELECT id INTO v_cert_id FROM certifications WHERE slug = 'security-plus-sy0-701';");
  lines.push("  IF v_cert_id IS NULL THEN");
  lines.push("    RAISE EXCEPTION 'Certification security-plus-sy0-701 not found';");
  lines.push("  END IF;");
  lines.push("");

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const optionsJson = JSON.stringify(q.options);

    lines.push(`  -- Question ${i + 1}: Domain ${q.domainNumber}`);
    lines.push(`  SELECT id INTO v_domain_id FROM cert_domains WHERE certification_id = v_cert_id AND domain_number = '${q.domainNumber}';`);

    if (q.subObjectiveCode) {
      lines.push(`  SELECT id INTO v_sub_obj_id FROM cert_sub_objectives WHERE domain_id = v_domain_id AND code = '${q.subObjectiveCode}';`);
    } else {
      lines.push("  v_sub_obj_id := NULL;");
    }

    lines.push(`  INSERT INTO cert_questions (certification_id, domain_id, sub_objective_id, question_text, options, correct_index, explanation, difficulty)`);
    lines.push(`  VALUES (v_cert_id, v_domain_id, v_sub_obj_id, '${escapeSQL(q.questionText)}', '${escapeSQL(optionsJson)}'::jsonb, ${q.correctIndex}, '${escapeSQL(q.explanation)}', 2)`);
    lines.push(`  ON CONFLICT DO NOTHING;`);
    lines.push("");
  }

  lines.push("  RAISE NOTICE 'Seeded % questions for Security+ SY0-701', " + questions.length + ";");
  lines.push("END $$;");

  console.log(lines.join("\n"));
}

main();
