"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface SampleQuestion {
  cert: string;
  certColor: string;
  domain: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    cert: "Security+ SY0-701",
    certColor: "text-primary",
    domain: "1.0 General Security Concepts",
    question:
      "A healthcare organisation cannot yet meet a regulatory requirement to encrypt all laptops because of legacy software compatibility issues. As a temporary measure, they implement strict physical access controls and require that laptops never leave the building. Which control type does this represent?",
    options: [
      "Corrective",
      "Compensating",
      "Directive",
      "Deterrent",
    ],
    correctIndex: 1,
    explanation:
      "Compensating controls are alternative measures put in place when the primary, preferred control cannot be implemented, providing an equivalent or acceptable level of risk reduction. This is not a directive control, which is one that instructs or mandates behaviour. Compensating controls are explicitly recognised in frameworks such as PCI-DSS and are always tied to an inability to meet a specific requirement.",
  },
  {
    cert: "Network+ N10-009",
    certColor: "text-success",
    domain: "1.0 Networking Concepts",
    question:
      "Which type of firewall maintains a state table to track active connections and makes decisions based on connection context?",
    options: [
      "Stateless firewall",
      "Packet filter",
      "Stateful firewall",
      "Proxy server",
    ],
    correctIndex: 2,
    explanation:
      "A stateful firewall tracks the state of active network connections in a state table, allowing it to make intelligent decisions based on connection context (e.g., whether a packet is part of an established session). A stateless firewall (packet filter) evaluates each packet independently without session context, making it less secure but faster. Stateful inspection is considered the baseline for modern firewall security.",
  },
  {
    cert: "A+ 220-1101",
    certColor: "text-warning",
    domain: "1.0 Mobile Devices",
    question:
      "A user wants to replace their laptop's 2.5-inch SATA HDD with a faster storage option. The laptop has an available M.2 slot. Which drive type should the technician recommend for maximum performance?",
    options: [
      "M.2 SATA SSD",
      "M.2 NVMe SSD",
      "mSATA SSD",
      "2.5-inch SATA SSD",
    ],
    correctIndex: 1,
    explanation:
      "An M.2 NVMe SSD uses the PCIe bus and NVMe protocol, delivering sequential read speeds often exceeding 3,000 MB/s, far outpacing any SATA-based alternative. An M.2 SATA SSD is limited to the SATA III ceiling of roughly 600 MB/s, the same as a 2.5-inch SATA SSD. mSATA is an older, largely discontinued form factor also constrained by SATA speeds.",
  },
];

function QuestionCard({ q, index }: { q: SampleQuestion; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* Cert badge + domain */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span
          className={`text-[12px] font-medium uppercase tracking-wider ${q.certColor}`}
        >
          {q.cert}
        </span>
        <span className="text-[11px] text-text-muted hidden sm:inline">&middot;</span>
        <span className="text-[11px] text-text-muted">{q.domain}</span>
      </div>

      {/* Question */}
      <p className="text-[15px] leading-relaxed text-text-primary">
        {q.question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {q.options.map((option, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = selected === i;
          const isCorrect = i === q.correctIndex;

          let borderClass =
            "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page cursor-pointer";
          let circleClass =
            "bg-bg-page text-text-secondary border border-border";

          if (answered) {
            if (isCorrect) {
              borderClass =
                "border-success bg-success-bg ring-1 ring-success";
              circleClass = "bg-success text-white";
            } else if (isSelected && !isCorrect) {
              borderClass =
                "border-danger bg-danger-bg ring-1 ring-danger";
              circleClass = "bg-danger text-white";
            } else {
              borderClass =
                "border-border bg-bg-surface opacity-50 cursor-default";
            }
          } else if (isSelected) {
            borderClass =
              "border-primary bg-info-bg ring-1 ring-primary";
            circleClass = "bg-primary text-white";
          }

          return (
            <button
              key={i}
              onClick={() => {
                if (!answered) setSelected(i);
              }}
              disabled={answered}
              className={`w-full text-left p-4 rounded-lg border transition-colors duration-150 ${borderClass}`}
            >
              <div className="flex gap-3">
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-mono font-medium ${circleClass}`}
                >
                  {letter}
                </span>
                <span className="text-[15px] leading-relaxed text-text-primary pt-0.5">
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && (
        <Card
          accent={selected === q.correctIndex ? "success" : "danger"}
          padding="md"
        >
          <p className="text-[13px] leading-relaxed text-text-secondary">
            {q.explanation}
          </p>
        </Card>
      )}
    </div>
  );
}

export function SampleQuestions() {
  return (
    <section className="border-t border-border">
      <div className="max-w-[900px] mx-auto px-6 py-14 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-3">
            Try it now
          </p>
          <h2 className="text-[28px] sm:text-[32px] font-bold text-text-primary tracking-tight">
            See the question quality for yourself
          </h2>
          <p className="text-[16px] text-text-secondary mt-3 max-w-lg mx-auto">
            No account needed. Pick an answer and see the kind of explanations
            you get with every question.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto">
          {SAMPLE_QUESTIONS.map((q, i) => (
            <Card key={i} padding="lg">
              <QuestionCard q={q} index={i} />
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-[15px] text-text-secondary mb-4">
            That&apos;s 3 out of 2,000+. Sign up to unlock your personalised
            study plan.
          </p>
          <Link href="/register">
            <Button size="lg">Start Studying</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
