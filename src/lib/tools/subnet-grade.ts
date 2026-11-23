/**
 * Grading for typed subnetting answers, apart from the question generator in
 * ./subnetting. The question card grades with this, and so does not carry the
 * generator and its tables to every page that shows a question.
 */

export type AnswerKind = "binary" | "dotted" | "cidr" | "count" | "yes-no";

/** A dotted address in its plain form ("192.168.1.64"), or null where it is not one. */
export function normDotted(raw: string): string | null {
  const t = raw.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) return null;
  const parts = t.split(".").map(Number);
  if (parts.some((p) => p > 255)) return null;
  return parts.join(".");
}

/** True when `raw` is a correct entry of `answer` for an answer of this kind. */
export function gradeAnswer(answerKind: AnswerKind, answer: string, raw: string): boolean {
  const t = raw.trim().toLowerCase();
  switch (answerKind) {
    case "binary": {
      const cleaned = t.replace(/[\s.]/g, "");
      if (!/^[01]{1,8}$/.test(cleaned)) return false;
      return parseInt(cleaned, 2) === parseInt(answer, 2);
    }
    case "dotted":
      return normDotted(t) === answer;
    case "cidr": {
      const cleaned = t.replace(/^\//, "");
      return /^\d{1,2}$/.test(cleaned) && Number(cleaned) === Number(answer);
    }
    case "count": {
      const cleaned = t.replace(/[,\s]/g, "");
      return /^\d+$/.test(cleaned) && Number(cleaned) === Number(answer);
    }
    case "yes-no": {
      if (["y", "yes"].includes(t)) return answer === "yes";
      if (["n", "no"].includes(t)) return answer === "no";
      return false;
    }
  }
}
