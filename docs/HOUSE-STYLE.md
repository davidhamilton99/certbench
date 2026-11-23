# House style

These rules apply to every word that a visitor or a member can read: pages, buttons, labels, error messages, emails, the text that the structured data and `public/llms.txt` give to search engines and AI assistants, and the documents in this repository. A test holds most of them (see the last section).

## Sentences

- Write complete, formal sentences. A button, a table heading or a form label may be a short label, and a list may be a sentence that introduces it followed by noun phrases.
- Use sentence case for every heading, title, button and label. Proper names and abbreviations keep their own capitals (CompTIA, Security+, OSI model). One exception remains for now: the titles of the hands-on labs in `src/data/pbq` are still in title case.
- Use American spelling (practice as a verb, program, authorization, color).
- Use no contractions.
- Use no dash as punctuation between words: no em dash, no horizontal bar and no en dash with a space on each side. An aside takes commas or parentheses, and an explanation takes a colon or a new sentence. An en dash between the two figures of a range is allowed.
- Do not join fragments with a middle dot or a bullet between them. Write a sentence.
- Use no emoji, no slang and no exclamation mark.
- Write "and", never an ampersand in its place.
- Write no "e.g." and no ellipsis.
- Underline a link that sits inside a sentence (the `cb-link` class), so that it is not told apart by color alone.

## Vocabulary

The interface uses one word for each thing.

- Write "study path", never "path" alone or "guided path".
- Write "step", not "stop".
- Write "introductory questions", not "warm-up".
- Write "practice exam", not "rehearsal". Write "practice test" only in the page titles and headings that search needs.
- Write "readiness target" for the score that a learner works toward.
- Write "course outline" for the list of an exam's domains and objectives on the study path's home.
- Write "hands-on lab". PBQ, a performance-based question, is CompTIA's name for the task on the exam itself.
- Write "Choose", not "Pick" or "Select".
- Write "Sign in", not "Log in".
- After an answer, the verdict reads "Correct." or "Incorrect. The correct answer is X.", and the button that moves on reads "Continue".

## Visible words, identifiers and analytics names

The code and the analytics kept the names they had before the words on the screen changed. This table gives, for each visible word, the name it has in the code and the names of its analytics events.

Analytics names are frozen. Never rename an event or one of its properties, even where the visible word has changed: a renamed event starts a new history, and every funnel and chart built on the old name stops counting. This holds for the browser's events (`src/lib/analytics.ts`) and for the events that the server sends through `captureServerEvent` and `capturePurchase` (`src/server/analytics.ts`). Identifiers keep their old names too, because some of them are stored: a step's id, such as warmup or checkpoint, is the key under which a learner's saved progress records that step.

| Visible word | Identifier in the code | Analytics name |
| --- | --- | --- |
| study path | `PathApp`, `PATH_CERTS` | `path_started`, `path_exam_picked`, `path_save_viewed`, `path_account_linked` |
| step | `stop`, `PathStop`, `StopKind`, `buildStop`, `MINUTES_PER_STOP` | `path_stop_completed` |
| introductory questions | `warmup` (a `StopKind`, and each exam's `warmup` entry in src/data/path) | `path_stop_completed`, sent with the kind warmup |
| readiness checkpoint | `checkpoint` (a `StopKind`), `LEARN_BEFORE_CHECKPOINT` | `path_checkpoint_completed` |
| practice exam, on the study path | `rehearsal` (a `StopKind`), `RehearsalPlayer`, `REHEARSAL_FORMATS` | `path_rehearsal_started`, `path_rehearsal_completed` |
| practice exam, on a public page | `PracticeExam` | `practice_test_started`, `practice_test_completed`, `practice_test_gate_viewed`, `practice_test_account_linked` |
| review of missed questions | `review` (a `StopKind`) | `path_review_started` |
| course outline | `ExamMap` | `path_map_tile_opened`, `path_map_action` |
| hands-on lab | `pbq`, `lab` (a `StopKind`), `PbqPlayer`, `pbqRegistry`, `LabLibrary` | `pbq_started`, `pbq_first_move`, `pbq_gate_viewed`, `pbq_account_linked`, `path_lab_started`, `path_lab_completed`, `path_labs_viewed`, `sim_stage_cleared` |
| readiness target | `READINESS_TARGET` | None |
| Choose, for an exam | `ExamPicker` | `path_exam_picked` |
| Sign in | `LoginForm`, `login` | `google_signin_clicked`, `google_signin_cancelled` |
| the offer of CertBench Pro | `PathOffer` | `path_offer_viewed`, `path_offer_clicked` |

## What a sentence may claim

- State only what the product does today. Never invent a fact, a number, a date, a testimonial or a feature. A fact about CompTIA, an exam or a competitor is printed only once it has been read at its source.
- The prices of Pro are worded once, in `src/lib/pricing/terms.ts`. No other file types one of their figures.
- Counts come from the product's own constants (`src/core/path/plan.ts`, `src/core/path/free-labs.ts`, `src/core/path/rehearsal.ts`) or from the question bank. None is typed by hand.

## Motion

Things move only in answer to a press. An entrance moves a few pixels and never starts from opacity 0 or scale 0, because session replays freeze at the first frame. Animate only transform and opacity, never width or height, and never use `transition-all`. Nothing animates on a key press or in the question loop. Scores and bars are drawn at their final value in the markup.

## Color

Use the design tokens in `src/app/globals.css`, never a raw hex value or a Tailwind palette color such as `amber-300` in a component. Green, amber and red mark answers and scores; they never decorate or sell. One color means "press this": `primary`.

## Comments in code

A comment in code is a plain sentence that says why the code is as it is. New comments follow the rules for visible text, dashes included, although the test below does not read comments.

## How the rules are checked

- `src/lib/seo/__tests__/house-style.test.ts` reads every string, template and piece of JSX text under `src`, and `public/llms.txt`. It fails on a dash between words, on fragments joined by a middle dot or a bullet, on a retired word in the interface ("Log in", "Pick", "guided path", "warm-up", "rehearsal"), on a link inside a sentence that is not underlined, and on a price of Pro typed outside `src/lib/pricing`.
- Text from the question bank is set in house style as it is loaded, without changing the database: `repairText` in `src/core/path/text.ts` applies American spelling and removes dashes between words.
- `src/__tests__/repository-docs.test.ts` holds the README, this document and the section on builds in `docs/ARCHITECTURE.md` to the rules on dashes, fragments and contractions, and checks that every identifier and analytics name in the table above exists in the code.
