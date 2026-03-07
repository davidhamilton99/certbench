/**
 * Seed Security+ questions via the seed_question RPC function.
 * Uses the anon key (the function is SECURITY DEFINER).
 *
 * Usage: npx tsx scripts/seed-via-rpc.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = "https://mdvkidwkjjfgfwkogqvq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xofucBxlC1UmqoN8GBTglg_4Pco016c";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ParsedQuestion {
  domainNumber: string;
  subObjectiveCode: string;
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
        console.warn("Skipping malformed block:", block.substring(0, 80));
        continue;
      }

      const correctLetter = correctMatch[1];
      const correctIndex = "ABCD".indexOf(correctLetter);
      const domainNumber =
        domainMatch[1].trim().match(/^(\d+\.\d+)/)?.[1] || "";
      const subObjCode =
        subObjMatch?.[1]?.trim().match(/^(\d+\.\d+)/)?.[1] || "";

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
        domainNumber,
        subObjectiveCode: subObjCode,
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

async function main() {
  const filePath = path.resolve(
    __dirname,
    "../data/security-plus-sy0-701.txt"
  );
  const content = fs.readFileSync(filePath, "utf-8");
  const questions = parseQuestions(content);
  console.log(`Parsed ${questions.length} questions`);

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    const { error } = await supabase.rpc("seed_question", {
      p_cert_slug: "security-plus-sy0-701",
      p_domain_number: q.domainNumber,
      p_sub_obj_code: q.subObjectiveCode,
      p_question_text: q.questionText,
      p_options: q.options,
      p_correct_index: q.correctIndex,
      p_explanation: q.explanation,
    });

    if (error) {
      console.error(`[${i + 1}] Failed: ${error.message}`);
      failed++;
    } else {
      inserted++;
      if ((i + 1) % 25 === 0) {
        console.log(`  Progress: ${i + 1}/${questions.length}`);
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${questions.length}`);
}

main().catch(console.error);
