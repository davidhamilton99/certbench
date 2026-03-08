const features = [
  {
    title: "Readiness Score",
    description:
      "A single number that tells you how prepared you are. Domain-weighted, confidence-penalised, and updated after every session.",
    metric: "0–100",
    metricLabel: "score range",
  },
  {
    title: "Priority Study Plan",
    description:
      "Your dashboard builds a fresh study plan every day. SRS reviews first, then weak domains, then practice exams — in exactly the right order.",
    metric: "5",
    metricLabel: "priority levels",
  },
  {
    title: "Spaced Repetition",
    description:
      "Missed questions come back at scientifically-timed intervals. Correct answers get spaced further apart. Nothing slips through.",
    metric: "SM-2",
    metricLabel: "algorithm",
  },
  {
    title: "Domain-Weighted Exams",
    description:
      "Practice exams match the real exam blueprint. Questions distribute proportionally across domains so you practise what matters most.",
    metric: "90q",
    metricLabel: "per exam",
  },
  {
    title: "Targeted Drills",
    description:
      "Drill into a single domain with 10 focused questions. The engine prioritises questions you have not seen or have answered incorrectly.",
    metric: "10q",
    metricLabel: "per drill",
  },
  {
    title: "AI Study Materials",
    description:
      "Paste your notes or textbook excerpts. AI generates practice questions from your own content — a personal question bank alongside the official one.",
    metric: "50",
    metricLabel: "questions per set",
  },
];

export function FeatureSection() {
  return (
    <section className="border-t border-border bg-bg-surface">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-[28px] sm:text-[32px] font-bold text-text-primary tracking-tight">
            Every session is optimised for you
          </h2>
          <p className="text-[16px] text-text-secondary mt-3 max-w-lg mx-auto">
            CertBench analyses your performance across every domain and
            generates a study plan that adapts as you improve.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-border rounded-lg p-5"
            >
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[24px] font-bold font-mono text-primary tabular-nums">
                  {feature.metric}
                </span>
                <span className="text-[12px] text-text-muted">
                  {feature.metricLabel}
                </span>
              </div>
              <h3 className="text-[16px] font-semibold text-text-primary mb-1.5">
                {feature.title}
              </h3>
              <p className="text-[14px] text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
