import type { SampleQuestionData } from "@/components/marketing/SampleQuestion";

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
      { code: "1.1", label: "Security concepts and controls" },
      { code: "1.2", label: "Change management and security" },
      { code: "1.3", label: "Cryptographic solutions" },
    ],
  },
  {
    number: "2.0",
    title: "Threats, Vulnerabilities, and Attacks",
    weight: 24,
    objectives: [
      { code: "2.1", label: "What threats and vulnerabilities look like" },
      { code: "2.2", label: "Threat actors and motivations" },
      { code: "2.3", label: "Threat vectors and sources" },
      { code: "2.4", label: "Vulnerabilities and attack surfaces" },
      { code: "2.5", label: "Indicators of malicious activity" },
      { code: "2.6", label: "Threats and vulnerabilities of AI", isNew: true },
    ],
  },
  {
    number: "3.0",
    title: "Security Architecture",
    weight: 19,
    objectives: [
      { code: "3.1", label: "Security of architecture models" },
      { code: "3.2", label: "Managing security architecture" },
      { code: "3.3", label: "Protecting data" },
      { code: "3.4", label: "Resilience and recovery" },
    ],
  },
  {
    number: "4.0",
    title: "Security Operations",
    weight: 27,
    objectives: [
      { code: "4.1", label: "Mitigating controls and techniques" },
      { code: "4.2", label: "Hardware, software and data asset management" },
      { code: "4.3", label: "Vulnerability management" },
      { code: "4.4", label: "Alerting and monitoring" },
      { code: "4.5", label: "Identity and access management" },
      { code: "4.6", label: "Automation and orchestration" },
      { code: "4.7", label: "Incident response" },
      { code: "4.8", label: "Data and sources for investigations" },
    ],
  },
  {
    number: "5.0",
    title: "Security Program Management and Oversight",
    weight: 14,
    objectives: [
      { code: "5.1", label: "Governance, risk and compliance artifacts" },
      { code: "5.2", label: "Risk management" },
      { code: "5.3", label: "Third-party risk" },
      { code: "5.4", label: "Security compliance" },
      { code: "5.5", label: "Audits and assessments" },
      { code: "5.6", label: "Security awareness" },
    ],
  },
];

/** SY0-701's objectives per domain, for the comparison (our database holds its list). */
export const SY0_701_OBJECTIVES_PER_DOMAIN = [4, 5, 4, 9, 6];

export interface AiTopic {
  term: string;
  /** One line, in our words. */
  gist: string;
}

