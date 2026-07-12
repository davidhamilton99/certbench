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
- **Discords over subreddits.** Conversation-first; being the person who
  answers questions well travels further than any post. Verified server
  directory below — join the top six, not twenty.
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

### Discord directory (member counts verified 2026-07)

There is no scene of small CompTIA study servers — Disboard's `comptia`
tag has essentially one tiny server. The audience concentrates in a few
giant creator-run servers. Join the top six; 20 min/day in the cert-study
channels of these beats hours anywhere else:

| Server | Members | Invite | Where cert students are |
|---|---|---|---|
| Professor Messer | ~80,000 | discord.gg/professormesser | THE CompTIA study server — per-exam channels (A+/Net+/Sec+) |
| David Bombal | ~119,000 | discord.com/invite/usKSyzb | cert + career channels, big non-US audience |
| NetworkChuck | ~98,000 | discord.com/invite/networkchuck | beginner-heavy, A+/Net+ questions daily |
| TCM Security | ~70,000 | discord.com/invite/tcm | career-changers; Sec+ is the standard first step |
| InfoSec Prep | ~17,000 | discord.com/invite/6jjPnEG85h | literally a cert-prep server |
| WGU Unofficial | ~15,000 | discord.com/invite/unwgu | WGU IT degrees EMBED CompTIA certs — every student must pass them |
| TryHackMe / HackTheBox | ~370,000 each | discord.com/invite/tryhackme · /hackthebox | adjacent; join, lower priority |

Entry protocol (same as Reddit): two weeks of genuinely helpful answers
before any link; links only when someone asks "what did you use?"; put
certbench.dev in your Discord profile bio — that's passive, allowed, and
people do click profiles of helpful posters. Watch each server's rules
channel; some have a self-promo channel where a link IS allowed.

The competitor note: secplusmastery.com runs its own study Discord as the
community layer of their product. Not worth copying until CertBench has
~500 active users — an empty Discord is worse than none.

### Facebook groups — the unpriced channel

Reddit prohibits promotion; Facebook groups mostly don't, and multiple
CompTIA study groups have tens of thousands of members. This is also
where the Nigeria/Philippines audience actually is (Facebook is the
default internet there). Join, answer questions, and share the free
no-signup tools directly — post acceptance is moderator-gated, so lead
with the port quiz / PBQ examples / readiness check, never the paywall:

- facebook.com/groups/comsecplus — "CompTIA Security+ (study group)"
- facebook.com/groups/CompTIa.Students — A+/Net+/Sec+ students group
- facebook.com/groups/2411609635806164 — ITF+/A+/Net+/Sec+ study group
- facebook.com/groups/2108683329385288 — multi-cert study group
- Search "CompTIA" in FB Groups, sort by size; join the top 5–8.

### The rest of the global map (verified starting points)

- **Nairaland (Nigeria's biggest forum):** certification threads live for
  years and rank on Google Nigeria — e.g. nairaland.com/6340276
  ("IT Career With CompTIA Certifications") and nairaland.com/5880030.
  One helpful reply with the free tools reaches an audience actively
  asking for exactly this.
- **Telegram (India/Nigeria default for study groups):** several CompTIA
  channels exist (e.g. t.me/comptia_cysa; tgstat.com lists @CompTIA).
  Join the big ones, same helpful-first protocol. Beware: many Telegram
  cert channels are braindump bazaars — never associate with dumps;
  "no-dumps original questions" is the differentiator to say out loud.
- **Quora:** "how do I pass Security+ without experience" questions rank
  on Google for years. 10 genuinely good answers with a profile link +
  one contextual link each is durable, compounding visibility.
- **LinkedIn (the Josh Madakor model):** he posts "FREE CompTIA A+
  practice test, 1150+ questions" natively and it performs — career
  switchers live on LinkedIn. Post the free tools + readiness check as
  plain personal posts; no company page needed.
- **Quizlet + AnkiWeb distribution:** cert students search INSIDE
  Quizlet/Anki, and popular sets also rank in Google. Publish
  CertBench-branded free sets (port numbers, acronyms, Core 1 vs Core 2
  quick facts) with certbench.dev on the profile and in set descriptions.
  One evening of work, permanent shelf space on the platforms students
  already use.
- **Answer engines:** perplexity.ai already cites certbench.dev pages.
  Every answer-the-question page (below) doubles as AEO — lead each page
  with a direct 2–3 sentence answer so LLMs can quote it cleanly.

**Non-US markets:** India, Nigeria, the Philippines, and the UK all study
in English — reach them through the channels above (Facebook + Telegram +
Nairaland skew exactly there). Regional pricing is already live, so the
checkout no longer loses them at the price. No translation needed.

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
