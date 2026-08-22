# Little Frets Product North Star

## The promise

> **Little Frets makes every learner feel seen between lessons.**

Little Frets should become the place where a guitar lesson continues after the learner leaves the room. It should not compete as a generic video library, a generic practice timer, or a harsh automated grader. Its defensible value is a warm, guitar-specific coaching loop that gives every learner one clear next move, lets them show a small piece of real effort, and brings a teacher’s encouragement back before motivation disappears.

The product should be judged by one question: **“After opening Little Frets, does the learner know exactly what to do next—and does the teacher know exactly how to help?”**

## The signature loop: Mission → Take → Reflect → Nudge → Grow

| Moment | Learner experience | Teacher experience | Product value |
|---|---|---|---|
| **Mission** | Receives a small, specific practice mission with a clear finish line: e.g., “Play the A-minor groove at 70 BPM, then record a 30-second take.” | Assigns a reusable guitar-focused mission with materials, target, expected time, and next-lesson date. | Replaces vague “practise this” instructions with an achievable action. |
| **Take** | Records a short attempt, sees optional supportive signals, and chooses the take to send. | Receives a compact review queue rather than an unstructured archive of recordings. | Converts practice into visible evidence without making it intimidating. |
| **Reflect** | Answers a tiny self-coaching prompt: “What felt easiest?” and “What should I try next?” | Sees the learner’s confidence and self-identified challenge before responding. | Builds self-regulation and lets feedback feel personal. |
| **Nudge** | Receives a concise, kind next-step note, ideally anchored to a moment in the recording. | Adds one strength, one precise next step, and an outcome: retry, ready for next lesson, or discuss live. | Gives the learner a meaningful reason to return between lessons. |
| **Grow** | Sees a simple “then vs. now” story for a riff, song, or skill—not merely a streak. | Sees learners needing attention, recent wins, and progress through a skill pathway. | Makes effort feel cumulative and gives families a credible progress story. |

The loop is grounded in music-learning research that distinguishes goal clarity, progress feedback, and next-step feedback. The research particularly emphasizes feedback that develops self-regulation, rather than vague praise or retrospective task comments alone. [1]

## The differentiator: a human-centred Guitar Growth Passport

The long-term signature feature should be a **Guitar Growth Passport**. It is not a gamified leaderboard. It is a private, visual progression map that captures the learner’s own music: first clean chord change, first steady groove, first complete riff, first song section, first performance-ready take. Each milestone is supported by a teacher-created micro-mission and may include a selected recording, a short teacher note, a learner reflection, and an optional family-facing celebration.

This differs from competitor-led offerings. Broad practice systems already advertise assignment management, logs, charts, chat, rewards, family visibility, and adaptive assistance. [2] Guitar-focused platforms already offer automatic pitch/rhythm/tempo feedback, assignment creation, content libraries, progress monitoring, and utility tools such as looping and metronomes. [3] Little Frets should therefore win by connecting **the school’s own teaching relationship** to the learner’s visible, emotional story of growth.

## What the first meaningful release must include

The first release should not attempt to build every long-term capability. It needs to make the core loop real and reliable.

| Priority | Capability | Why it comes first |
|---|---|---|
| **P0** | Reliable role onboarding and relationship-scoped access | A new teacher must become a teacher after confirmation, and private learner media must not be accessible merely because another user has the same broad role. |
| **P0** | Teacher recording review with written next-step feedback | This closes the current one-way recording loop and immediately makes student practice feel noticed. |
| **P1** | Learner reflection and confidence check-in on each submission | It gives teachers useful context and teaches learners to think about their own practice. |
| **P1** | Review Inbox with `Needs review`, `Retry`, `Ready`, and `Discuss live` states | It makes teacher follow-up quick enough to become a habit. |
| **P1** | Mission structure: goal, due/next-lesson date, estimated time, and one success criterion | It turns “homework” into focused deliberate practice. |
| **P2** | Guitar Growth Passport and micro-mission templates | This becomes the retention hook once the feedback loop generates real progress history. |
| **P2** | Target-aware feedback and smart practice tools | Add only after missions capture the musical target, rather than scoring arbitrary detected notes. |

## Design principles

Little Frets should feel like an excellent guitar teacher’s notebook, not like school software. The tone should stay calm, specific, musical, and encouraging. Every screen should end in one obvious action. A learner should never be confronted with an empty dashboard after completing a task; they should see either a teacher nudge, the next mission, or a small piece of visible growth.

Automated feedback must be transparent and subordinate to human teaching. In the short term it should be described as a gentle recording signal, not as a score for musical quality. When enough task metadata exists, it can become target-aware and more useful; before then, the strongest advantage is a teacher’s short, timely, actionable response.

## First implementation objective

The implementation work should immediately establish the **Teacher Review Loop**: learner recording → teacher playback → teacher note and outcome → learner sees the nudge in their library. Alongside it, the product must repair email-confirmation role assignment, harden authorization, fix the tested request-review defect, and restore automated checks. This creates the platform from which the Growth Passport and adaptive missions can be built.

## References

[1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC12602492/ "Dos Santos Silva et al. (2025), Go home and practice: how shaping feedback to students can foster independent musicianship"
[2]: https://betterpracticeapp.com/ "Better Practice"
[3]: https://matchmysound.com/ "MatchMySound"
