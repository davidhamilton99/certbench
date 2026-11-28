import type { SampleQuestionData } from "@/components/marketing/QuestionDeck";

/**
 * Security+ SY0-801 (V8), from CompTIA's exam objectives document (version 2.0)
 * and its V8 exam page, checked on the date in lib/seo/exam-versions.ts.
 *
 * Objective labels are our own short names for each objective; CompTIA's
 * document, linked from its V8 page, has the official wording. The AI topics
 * are the terms objective 2.6 lists, explained in our words. The practice
 * questions are original, written by CertBench: CompTIA's exam questions are
 * confidential, and nothing here comes from them.
 */

export interface V8Objective {
  code: string;
  label: string;
  /** A topic Security+ hasn't had an objective for before. */
  isNew?: boolean;
}

export interface V8Domain {
  number: string;
  title: string;
  /** Share of the exam, in percent. */
  weight: number;
  objectives: V8Objective[];
}

export const SY0_801_DOMAINS: V8Domain[] = [
  {
    number: "1.0",
    title: "General Security Concepts",
    weight: 16,
    objectives: [
      { code: "1.1", label: "Concepts and controls" },
      { code: "1.2", label: "Change management" },
      { code: "1.3", label: "Cryptography" },
    ],
  },
  {
    number: "2.0",
    title: "Threats, Vulnerabilities, and Attacks",
    weight: 24,
    objectives: [
      { code: "2.1", label: "Threat intelligence and scoring" },
      { code: "2.2", label: "Threat actors" },
      { code: "2.3", label: "Threat vectors" },
      { code: "2.4", label: "Vulnerabilities" },
      { code: "2.5", label: "Signs of an attack" },
      { code: "2.6", label: "AI threats", isNew: true },
    ],
  },
  {
    number: "3.0",
    title: "Security Architecture",
    weight: 19,
    objectives: [
      { code: "3.1", label: "Architecture models" },
      { code: "3.2", label: "Secure infrastructure" },
      { code: "3.3", label: "Protecting data" },
      { code: "3.4", label: "Resilience and recovery" },
    ],
  },
  {
    number: "4.0",
    title: "Security Operations",
    weight: 27,
    objectives: [
      { code: "4.1", label: "Mitigating controls" },
      { code: "4.2", label: "Asset management" },
      { code: "4.3", label: "Vulnerability management" },
      { code: "4.4", label: "Monitoring and alerting" },
      { code: "4.5", label: "Identity and access" },
      { code: "4.6", label: "Automation and AI" },
      { code: "4.7", label: "Incident response" },
      { code: "4.8", label: "Investigation data" },
    ],
  },
  {
    number: "5.0",
    title: "Security Program Management and Oversight",
    weight: 14,
    objectives: [
      { code: "5.1", label: "Governance documents" },
      { code: "5.2", label: "Risk management" },
      { code: "5.3", label: "Third-party risk" },
      { code: "5.4", label: "Compliance" },
      { code: "5.5", label: "Audits and assessments" },
      { code: "5.6", label: "Security awareness" },
    ],
  },
];

/** SY0-701's objectives per domain, for the comparison (our database holds its list). */
export const SY0_701_OBJECTIVES_PER_DOMAIN = [4, 5, 4, 9, 6];

export interface AiTopic {
  term: string;
  /** One sentence that defines the term, in our words. The pages print these as a glossary. */
  gist: string;
}

