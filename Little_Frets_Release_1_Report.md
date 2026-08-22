# Little Frets Release 1: The Focused Practice & Teacher Nudge Foundation

**Status:** Published to `main` in [commit `1dbb9a6`](https://github.com/barryconley85-crypto/little-frets-companion-app/commit/1dbb9a6) and follow-up [commit `3792171`](https://github.com/barryconley85-crypto/little-frets-companion-app/commit/3792171). The connected Supabase project has received the matching `growth_loop_foundations` migration.

> **Release promise:** A learner should always know the one right thing to practise next, and a teacher should have a quick, meaningful route to respond to evidence of that practice.

## What is now in place

| Area | Delivered change | Why it matters |
|---|---|---|
| **Focused practice mission** | Teachers can add a mission, completion criterion, next check-in, and focused-practice duration to an assignment. | It turns an abstract task into a small, achievable action with a clear finish line. |
| **Learner-facing clarity** | Learners see the mission, “you’re done when” criterion, next check-in, and focus target directly above recording. | It reduces uncertainty at the exact moment a learner decides whether to practise. |
| **Practice reflection** | Before saving a take, learners can give a 1–5 confidence check and note what they noticed. | It gives teachers context and develops the learner’s own practice awareness. |
| **Teacher Nudge Loop** | Per-learner history now includes a practice-takes section with playback, learner reflection, confidence, feedback, next action, and outcomes: `needs review`, `try again`, `ready`, or `discuss live`. | It closes the previously one-way recording loop and gives each take a human next step. |
| **Learner feedback visibility** | Teacher feedback and next action appear in the learner’s library. | A submitted take can now lead to a reason to return, rather than disappearing into an archive. |
| **Confirmation onboarding** | Sign-up sends name and requested role as Auth metadata; the database trigger reliably creates the matching profile after confirmation. The user interface now visibly confirms that an email has been sent. | It corrects the observed role-assignment race after email-confirmed registration and removes the prior “nothing happened” experience. |
| **Actionable auth errors** | The raw email-rate-limit failure now becomes a clear retry message. | Learners and families receive a humane explanation instead of provider jargon. |
| **Storage access control** | Task and practice media are restricted by real teacher–learner relationships rather than a broad role check. | It materially improves privacy for recordings and lesson media. |
| **Request review reliability** | Marking a song request reviewed now awaits persistence, updates only after success, and shows an explicit error if the update fails. | It resolves the live-tested silent-failure pattern in the original request-review control. |
| **Quality baseline** | The explicit `any` lint failures were fixed. The repository now passes its configured lint, type-check, production build, and whitespace checks. | The first release begins from a repeatable engineering baseline. |

## Live validation performed

| Journey | Result |
|---|---|
| Teacher creates a learner and direct assignment | **Passed.** The assignment appeared in teacher history and the learner task view. |
| Learner submits a song request | **Passed.** The learner received confirmation and a pending request appeared in the teacher inbox. |
| Original request-review control | **Failed during live test.** It remained pending without an error; the published follow-up makes persistence observable and handles failures. |
| Teacher edits a focused-practice mission | **Passed.** The mission, completion criterion, next check-in, and 10-minute focus target saved successfully. |
| Learner views focused-practice mission | **Passed.** All four fields were visible in the live learner task view. |
| Teacher review surface | **Passed.** The deployed history view shows the new “Practice takes” section and its empty state. |
| Microphone capture and submitted teacher nudge | **Partially validated.** The sandbox cannot provide a real microphone take, so this last media-capture step remains for a device-based QA pass. The schema, upload/read policies, UI, and production build were validated. |
| Disposable test-data cleanup | **Passed.** The labelled test learner, task, request, and authentication account were removed; a final scoped account check returned no remaining test addresses. |

## Why this is the right product direction

Little Frets should not try to win by becoming another generic practice timer, content library, or automated note detector. Broad practice platforms already market assignment management, logs, charts, messaging, family visibility, and rewards. [2] Guitar-focused platforms already market automatic pitch/rhythm/tempo feedback, assignments, content libraries, and utility tools. [3]

The differentiator is the **between-lesson relationship**: a small, teacher-authored mission; a real learner take; a short learner reflection; and a quick, kind, specific teacher nudge. This direction is aligned with music-learning research that distinguishes clarity of goal, evidence of progress, and feed-forward next steps—and particularly values feedback that builds self-regulation rather than generic praise. [1]

## The next two releases

| Release | Product objective | Highest-value capabilities |
|---|---|---|
| **Release 2 — Review Inbox** | Make teacher follow-up fast enough to become routine. | A teacher-wide queue sorted by `needs review`; 30-second feedback templates; notification badges; automated reminders for old takes; request-to-assignment conversion. |
| **Release 3 — Guitar Growth Passport** | Make progress emotionally visible and unique to the school. | Private skill journeys for chords, rhythm, riffs, songs, and performance; before/after takes; selected teacher celebrations; learner milestones; optional family progress snapshots. |

The **Guitar Growth Passport** is the long-term hook. It should show a learner’s own musical history—first clean chord change, first steady groove, first full riff, first complete section, first performance-ready take—rather than a generic leaderboard. It creates a strong reason to keep coming back because practice becomes a story of personal growth, not a streak counter.

## Launch measurement

| Metric | What it tells you | Healthy direction |
|---|---|---|
| Mission acceptance rate | Whether learners understand their next action. | More learners opening and starting an assigned mission. |
| Takes per active learner per week | Whether Little Frets is turning lesson advice into practice evidence. | Steady growth without pressure tactics. |
| Median teacher-review time | Whether the nudge loop is realistically sustainable for the school. | Shorter, with quality maintained. |
| Feedback-to-retry rate | Whether a nudge leads to productive action. | Learners submit a follow-up take after `try again`. |
| Four-week active learner retention | Whether the product is becoming part of the school rhythm. | Improvement after the mission and feedback loop is adopted. |
| Growth Passport milestone completion | Whether visible progress is motivating real musical development. | More meaningful milestones, not inflated badges. |

## References

[1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC12602492/ "Dos Santos Silva et al. (2025), Go home and practice: how shaping feedback to students can foster independent musicianship"
[2]: https://betterpracticeapp.com/ "Better Practice"
[3]: https://matchmysound.com/ "MatchMySound"
