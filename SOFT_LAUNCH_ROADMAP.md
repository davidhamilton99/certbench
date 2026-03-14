# CertBench Soft-Launch Roadmap

**Goal:** Get CertBench ready for a first public post on r/CompTIA.
**Principle:** Every item here either prevents embarrassment, builds minimum trust, or removes a reason for a visitor to leave without trying the product.

---

## Phase 1 — Blocking Issues (Must ship before posting)

These are the things that, if missing, will get called out publicly and damage first impressions.

---

### 1.1 Add CompTIA disclaimer to the landing page footer

**Why it blocks:** Every legitimate cert prep site has this. Its absence signals either "exam dump" or "doesn't know the space." The r/CompTIA community is hypervigilant about this.

**Current state:** A full disclaimer already exists in `/src/app/(marketing)/terms/page.tsx` (Section 9 — Third-Party Trademark Disclaimer). But no one reads the Terms page before forming an opinion. It needs to be visible on every marketing page.

**What to do:**
- Create a reusable `Footer` component at `/src/components/marketing/Footer.tsx`
- Extract the existing inline footer from `/src/app/(marketing)/page.tsx`
- Add a single line above the copyright: "CompTIA, Security+, Network+, and A+ are registered trademarks of CompTIA, Inc. CertBench is not affiliated with or endorsed by CompTIA."
- Use the same `text-[11px] text-text-muted` styling as the copyright line
- Replace the inline footers in both `/src/app/(marketing)/page.tsx` and `/src/app/(marketing)/pricing/page.tsx` with the shared component

**Files to modify:**
- Create: `/src/components/marketing/Footer.tsx`
- Edit: `/src/app/(marketing)/page.tsx` — replace inline footer with `<Footer />`
- Edit: `/src/app/(marketing)/pricing/page.tsx` — replace inline footer with `<Footer />`

---

### 1.2 Add A+ Core 2 (220-1102) to the landing page

**Why it blocks:** You have 539 questions for it and it's a supported certification in the app. Omitting it from the landing page makes the product look smaller than it is, and A+ candidates will think you only cover half their exam.

**What to do:**
- Add `"CompTIA A+ 220-1102"` to the certifications array in `/src/components/marketing/CTASection.tsx`

**Files to modify:**
- Edit: `/src/components/marketing/CTASection.tsx` — add `"CompTIA A+ 220-1102"` to the array on line 28-30

---

### 1.3 Add sample questions on the landing page

**Why it blocks:** Right now a visitor must create an account AND complete a 20-minute diagnostic before seeing a single question. Most will leave. Every competitor (ExamCompass, Dion free samples, Professor Messer pop quizzes) lets you try questions immediately. This is the biggest conversion killer on the site.

**What to do:**

Create a `SampleQuestions` section component that shows 3 interactive sample questions inline on the landing page — one from each certification family (Security+, Network+, A+). No account required. The user clicks an answer, sees immediate feedback with the explanation, and gets a CTA to sign up for the full experience.

**Implementation:**
- Create `/src/components/marketing/SampleQuestions.tsx` — a client component with:
  - 3 hardcoded questions (one Security+, one Network+, one A+), pulled from your existing question bank text files
  - Each question shows the question text + 4 options as clickable buttons
  - Before answering: options are neutral (same styling as the diagnostic exam options)
  - After answering: correct option highlights green, incorrect selection highlights red, explanation appears below
  - After answering all 3 (or any one), show a CTA: "That's 3 out of 2,376. Start your diagnostic to unlock your personalised study plan." with a "Get Started Free" button
- Section header: "Try it now" with subtext "No account needed — see the kind of questions you'll practise with."
- Add `<SampleQuestions />` to the landing page between `<FeatureSection />` and `<CTASection />`

**Question selection criteria:** Pick questions that are:
- Scenario-based (not trivia) — this shows your quality vs exam dumps
- From different domains — this shows breadth
- Medium difficulty — not intimidating, not trivially easy
- With strong explanations — the explanation is your differentiator

**Files to modify:**
- Create: `/src/components/marketing/SampleQuestions.tsx`
- Edit: `/src/app/(marketing)/page.tsx` — add `<SampleQuestions />` between FeatureSection and CTASection