/** The topics objective 2.6 lists, in the document's order. */
export const SY0_801_AI_TOPICS: AiTopic[] = [
  {
    term: "Model manipulation",
    gist: "Model manipulation is tampering with a trained model itself (its weights, parameters or files) so that it behaves as an attacker wants.",
  },
  {
    term: "Poisoning",
    gist: "Poisoning is the insertion of corrupted samples into the data that a model learns from, so that it learns the wrong lesson, often with a hidden trigger.",
  },
  {
    term: "Prompt injection",
    gist: "Prompt injection is crafted input, typed in or hidden in content that the AI reads, which overrides the instructions that the AI was given.",
  },
  {
    term: "Data loss",
    gist: "Data loss is sensitive data leaving the organization through the use of AI: pasted into a public tool, kept in its history or exposed in its answers.",
  },
  {
    term: "Bias",
    gist: "Bias is a skew in a model's training data or design that makes its results unfair to some people.",
  },
  {
    term: "Explainability",
    gist: "Explainability is the degree to which people can tell why a model produced its output, without which a decision cannot be audited or challenged.",
  },
  {
    term: "Hallucinations",
    gist: "Hallucinations are confident outputs that are false, such as an invented package name, citation or vulnerability.",
  },
  {
    term: "Jailbreaking",
    gist: "Jailbreaking is the use of prompts built to talk a model out of its safety rules, so that it produces what it is meant to refuse.",
  },
  {
    term: "Evasion",
    gist: "Evasion is the crafting of inputs at the time of use to get past an AI-based control, such as malware altered until a detector calls it clean.",
  },
  {
    term: "Privacy",
    gist: "Privacy concerns the personal data that a model was trained on or is given, and whether that data can be drawn back out.",
  },
  {
    term: "Ethical considerations",
    gist: "Ethical considerations are the questions of whether a use of AI is fair, transparent and accountable to the people it affects, beyond whether it is legal or secure.",
  },
  {
    term: "Session hijacking",
    gist: "Session hijacking is taking over someone's authenticated session with an AI service, in order to read their history or act as them.",
  },
  {
    term: "Code execution",
    gist: "Code execution is the running of code or commands by an AI tool or agent, so that a manipulated prompt or output becomes code running on a real system.",
  },
];

export interface AiQuestion extends SampleQuestionData {
  /** The 2.6 topic it practises (one of SY0_801_AI_TOPICS' terms). */
  topic: string;
}

