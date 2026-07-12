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

**r/CompTIA reality check (verified 2026-07): the sub prohibits
advertising outright — promotional posts are not allowed, full stop.**
Don't fight it; route around it:

- **Helpful comments, links only when asked.** Answer the daily "how do I
  memorize ports?" / "how do I practice PBQs?" threads with genuine advice
  in your own words. If someone asks "where?" or "what did you use?",
  answering with a link is a reply, not an ad. Never open with the link.
- **Modmail the sanctioned route.** Some cert subs keep a mod-maintained
  resources wiki. One polite modmail asking whether the free no-signup
  tools (PBQ examples, port quiz, readiness check) qualify for the wiki is
  allowed, durable if accepted, and costs five minutes.
- **Discords over subreddits.** Professor Messer's Discord and other study
  servers are conversation-first — being the person who answers questions
  well travels further there than any post.
- **Let users be the mouthpiece.** The endgame is organic mentions in
  "what did you study with?" threads — that comes from the product and the
  post-pass testimonial email, not from you posting. Never astroturf.

**Backlinks without Reddit** (the SEO authority you'd have gotten from a
popular post has to come from somewhere):

- Submit the free tools to directories: AlternativeTo, free-for.dev,
  Product Hunt (a proper launch doubles as a link + traffic spike),
  IndieHackers.
- IT instructors and bootcamps (start with Medicine Hat College warm
  contacts) — one course page or LMS link from an .edu-adjacent source is
  worth dozens of directory links.
- YouTube/TikTok descriptions on your own videos all link back — volume
  adds up.

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
