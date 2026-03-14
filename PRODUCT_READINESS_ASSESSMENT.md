# CertBench Product Readiness Assessment

**Date:** 2026-03-14
**Verdict:** Not ready to market publicly. Ready to soft-launch with specific conditions.

---

## ONE — The First Five Minutes

The landing page is clean and credible. The headline — "Know exactly what to study. Pass your certification." — is clear, benefit-driven, and immediately relevant. The design is minimal but professional. It does not look like a weekend project.

But it is also anonymous. There is no founder name, no "about" section, no story. Compare this to Professor Messer (face on every page), Jason Dion (credentials, course count, student count), or ExamCompass (longstanding presence). You are asking for trust from a community that has been burned by garbage exam dumps while giving them nothing to anchor that trust on.

The "quick facts" section (90, 5, 1) reads oddly — the number "1" as a stat is confusing. These are features, not social proof. What a stranger wants to see is something like "2,376 practice questions across 4 CompTIA exams."

Registration is fine — display name, email, password, minimal friction.

The critical drop-off point is the dashboard. After signup, the user must take a 25-question diagnostic (15-20 min) before seeing anything. There is no sample question, no preview of the populated dashboard, no screenshot of the readiness score. Many users will leave and never come back.

The landing page is missing A+ Core 2 (220-1102) from the "Now supporting" section despite having 539 questions written for it.

## TWO — The Content

### Question counts in text files:
| Certification | Questions |
|---|---|
| Security+ SY0-701 | 624 |
| Network+ N10-009 | 617 |
| A+ Core 1 220-1101 | 596 |
| A+ Core 2 220-1102 | 539 |
| **Total** | **2,376** |

### Question counts actually in the database:
| Certification | Questions |
|---|---|
| Security+ SY0-701 | 218 |
| Network+ N10-009 | 0 |
| A+ Core 1 220-1101 | 0 |
| A+ Core 2 220-1102 | 0 |

**This is the single most critical issue.** 2,158 questions exist in text files but have not been imported into Supabase. Network+ and A+ are functionally broken — diagnostics will fail or return nothing.

Question quality is excellent — scenario-based, real CompTIA format, four plausible distractors, detailed explanations that teach the distinction between correct and incorrect answers. This content is genuinely competitive.

Can someone pass Security+ using only CertBench right now? With 218 questions, no. With all 624 seeded, possibly as a supplement. CertBench is a testing and reinforcement tool, not a teaching tool — that positioning should be explicit.

## THREE — The Core Promise

The readiness score is real — weighted domain performance with confidence factors. The study plan is real — 5-tier priority system that adapts daily. The spaced repetition is real — modified SM-2 with ease factors and interval capping.

The problem is not that the promise is empty — it is that the promise cannot be validated with 218 questions. A user who exhausts the bank has nothing left for the adaptive engine to work with.

With all 2,376 questions seeded, this changes substantially.

## FOUR — Trust Signals

### Present:
- Clean, professional design
- Privacy policy and terms of service
- Free tier, no credit card required

### Missing:
- Zero testimonials, pass rates, or user counts
- No CompTIA trademark disclaimer (legal and credibility risk)
- No sample questions without signup
- No founder identity or credentials
- No methodology explanation for non-technical users
- No community presence (Reddit, YouTube, blog)

## FIVE — The Competitive Reality

A Security+ candidate comparing CertBench to Dion Training would choose Dion: 500+ questions, video course, pass guarantee, 700K+ students, 4.7-star rating, $13-15 on sale.

CertBench's adaptive engine is architecturally superior in several ways, but the user cannot know that. Position as complementary to video courses, not competing with them.

## SIX — Priority Action Items

### Must be true before posting publicly (blocking):

1. **Seed all 2,376 questions into the database.** Scripts exist in `/scripts/`. Content exists in `/data/`. Network+ and A+ are completely broken without this.
2. **End-to-end test every certification flow.** Signup → enroll → diagnostic → readiness score → study plan → practice exam for all four exam codes.
3. **Add CompTIA trademark disclaimer.** Legal and credibility requirement.
4. **Add sample questions without signup.** 5-10 questions on landing page or /demo route.

### Should be true but not blocking:

5. Add founder identity to landing page.
6. Position explicitly as a practice/reinforcement tool alongside video courses.
7. List A+ Core 2 (220-1102) on landing page if supported.
8. Recruit 5-10 beta testers from r/CompTIA for real pass/fail data.

### Can wait:

9. Analytics integration
10. Additional question types in main bank
11. Certification expansion beyond CompTIA
12. Blog content and SEO