export const SY0_801_AI_QUESTIONS: AiQuestion[] = [
  {
    topic: "Prompt injection",
    questionText:
      "A company's AI assistant summarizes inbound email for executives. An attacker sends a message with hidden white-on-white text telling the assistant to forward the mailbox's last ten messages to an outside address, and the assistant does it. Which threat does this BEST describe?",
    options: ["Session hijacking", "Prompt injection", "Poisoning", "Evasion"],
    correctIndex: 1,
    explanation:
      "Instructions hidden in content the AI processes override what it was told to do: an indirect prompt injection. Poisoning targets training data, not a live request; evasion fools a classifier into a wrong verdict; session hijacking would mean taking over a signed-in user's session, and here the attacker only sent an email.",
  },
  {
    topic: "Jailbreaking",
    questionText:
      "Through a series of prompts asking a public chatbot to role-play as an AI with no restrictions, a user gets it to write a phishing kit its safety policy forbids. Which of the following BEST describes the user's technique?",
    options: ["Model manipulation", "Code execution", "Session hijacking", "Jailbreaking"],
    correctIndex: 3,
    explanation:
      "Jailbreaking uses prompts to talk a model out of its safety rules. Nothing about the model itself changed (model manipulation), no one else's session was taken over (session hijacking), and the chatbot produced the kit without running any code on a system (code execution).",
  },
  {
    topic: "Poisoning",
    questionText:
      "Attackers submit thousands of crafted samples to a public malware feed that a vendor uses to retrain its detection model every week. After the next retraining, files carrying a particular marker are scored as benign. Which threat does this describe?",
    options: ["Evasion", "Hallucinations", "Poisoning", "Bias"],
    correctIndex: 2,
    explanation:
      "Corrupting the data a model learns from is poisoning, and it can plant a backdoor that the attacker later triggers with a marker. Evasion crafts inputs to fool a model whose training was never touched, bias is a skew a model learns from unbalanced data without any attacker, and a hallucination is false output that a model invents.",
  },
  {
    topic: "Evasion",
    questionText:
      "A threat actor keeps padding and reordering a malware sample, testing each version against a vendor's machine-learning scanner, until one is classified as clean. Nothing about the scanner or its training has changed. Which threat does this BEST describe?",
    options: ["Evasion", "Poisoning", "Prompt injection", "Model manipulation"],
    correctIndex: 0,
    explanation:
      "Evasion crafts inputs at use time to slip past an AI-based control. Poisoning and model manipulation would change what the model learned or the model itself; here only the input changed. Prompt injection plants instructions for a language model to follow, and a malware scanner takes no instructions.",
  },
  {
    topic: "Model manipulation",
    questionText:
      "An insider with write access to the registry that stores a company's fraud-detection AI swaps in altered weights so that it approves every transaction from one account. The training data is unchanged. Which threat is this, and which safeguard addresses it?",
    options: [
      "Evasion; test the model against crafted adversarial inputs",
      "Poisoning; vet the sources of the training data",
      "Code execution; run the model inside an isolated sandbox",
      "Model manipulation; verify signed model files",
    ],
    correctIndex: 3,
    explanation:
      "Tampering with a trained model itself, such as replacing its weights, is model manipulation, and signing model files and verifying them before deployment exposes the change. Vetting training data counters poisoning, adversarial testing counters evasion and a sandbox contains code execution, but the training data is untouched and nothing here crafted inputs or ran commands.",
  },
  {
    topic: "Data loss",
    questionText:
      "Developers have been pasting the company's proprietary source code into a free public AI chatbot to debug it. The fixes work, but the provider's terms let it keep whatever users paste in and train its models on it. Which risk is the company MOST exposed to?",
    options: ["Model manipulation", "Data loss", "Hallucinations", "Poisoning"],
    correctIndex: 1,
    explanation:
      "Confidential company data pasted into an outside AI service has left the company's control and may be kept or used for training: data loss. Privacy concerns personal data about people, while source code is the company's own intellectual property. Poisoning would need someone to plant crafted data to change how a model behaves, model manipulation would alter the model itself, and fixes that work show no sign of hallucinations.",
  },
  {
    topic: "Hallucinations",
    questionText:
      "A developer asks an AI coding assistant for a library to parse PDF files. It recommends a plausible-sounding package that has never existed. Weeks later, an attacker publishes a malicious package under that exact name. Which AI weakness made this attack possible?",
    options: ["Explainability", "Jailbreaking", "Hallucinations", "Session hijacking"],
    correctIndex: 2,
    explanation:
      "A hallucination is output that a model invents and presents as fact, such as a software package that has never existed. Jailbreaking talks a model out of its safety rules, session hijacking takes over a signed-in user's session, and explainability concerns knowing why a model reached an answer. Attackers register the names that models tend to invent, so check that any dependency an AI suggests is real before installing it.",
  },
  {
    topic: "Bias",
    questionText:
      "A company trains an AI tool to shortlist job applicants using ten years of its past hiring decisions. The tool consistently ranks applicants with career gaps lower, repeating old hiring patterns rather than predicting job performance. Which issue is this, and what should the company do before relying on the tool?",
    options: [
      "Bias; compare its results across groups of people",
      "Hallucinations; check rankings against records",
      "Model manipulation; verify the model files are unaltered",
      "Poisoning; check where each training record came from",
    ],
    correctIndex: 0,
    explanation:
      "A model trained on skewed history learns the skew and repeats it, which is bias, and comparing its results across groups before relying on it shows the skew. Checking where training records came from guards against poisoning and verifying model files against model manipulation, but nobody planted records or altered the model here, and a hallucination is invented output while these rankings follow a real pattern.",
  },
  {
    topic: "Explainability",
    questionText:
      "A bank's AI model declines a customer's loan. The customer and a regulator ask why, and the bank's team cannot say which factors drove the decision. Which concern does this BEST describe?",
    options: ["Evasion", "Data loss", "Code execution", "Explainability"],
    correctIndex: 3,
    explanation:
      "Explainability is whether people can tell why a model reached its output. Without it, a decision cannot be audited, challenged or shown to be fair. Data loss would mean sensitive data leaving the bank's control, evasion would mean someone crafting inputs to fool the model, and code execution would mean the model running commands on a system.",
  },
  {
    topic: "Privacy",
    questionText:
      "A hospital fine-tuned a chatbot on patient support transcripts for use by its own staff. A tester finds that carefully worded questions make it repeat a real patient's name and diagnosis to employees with no need to see them. Which concern does this BEST describe?",
    options: ["Evasion", "Privacy", "Bias", "Model manipulation"],
    correctIndex: 1,
    explanation:
      "Personal data a model was trained on can be drawn back out of it, exposing the people it describes: a privacy risk. Data loss would mean data leaving the hospital's control, whereas these details stay inside it and reach employees who should not see them. Model manipulation would alter the model itself, evasion crafts input so that a classifier gives a wrong verdict, and bias is a skew in how a model treats groups of people. Remove or de-identify personal data before training, and test whether the model reveals it.",
  },
  {
    topic: "Ethical considerations",
    questionText:
      "A company plans to have an AI system score employees' productivity from their chat messages and use the scores in layoff decisions, without telling employees. Counsel says it may be legal. Which concern is a reviewer raising by asking whether it is right to treat employees this way?",
    options: ["Hallucinations", "Bias", "Ethical considerations", "Data loss"],
    correctIndex: 2,
    explanation:
      "Ethical considerations ask whether a use of AI is fair, open and accountable to the people it affects, and they apply even when the use is legal. Bias would be a skew the model learns from its data, hallucinations would be false output and data loss would be data leaving the organization, but the reviewer raised none of these. Many organizations review a use of AI before it makes decisions about people.",
  },
  {
    topic: "Session hijacking",
    questionText:
      "An attacker steals a manager's authentication cookie for the company's AI assistant while the manager is signed in, then reads the manager's past conversations and sends new prompts as the manager. Which threat does this describe?",
    options: ["Session hijacking", "Evasion", "Prompt injection", "Jailbreaking"],
    correctIndex: 0,
    explanation:
      "Taking over an authenticated session, for example with a stolen cookie, is session hijacking, and with an AI assistant it exposes the whole conversation history. Prompt injection and jailbreaking misuse what a prompt says rather than whose access sends it, and evasion crafts input that a classifier misjudges. Short-lived tokens, secure cookie settings and re-authentication before sensitive actions reduce the risk.",
  },
  {
    topic: "Code execution",
    questionText:
      "An AI agent can run Python on a company server to answer staff questions. A request contains instructions that make the agent write and run a script opening a reverse shell from that server. Which risk does this BEST describe?",
    options: ["Data loss", "Hallucinations", "Evasion", "Code execution"],
    correctIndex: 3,
    explanation:
      "When an AI can run code or commands, manipulated input can become code running on a real system. Data loss is sensitive data leaving the organization, which a shell could later lead to but is not what happened, evasion crafts input that a classifier misjudges, and hallucinations are false output. Run AI tools in an isolated sandbox with least privilege, and never pass model output straight to a shell or interpreter.",
  },
  {
    topic: "Data loss",
    questionText:
      "After finding staff pasting customer records into public AI tools, a security manager wants to cut the risk while still letting staff use AI. Which of the following would BEST do that?",
    options: [
      "Sign model files and verify them before deployment",
      "Provide an approved AI service that does not keep prompts",
      "Require human review of AI output before anyone acts on it",
      "Screen incoming documents for hidden instructions to the AI",
    ],
    correctIndex: 1,
    explanation:
      "An approved AI service that does not keep prompts lets staff go on using AI without sending customer records to providers the company does not control. Data loss prevention rules for public AI sites can back it up. Screening documents for hidden instructions counters prompt injection, human review of output catches hallucinations, and signing model files guards against model manipulation, but none of them stops staff pasting records out.",
  },
];
