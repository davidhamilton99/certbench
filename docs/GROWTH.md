# CertBench Growth Playbook

The engineering is live: paywall, public SEO pages, playable PBQs, the port
quiz, and lifecycle email. Traffic is now a distribution problem, and most
of the remaining levers are human ones. This is the ordered playbook.

## Week 1 — make Google aware you exist

1. **Google Search Console** (~15 min, biggest single lever)
   - https://search.google.com/search-console → Add property → Domain →
     `certbench.dev` → verify via the DNS TXT record it gives you (add it
     wherever your DNS lives — Vercel Domains, most likely).
   - Sitemaps → submit `https://certbench.dev/sitemap.xml`.
   - URL Inspection → paste each public page → **Request indexing**:
     `/security-plus-practice-test`, `/network-plus-practice-test`,
     `/a-plus-practice-test`, `/security-plus-pbq-examples`,
     `/network-plus-pbq-examples`, `/tools/port-numbers-quiz`, `/`.
   - New domains take weeks to rank; requesting indexing starts the clock.

2. **Bing Webmaster Tools** (~5 min, free traffic nobody bothers with)
   - https://www.bing.com/webmasters → Import from Google Search Console.
     Done — Bing/DuckDuckGo/ChatGPT-browsing all draw from this index.

3. **PostHog** (~10 min) — you can't improve what you can't see.
   - posthog.com → create a project → copy the API key →
     `NEXT_PUBLIC_POSTHOG_KEY` in Vercel env → redeploy.
   - The app is already instrumented to load it when the key exists.
   - Watch one funnel: landing → register → diagnostic complete → D7 return
     → paywall hit → checkout.

## Week 1–2 — the communities (this is where cert students actually are)

**r/CompTIA (~1M members) — the single most important channel.**
Rules of engagement: the sub bans drive-by self-promo but loves genuinely
useful tools from people who participate. Comment helpfully on a few
threads first (there's a daily stream of "how do I memorize ports?" and
"how do I practice PBQs?" posts where your pages are the literal answer).
Then post value-first. Two ready-to-adapt drafts:

> **Draft A — the PBQ post (strongest hook):**
> Title: "I built an interactive Security+ PBQ you can try in the browser
> (free, no signup) — because reading about PBQs isn't the same as doing one"
>
> Body: When I was prepping, PBQs scared me more than anything because
> every practice resource just *describes* them. So I built playable ones —
> firewall rules, log analysis, ordering IR steps — graded with partial
> credit like the real exam. First one's free without an account:
> certbench.dev/security-plus-pbq-examples. Would love feedback on whether
> the difficulty feels right vs the real SY0-701.

> **Draft B — the port quiz post:**
> Title: "Made a free endless port-numbers drill (both directions:
> port→protocol and protocol→port), no signup"
>
> Body: Every 'how do I memorize ports' thread says flashcards, so here's
> one better: certbench.dev/tools/port-numbers-quiz — endless quiz over the
> ~30 ports CompTIA actually tests, with the TCP/UDP detail Net+ asks
> about. Free, no account. Tell me which ports I'm missing.

- Post from your personal account, reply to every comment, and take the
  feedback seriously — a thread where the builder engages gets 10x the
  traction. One post per sub per few weeks max.
- Also worth a presence: r/CompTIA's Discord, Professor Messer's Discord
  (#study-groups), r/ITCareerQuestions (advice threads, not links).

**Non-US channels (the "across the globe" part):** CompTIA's biggest
growth markets are India, Nigeria, the Philippines, and the UK — all
studying in English, all reachable through the exact same pages and
subreddits (r/CompTIA is global). No localisation needed yet; if analytics
later shows a big non-US country, a pricing experiment (PPP discounts via
Stripe promotion codes) is the move — not translation.

## Week 2–4 — compounding assets

4. **Answer-the-question content.** Each of these is one page targeting a
   question with real volume and weak answers; the practice-test pages
   already exist as the conversion target:
   - "Is Security+ worth it in 2026?" · "Security+ vs CCNA — which first?"
   - "How long to study for Security+/Network+/A+" (survey r/CompTIA
     threads, give honest ranges)
   - "SY0-701 vs SY0-601: what changed"
   - CertBench vs Boson / vs Pocket Prep / vs CertMaster comparison pages
     (honest ones — concede what they do well; you win on adaptive plan +
     readiness score + price).

5. **Show the product in motion.** 30–60s screen recordings: a PBQ being
   solved, the readiness gauge filling after a diagnostic. Post natively to
   YouTube Shorts/TikTok/X with the page link. Low production bar — the
   product looks good now; let it demo itself.

6. **Testimonials engine.** The lifecycle email gives you the hook: when a
   user's exam date passes, a "how did it go?" email (future build) asking
   passers for a quote/Reddit comment. Until then, personally email your
   first passing users. Put quotes on the landing page.

## Ongoing rhythm (1–2 h/week)

- Monday: check Search Console (queries/impressions) + PostHog funnel.
- Answer every r/CompTIA thread where a page of yours is genuinely the
  answer (link only when it truly is; comment karma compounds).
- One new content page per week, minimum.
- When something ranks or a post pops: double down on that exact shape.

## What NOT to do yet

- Paid ads — no LTV data; you'd be buying traffic blind.
- Translation/i18n — English serves every major CompTIA market.
- More social accounts than you'll actually maintain — one channel done
  weekly beats five done never.