---

### 1.4 Replace the hero "quick facts" with your strongest numbers

**Why it blocks:** "90 / 5 / 1" are feature descriptions disguised as stats. "1 readiness score" is particularly confusing. Your actual numbers are more impressive and do a better job of communicating scale.

**What to do:**
- Replace the quick facts array in `/src/components/marketing/Hero.tsx` with:
  - `"2,376"` — "Practice questions across 4 exams"
  - `"4"` — "CompTIA certifications supported"
  - `"100%"` — "Free to start, no credit card"

**Files to modify:**
- Edit: `/src/components/marketing/Hero.tsx` — replace the facts array (lines 24-28)

---

## Phase 2 — Trust & Positioning (Should ship before or alongside the post)

These items significantly increase the chance a visitor converts but won't cause immediate reputational damage if missing on day one.

---

### 2.1 Add founder identity to the landing page

**Why it matters:** The r/CompTIA community trusts people, not brands. When Jason Dion posts, people engage because they know who he is. When an anonymous tool appears, the default assumption is spam or scam. One sentence changes this.

**What to do:**
- Add a small section above the footer (or within the CTA section) with:
  - Your name
  - One line about why you built it (e.g., "Built by [Name] — I got tired of studying blind for my Security+ and built the tool I wished I had.")
  - Optional: link to your Reddit profile or Twitter
- Keep it minimal. This is a trust anchor, not an about page.

**Files to modify:**
- Edit: `/src/components/marketing/CTASection.tsx` or create a small `FounderNote` component

---

### 2.2 Add complementary positioning copy

**Why it matters:** If you position against Dion/Messer, you lose — they have massive audiences and years of trust. If you position alongside them, you win — their users need a practice tool, and CertBench is better at adaptive practice than a Udemy course can be.

**What to do:**
- Add a line to the hero subtext or feature section: "Use alongside your favourite video course or textbook. CertBench handles the practice — so you know exactly when you're ready to sit the exam."
- This reframes the value proposition from "replace your study tools" to "complete your study stack."

**Files to modify:**
- Edit: `/src/components/marketing/Hero.tsx` or `/src/components/marketing/FeatureSection.tsx`

---

### 2.3 Craft the Reddit post itself

**Why it matters:** The post IS the marketing. A bad post will kill you regardless of how good the product is. The r/CompTIA community is allergic to self-promotion but receptive to genuine contributions.

**What to write:**
- Lead with your story, not your product: "I built a free practice tool while studying for Security+ because I couldn't find one that told me when I was actually ready"
- Be transparent: "It's free, I'm one developer, and I'd genuinely appreciate feedback from people who are actively studying"
- Mention the question counts and that it covers Security+, Network+, and both A+ exams
- Link to the site, but make the post valuable even without clicking (share a study tip, a technique, something useful)
- Do NOT use marketing language. Do not say "personalised AI-powered adaptive learning platform." Say "it tracks what you get wrong and keeps asking you those questions until you stop getting them wrong."
- Engage with every comment. Answer questions. Take feedback publicly. This builds more trust than any landing page change.

**Deliverable:** Draft the post text. Save it in a doc for review before publishing. Do not post without reading it aloud and asking "would I upvote this if a stranger posted it?"

---

## Phase 3 — Polish (Ship within the first week after posting)

These improve retention and depth but can follow the initial launch.

---

### 3.1 Add a dashboard preview to the landing page

**Why:** After a user sees the sample questions, they might wonder "what does this actually look like if I sign up?" A static screenshot or mockup of a populated dashboard (readiness score, domain breakdown, study plan) answers this without requiring signup.

**What to do:**
- Take a screenshot of a fully populated dashboard (after diagnostic, with readiness score visible)
- Add it as an image between the FeatureSection and the SampleQuestions section (or after SampleQuestions)
- Caption: "Your dashboard after the diagnostic — every session is built from your actual performance."

**Files to modify:**
- Add image to `/public/` directory
- Edit landing page to include the image section

---

### 3.2 Add an "About" or "How it works" page

