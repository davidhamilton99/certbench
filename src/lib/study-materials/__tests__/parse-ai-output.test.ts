import { describe, it, expect } from "vitest";
import { parseAIOutput, buildImportPrompt } from "../parse-ai-output";

describe("parseAIOutput", () => {
  // ── Multiple Choice ──────────────────────────────────────────────

  it("parses a basic MC question", () => {
    const input = `[MC]
Q: What port does HTTPS use?
- 443 (correct)
- 80
- 22
- 8080
Explanation: HTTPS uses port 443 by default.`;

    const { questions, errors } = parseAIOutput(input);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(1);

    const q = questions[0];
    expect(q.question_type).toBe("multiple_choice");
    expect(q.question_text).toBe("What port does HTTPS use?");
    expect(q.correct_index).toBe(0);
    expect(q.options).toHaveLength(4);
    expect((q.options[0] as { text: string }).text).toBe("443");
    expect((q.options[0] as { is_correct: boolean }).is_correct).toBe(true);
    expect((q.options[1] as { is_correct: boolean }).is_correct).toBe(false);
    expect(q.explanation).toBe("HTTPS uses port 443 by default.");
  });

  it("parses MC with correct answer in middle", () => {
    const input = `[MC]
Q: Which protocol is connectionless?
- TCP
- HTTP
- UDP (correct)
- FTP`;

    const { questions } = parseAIOutput(input);
    expect(questions[0].correct_index).toBe(2);
  });

  it("errors on MC with no (correct) marker", () => {
    const input = `[MC]
Q: What is 2+2?
- 3
- 4
- 5
- 6`;

    const { questions, errors } = parseAIOutput(input);
    expect(questions).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("No option marked (correct)");
  });

  it("errors on MC with fewer than 2 options", () => {
    const input = `[MC]
Q: What is 2+2?
- 4 (correct)`;

    const { errors } = parseAIOutput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("at least 2 options");
  });

  // ── True/False ───────────────────────────────────────────────────

  it("parses a True/False question (True)", () => {
    const input = `[TF]
Q: TCP is a connection-oriented protocol.
Answer: True
Explanation: TCP establishes a connection before data transfer.`;

    const { questions, errors } = parseAIOutput(input);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(1);

    const q = questions[0];
    expect(q.question_type).toBe("true_false");
    expect(q.correct_index).toBe(0);
    expect((q.options[0] as { is_correct: boolean }).is_correct).toBe(true);
    expect((q.options[1] as { is_correct: boolean }).is_correct).toBe(false);
  });

  it("parses a True/False question (False)", () => {
    const input = `[TF]
Q: UDP guarantees delivery.
Answer: False
Explanation: UDP is unreliable by design.`;

    const { questions } = parseAIOutput(input);
    expect(questions[0].correct_index).toBe(1);
    expect((questions[0].options[0] as { is_correct: boolean }).is_correct).toBe(false);
    expect((questions[0].options[1] as { is_correct: boolean }).is_correct).toBe(true);
  });

  it("errors on TF with missing Answer line", () => {
    const input = `[TF]
Q: TCP is connectionless.
Explanation: No answer provided.`;

    const { errors } = parseAIOutput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Answer: True/False");
  });

  // ── Multiple Select ──────────────────────────────────────────────

  it("parses a multiple select question", () => {
    const input = `[MS]
Q: Which are valid HTTP methods? (Select all that apply)
- GET (correct)
- POST (correct)
- FETCH
- SEND
Explanation: GET and POST are standard HTTP methods.`;

    const { questions, errors } = parseAIOutput(input);
    expect(errors).toHaveLength(0);

    const q = questions[0];
    expect(q.question_type).toBe("multiple_select");
    expect(q.correct_index).toBe(-1);
    expect((q.options[0] as { is_correct: boolean }).is_correct).toBe(true);
    expect((q.options[1] as { is_correct: boolean }).is_correct).toBe(true);
    expect((q.options[2] as { is_correct: boolean }).is_correct).toBe(false);
    expect((q.options[3] as { is_correct: boolean }).is_correct).toBe(false);
  });

  it("errors on MS with only 1 correct option", () => {
    const input = `[MS]
Q: Which apply?
- A (correct)
- B
- C`;

    const { errors } = parseAIOutput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("at least 2 options marked (correct)");
  });

  // ── Ordering ─────────────────────────────────────────────────────

  it("parses an ordering question", () => {
    const input = `[ORD]
Q: Arrange the OSI model layers from top to bottom:
1. Application
2. Presentation
3. Session
4. Transport
Explanation: The top four layers of the OSI model.`;

    const { questions, errors } = parseAIOutput(input);
    expect(errors).toHaveLength(0);

    const q = questions[0];
    expect(q.question_type).toBe("ordering");
    expect(q.correct_index).toBe(-1);
    expect(q.options).toHaveLength(4);
    expect((q.options[0] as { text: string; correct_position: number }).text).toBe("Application");
    expect((q.options[0] as { correct_position: number }).correct_position).toBe(0);
    expect((q.options[3] as { text: string }).text).toBe("Transport");
    expect((q.options[3] as { correct_position: number }).correct_position).toBe(3);
  });

  it("handles ordering with ) separator", () => {
    const input = `[ORD]
Q: Order these:
1) First
2) Second
3) Third`;

    const { questions } = parseAIOutput(input);
    expect(questions).toHaveLength(1);
    expect((questions[0].options[0] as { text: string }).text).toBe("First");
  });

  // ── Matching ─────────────────────────────────────────────────────

  it("parses a matching question with = separator", () => {
    const input = `[MATCH]
Q: Match each protocol with its port:
- HTTP = 80
- HTTPS = 443
- SSH = 22
- FTP = 21
Explanation: Standard port assignments.`;

    const { questions, errors } = parseAIOutput(input);
    expect(errors).toHaveLength(0);

    const q = questions[0];
    expect(q.question_type).toBe("matching");
    expect(q.correct_index).toBe(-1);
    expect(q.options).toHaveLength(4);
    expect((q.options[0] as { left: string; right: string }).left).toBe("HTTP");
    expect((q.options[0] as { left: string; right: string }).right).toBe("80");
  });

  it("handles matching with : separator", () => {
    const input = `[MATCH]
Q: Match terms:
- TCP : Connection-oriented
- UDP : Connectionless`;

    const { questions } = parseAIOutput(input);
    expect(questions).toHaveLength(1);
    expect((questions[0].options[0] as { left: string }).left).toBe("TCP");
  });

  // ── Mixed / edge cases ───────────────────────────────────────────

  it("parses multiple questions of different types", () => {
    const input = `[MC]
Q: What is HTTP?
- HyperText Transfer Protocol (correct)
- High Tech Protocol
- Host Transfer Protocol
- Hyper Terminal Protocol

[TF]
Q: DNS resolves domain names to IP addresses.
Answer: True

[ORD]
Q: Order the TCP handshake:
1. SYN
2. SYN-ACK
3. ACK`;

    const { questions, errors } = parseAIOutput(input);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(3);
    expect(questions[0].question_type).toBe("multiple_choice");
    expect(questions[1].question_type).toBe("true_false");
    expect(questions[2].question_type).toBe("ordering");
  });

  it("handles extra whitespace and blank lines", () => {
    const input = `

  [MC]

Q: What is 2+2?
- 3
- 4 (correct)
- 5
- 6

  Explanation:  Basic arithmetic.

`;

    const { questions, errors } = parseAIOutput(input);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(1);
    expect(questions[0].explanation).toBe("Basic arithmetic.");
  });

  it("is case-insensitive for tags", () => {
    const input = `[mc]
Q: Test?
- A (correct)
- B`;

    const { questions } = parseAIOutput(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].question_type).toBe("multiple_choice");
  });

  it("uses * as bullet alternative", () => {
    const input = `[MC]
Q: Pick one:
* Alpha (correct)
* Beta
* Gamma
* Delta`;

    const { questions } = parseAIOutput(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].correct_index).toBe(0);
  });

  it("returns errors with line numbers for invalid blocks", () => {
    const input = `[MC]
Q: Good question?
- A (correct)
- B
- C
- D

[MC]
This block has no Q: line`;

    const { questions, errors } = parseAIOutput(input);
    expect(questions).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Missing question");
  });

  it("returns empty result for empty input", () => {
    const { questions, errors } = parseAIOutput("");
    expect(questions).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("returns empty result for input with no tags", () => {
    const { questions, errors } = parseAIOutput("Just some random text\nwith no structure");
    expect(questions).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("handles missing explanation gracefully", () => {
    const input = `[TF]
Q: The sky is blue.
Answer: True`;

    const { questions } = parseAIOutput(input);
    expect(questions[0].explanation).toBe("");
  });
});

describe("buildImportPrompt", () => {
  it("includes MC format when multiple_choice selected", () => {
    const prompt = buildImportPrompt(["multiple_choice"], 10);
    expect(prompt).toContain("[MC]");
    expect(prompt).toContain("(correct)");
    expect(prompt).toContain("10 study questions");
  });

  it("includes all type tags when all types selected", () => {
    const prompt = buildImportPrompt(
      ["multiple_choice", "true_false", "multiple_select", "ordering", "matching"],
      25
    );
    expect(prompt).toContain("[MC]");
    expect(prompt).toContain("[TF]");
    expect(prompt).toContain("[MS]");
    expect(prompt).toContain("[ORD]");
    expect(prompt).toContain("[MATCH]");
    expect(prompt).toContain("mix of types");
  });

  it("does not mention mix for single type", () => {
    const prompt = buildImportPrompt(["true_false"], 5);
    expect(prompt).not.toContain("mix of types");
  });

  it("includes placeholder for study material", () => {
    const prompt = buildImportPrompt(["multiple_choice"], 10);
    expect(prompt).toContain("[Paste your notes");
  });
});