/** The topics objective 2.6 lists, in the document's order. */
export const SY0_801_AI_TOPICS: AiTopic[] = [
  {
    term: "Model manipulation",
    gist: "Tampering with a trained model itself, its weights, parameters or files, so it behaves the way an attacker wants.",
  },
  {
    term: "Poisoning",
    gist: "Slipping corrupted samples into the data a model learns from, so it learns the wrong lesson, often with a hidden trigger.",
  },
  {
    term: "Prompt injection",
    gist: "Crafted input, typed in or hidden in content the AI reads, that overrides the instructions it was given.",
  },
  {
    term: "Data loss",
    gist: "Sensitive data leaving the organization through AI use: pasted into a public tool, kept in its history or exposed in its answers.",
  },
  {
    term: "Bias",
    gist: "Skewed training data or design that makes a model's results unfair to some people.",
  },
  {
    term: "Explainability",
    gist: "Whether anyone can tell why a model produced its output. Without it, a decision can't be audited or challenged.",
  },
  {
    term: "Hallucinations",
    gist: "Confident output that is false, such as an invented package name, citation or vulnerability.",
  },
  {
    term: "Jailbreaking",
    gist: "Prompts built to talk a model out of its safety rules, so it produces what it's meant to refuse.",
  },
  {
    term: "Evasion",
    gist: "Inputs crafted at use time to slip past an AI-based control, such as malware altered until a detector calls it clean.",
  },
  {
    term: "Privacy",
    gist: "Personal data a model was trained on or is given, and whether it can be drawn back out.",
  },
  {
    term: "Ethical considerations",
    gist: "Whether a use of AI is fair, transparent and accountable to the people it affects, beyond whether it's legal or secure.",
  },
  {
    term: "Session hijacking",
    gist: "Taking over someone's authenticated session with an AI service, to read their history or act as them.",
  },
  {
    term: "Code execution",
    gist: "An AI tool or agent that runs code or commands, so a manipulated prompt or output becomes code running on a real system.",
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
    options: ["Poisoning", "Prompt injection", "Hallucinations", "Evasion"],
    correctIndex: 1,
    explanation:
      "Instructions hidden in content the AI processes override what it was told to do: an indirect prompt injection. Poisoning targets training data, not a live request; evasion fools a classifier into a wrong verdict; a hallucination is false output the model makes up on its own.",
  },
  {
    topic: "Jailbreaking",
    questionText:
      "Through a series of prompts asking a public chatbot to role-play as an AI with no restrictions, a user gets it to write a phishing kit its safety policy forbids. Which of the following BEST describes the user's technique?",
    options: ["Model manipulation", "Session hijacking", "Data loss", "Jailbreaking"],
    correctIndex: 3,
    explanation:
      "Jailbreaking uses prompts to talk a model out of its safety rules. Nothing about the model itself changed (model manipulation), no one else's session was taken over (session hijacking) and no data left an organization (data loss).",
  },
  {
    topic: "Poisoning",
    questionText:
      "Attackers submit thousands of crafted samples to a public malware feed that a vendor uses to retrain its detection model every week. After the next retraining, files carrying a particular marker are scored as benign. Which threat does this describe?",
    options: ["Evasion", "Hallucinations", "Poisoning", "Explainability"],
    correctIndex: 2,
    explanation:
      "Corrupting the data a model learns from is poisoning; here it plants a backdoor that lets marked files through. Evasion would change the malicious files themselves at scan time, without touching what the model learned.",
  },
  {
    topic: "Evasion",
    questionText:
      "A threat actor keeps padding and reordering a malware sample, testing each version against a vendor's machine-learning scanner, until one is classified as clean. The scanner's model and training data are untouched. Which threat does this BEST describe?",
    options: ["Evasion", "Poisoning", "Model manipulation", "Prompt injection"],
    correctIndex: 0,
    explanation:
      "Evasion crafts inputs at use time to slip past an AI-based control. Poisoning and model manipulation would change what the model learned or the model itself; here only the input changed.",
  },
  {
    topic: "Model manipulation",
    questionText:
      "An insider with write access to a company's model registry replaces the fraud-detection model's weights with a version that approves every transaction from one account. The training data is unchanged. Which threat does this BEST describe?",
    options: ["Poisoning", "Bias", "Hallucinations", "Model manipulation"],
    correctIndex: 3,
    explanation:
      "Tampering with the trained model, here its weights in the registry, is model manipulation. Poisoning would change the training data, which is untouched. Protect models the way you protect code: access control, signing and integrity checks before deployment.",
  },
  {
    topic: "Data loss",
    questionText:
      "Developers have been pasting the company's proprietary source code into a free public AI chatbot to debug it. The chatbot's terms let it keep conversations to improve its models. Which risk is the company MOST exposed to?",
    options: ["Model manipulation", "Data loss", "Evasion", "Bias"],
    correctIndex: 1,
    explanation:
      "Sensitive data has left the company's control and may be kept or used for training: data loss. Typical controls are an approved AI service that doesn't retain data, data loss prevention rules and a clear acceptable use policy.",
  },
  {
    topic: "Hallucinations",
    questionText:
      "A developer asks an AI coding assistant for a library to parse PDF files. It recommends a plausible-sounding package that has never existed. Weeks later, an attacker publishes a malicious package under that exact name. Which AI weakness made this attack possible?",
    options: ["Jailbreaking", "Session hijacking", "Hallucinations", "Explainability"],
    correctIndex: 2,
    explanation:
      "The model confidently invented a package name: a hallucination. Attackers register the names models tend to invent and wait for someone to install them, so check that any dependency an AI suggests is real and trusted before using it.",
  },
  {
    topic: "Bias",
    questionText:
      "A company trains an AI tool to shortlist job applicants using ten years of its past hiring decisions. The tool consistently ranks applicants with career gaps lower, repeating old hiring patterns rather than predicting job performance. Which issue does this BEST describe?",
    options: ["Bias", "Hallucinations", "Poisoning", "Privacy"],
    correctIndex: 0,
    explanation:
      "The model learned the skew in its historical training data and repeats it: bias. Nobody attacked the data, so it isn't poisoning; the history itself was skewed. Test outputs across groups and review training data before deployment.",
  },
  {
    topic: "Explainability",
    questionText:
      "A bank's AI model declines a customer's loan. The customer and a regulator ask why, and the bank's team can't say which factors drove the decision. Which concern does this BEST describe?",
    options: ["Data loss", "Evasion", "Code execution", "Explainability"],
    correctIndex: 3,
    explanation:
      "Explainability is whether people can tell why a model reached its output. Without it, a decision can't be audited, challenged or shown to be fair.",
  },
  {
    topic: "Privacy",
    questionText:
      "A healthcare chatbot was fine-tuned on patient support transcripts. A tester finds that carefully worded questions make it repeat a real patient's name and diagnosis from that data. Which concern does this BEST describe?",
    options: ["Hallucinations", "Privacy", "Model manipulation", "Bias"],
    correctIndex: 1,
    explanation:
      "Personal data a model was trained on can be drawn back out of it: a privacy risk. Remove or de-identify personal data before training, and test whether the model reveals it.",
  },
  {
    topic: "Ethical considerations",
    questionText:
      "A company plans to have an AI system score employees' productivity from their chat messages and use the scores in layoff decisions, without telling employees. Counsel says it may be legal. Which concern is a reviewer raising by asking whether this use is fair and transparent to the people affected?",
    options: ["Evasion", "Session hijacking", "Ethical considerations", "Poisoning"],
    correctIndex: 2,
    explanation:
      "Fairness, transparency and accountability to the people affected are ethical considerations, and they apply even when a use is legal. They're why many organizations review a use of AI before it makes decisions about people.",
  },
  {
    topic: "Session hijacking",
    questionText:
      "An attacker steals the authentication cookie from a manager's logged-in session with the company's AI assistant, then reads the manager's past conversations and sends new prompts as the manager. Which threat does this describe?",
    options: ["Session hijacking", "Prompt injection", "Jailbreaking", "Hallucinations"],
    correctIndex: 0,
    explanation:
      "Taking over an authenticated session is session hijacking. With an AI assistant it exposes the whole conversation history and anything the assistant can do for that user. Short-lived tokens, secure cookie settings and re-authentication before sensitive actions reduce the risk.",
  },
  {
    topic: "Code execution",
    questionText:
      "An AI agent can run Python to answer questions about company data. A request contains instructions that make the agent write and run code opening a reverse shell from the server. Which risk does this BEST describe?",
    options: ["Bias", "Explainability", "Hallucinations", "Code execution"],
    correctIndex: 3,
    explanation:
      "When an AI can run code or commands, manipulated input can become code running on a real system. Run AI tools in an isolated sandbox with least privilege, and never pass model output straight to a shell or interpreter.",
  },
  {
    topic: "Data loss",
    questionText:
      "After finding staff pasting customer records into public AI tools, a security manager wants to cut the risk while still letting staff use AI. Which of the following would BEST do that?",
    options: [
      "Block all outbound HTTPS traffic from the network",
      "Provide an approved AI service that doesn't retain data, and add DLP rules for public AI sites",
      "Retrain the company's own models every month",
      "Require an explainability report for every prompt",
    ],
    correctIndex: 1,
    explanation:
      "A sanctioned tool that doesn't keep their data, plus data loss prevention on unsanctioned AI sites, cuts the risk while keeping AI useful. Blocking all HTTPS would stop the business, and the other options don't address data leaving through prompts.",
  },
];