**Why:** People who are seriously considering the product will look for more depth. A page explaining the readiness score methodology, the SRS approach, and the study plan algorithm (in plain language) builds credibility with the more analytical users.

**What to do:**
- Create `/src/app/(marketing)/about/page.tsx`
- Explain: What the readiness score means, how the study plan adapts, what spaced repetition does
- Use plain language, not jargon. "SM-2 algorithm" means nothing to your users. "Questions you get wrong come back sooner, questions you master fade into the background" means everything.
- Add an "About" link to the header navigation

---

### 3.3 Improve the pre-diagnostic experience

**Why:** The diagnostic is a 20-minute commitment. Users who don't understand why it matters will skip it or leave. The current intro screen explains it, but could do more to set expectations.

**What to do:**
- Add a brief visual showing what the diagnostic unlocks: "After 25 questions, you'll get:"
  - A readiness score (show a mockup number like "64 / 100")
  - A domain breakdown (show a mini bar chart)
  - A personalised study plan (show a sample session block)
- This makes the 20-minute investment feel worthwhile

**Files to modify:**
- Edit: `/src/components/workspace/DiagnosticExam.tsx` — enhance the intro phase (lines ~177-222)

---

### 3.4 Collect early feedback systematically

**Why:** Your first 50 users are your product team. Their feedback will tell you what's actually broken vs what you think might be broken.

**What to do:**
- Add a simple feedback mechanism — even just a mailto link in the workspace sidebar or dashboard: "Found a bug or have feedback? Email me directly."
- Consider adding a tiny in-app prompt after the first practice exam: "How was that? [Good / Could be better / Report a problem]" — store this in the database for later analysis
- Track which certification users enroll in most (this tells you where to invest content next)

---

## Phase 4 — Growth (Ship within the first month)

These are not launch requirements but will determine whether CertBench grows beyond the initial post.

---

### 4.1 Recruit beta testers and collect pass/fail data

**Why:** "I used CertBench and passed my Security+" is the most powerful marketing asset you can have. One real testimonial from a Reddit user is worth more than any landing page copy.

**What to do:**
- Offer free Pro access to 10-15 users who are actively studying for Security+, Network+, or A+
- Ask them to report back after their exam
- With permission, use their results as testimonials

---

### 4.2 Build a content presence

**Why:** The r/CompTIA post will generate a spike. A content presence sustains traffic after the spike.

**What to do:**
- Post genuinely helpful content on r/CompTIA weekly (study tips, domain breakdowns, common mistakes)
- Mention CertBench only when directly relevant
- Build reputation as a helpful community member first, product creator second

---

### 4.3 Add analytics

**Why:** You currently have zero visibility into user behavior beyond what's in the database. You don't know where users drop off, which features they use, or how long they study.

**What to do:**
- Add a lightweight, privacy-respecting analytics tool (Plausible, Umami, or PostHog)
- Key events to track: landing page → signup, signup → diagnostic started, diagnostic started → diagnostic completed, diagnostic completed → first practice exam
- This funnel will tell you exactly where you're losing people

---

## Launch Day Checklist

Before posting on r/CompTIA, verify:

- [ ] CompTIA trademark disclaimer visible in landing page footer
- [ ] All 4 certifications listed in "Now supporting" section (including A+ 220-1102)
- [ ] 3 sample questions playable on landing page without signup
- [ ] Hero stats updated to show real numbers (2,376 questions, 4 certs)
- [ ] Reddit post drafted, reviewed, and read aloud
- [ ] Full signup → diagnostic → dashboard → practice exam flow tested for Security+ SY0-701
- [ ] Full signup → diagnostic → dashboard → practice exam flow tested for Network+ N10-009
- [ ] Full signup → diagnostic → dashboard → practice exam flow tested for A+ 220-1101
- [ ] Full signup → diagnostic → dashboard → practice exam flow tested for A+ 220-1102
- [ ] Pricing page loads and Stripe checkout works
- [ ] Mobile experience tested (landing page + workspace)
- [ ] Password reset flow works
- [ ] Error states don't expose stack traces or internal details
