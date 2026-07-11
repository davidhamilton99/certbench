# CertBench video factory

Programmatic TikTok / YouTube Shorts / Reels quiz videos rendered straight
from the CertBench question bank with [Remotion](https://www.remotion.dev).
Every video is a ~27s branded quiz: hook → question → 5-second countdown →
answer reveal with explanation → `certbench.dev` CTA. 1080×1920, 30fps.

Remotion is free for individuals and companies with up to 3 people.

## One-time setup

```bash
cd video
npm install
```

## The weekly batch (Sunday, ~20 min mostly unattended)

```bash
# 1. Pull 10 fresh video-friendly questions (never repeats one)
npm run fetch -- security-plus-sy0-701 10

# 2. Render them all to out/*.mp4 (a minute or three each — go do something else)
npm run render
```

Cert slugs: `security-plus-sy0-701`, `network-plus-n10-009`,
`a-plus-core1-220-1101`, `a-plus-core2-220-1102`.

## Preview / tweak the design

```bash
npm run studio
```

opens the Remotion Studio in the browser with a live-editable preview.

## Posting workflow (per video, ~2 min)

1. Upload the MP4 to TikTok (and the same file to YouTube Shorts + Instagram
   Reels — same aspect ratio everywhere).
2. **Add a trending sound in the app** — the videos are rendered silent on
   purpose; native sounds boost distribution and licensed music can't be
   baked into files anyway.
3. Caption formula: a hook + the answer tease + 2–3 hashtags. Example:
   > 80% get this one wrong. Could you pass Security+? 🔗 free readiness
   > check in bio — #comptia #securityplus #cybersecurity
4. Put `certbench.dev/readiness-check/security-plus-sy0-701` in the bio link.
5. Reply to comments arguing about the answer — that's the algorithm fuel.

Post one per day. Consistency beats production value.

## Notes

- Questions are filtered for on-screen readability (≤220-char question,
  ≤80-char options, ≤220-char explanation, 3–4 options).
- `data/used-ids.json` is the no-repeat ledger — commit it so batches stay
  unique across machines. Delete it to reset.
- These are template/graphics videos, not realistic synthetic media, so
  TikTok's AI-content labelling rules don't apply to them.
