# Project Noni Dragon — Dev Log

## What this is

A running record of building a generative art toy with AI as the primary coding collaborator. Each session document captures not just what was built, but how the process went — what broke, what cost money, what required the human to make a judgment call, and what the AI got wrong on its own.

The goal is not a polished tutorial. It's an honest account of what this way of working actually feels like.

---

## Why document it this way

Most "AI helped me code" content shows the happy path: prompt → working result → ship. That's not what it feels like in practice, especially for creative work where the target is a feeling rather than a spec.

This log documents the full picture:
- Sessions where most of the time went to debugging, not creating
- Moments where the AI confidently built the wrong thing
- The frustration of knowing what you want but not being able to say it in a way the model understands
- The cost — in tokens, in time, in creative energy — of iterating without a clear target
- The moments where the collaboration actually worked

The intended reader is someone considering this way of working, or already doing it and wondering why it's harder than it looks.

---

## The central tension

Creative work involves discovering what you want by reacting to things. Engineering work involves specifying what you want before building it. AI coding tools are designed for the second mode. This project lives in the first.

The friction shows up constantly: the AI wants a spec, the creative wants to see something and react. Neither is wrong — they're optimizing for different things. Learning to use AI well for creative work means building a bridge between those two modes, not pretending the tension doesn't exist.

**What "losing control" means here:**
When you use AI to write code, you are not writing the code. You are directing someone else who writes it faster than you could, makes different assumptions than you would, and sometimes produces something you didn't ask for that's actually better — or worse. That's a real shift. Some parts of it are good (speed, breadth, no ego about rewrites). Some parts are uncomfortable (the code doesn't feel like yours, the bugs are opaque, the model's instincts are different from yours).

**The boundary that matters:**
The core skill isn't prompting technique. It's knowing *which decisions belong to you* and *which you can safely delegate*. Delegating execution works — "implement this oscPhase equation," "add event listeners with this pattern." Delegating creative decisions generates iteration cost — "make it feel like a dragon," "make the motion organic." When that boundary blurs, you get output that requires correction, and correction costs tokens, time, and creative energy.

Skilled AI-assisted designers have internalized this boundary through experience. This log documents the process of finding it in real time — which is more useful than watching someone who already has it dialed in.

This log tracks where that tension appeared, and what it cost.

---

## Experimentation limits

Every session should have an explicit budget:
- **Time budget:** How long before this session ends regardless of where things are
- **Iteration budget:** How many rewrites of the same component before stopping and reconsidering the approach
- **Cost budget:** Roughly how many tokens/dollars before switching to a cheaper model or stopping

When the budget runs out, the session ends and gets documented — even if nothing is working. The documentation of a failed session is often more valuable than the code from a successful one.

**Heuristic:** If the same component has been rewritten 3 times without landing, that's a signal the *spec* is wrong, not the code. Stop coding. Write down what you actually want.

---

## What frustration means in this context

Frustration during AI-assisted creative coding usually comes from one of four places:

1. **The model built the wrong thing** — because the description was ambiguous, or the model made a wrong assumption. Fix: better description, or explicit confirmation step before coding.

2. **The model built the right thing but it still doesn't feel right** — because the aesthetic target wasn't clear enough to specify. Fix: cheaper exploration tools (p5, Shadertoy, pen and paper) before the coding session.

3. **Something broke that was working before** — a dependency update, a framework behavior change, a version mismatch. Fix: diagnostic decomposition (isolate layers, confirm each one before moving on).

4. **The target moved** — you reacted to something and realized you want something different. Fix: update the spec, document what changed and why, don't pretend the old spec was always wrong.

Knowing which category the frustration is in changes what you do next. Frustration without a category just becomes noise.

---

## Cost transparency

Every session note includes a cost section. This isn't about money exactly — it's about understanding what makes AI coding expensive so you can make better decisions about when to use it.

The main cost driver is output tokens. The model charging you $15/1M output tokens means that every line of code generated costs more than every line of explanation. Long debugging loops (try → still broken → try again) are expensive because each round generates output without resolving the problem. Rewrites are expensive. Exploration without a clear target is expensive.

Things that reduce cost:
- Locking the aesthetic direction before writing code
- Using cheaper models for text-only alignment sessions
- Stopping earlier when iteration isn't converging
- `/compact` to compress conversation history mid-session

Things that don't reduce cost as much as you'd think:
- Writing shorter prompts (context window cost is input tokens, which are cheap)
- Skipping the "describe back" confirmation step (saves 1,000 tokens, costs 10,000 if the build is wrong)

---

## Session format

Each session file follows this structure:

```
# Session NN — [short title]

---
session: NN
date: YYYY-MM-DD
model: [model name]
stack: [tech stack]
status: [working / in progress / stalled]
---

## What we were trying to build
[1–2 paragraphs. The goal at the start of the session.]

## What we actually built
[Subsections for each major thing attempted. Include bugs found and fixed.]

## Where the process broke down
[Numbered list. Be specific about what caused each breakdown.]

## What worked well
[Short list. Include things that worked even if the session overall didn't.]

## Key lesson
[One pull quote. The single most transferable thing from this session.]

## What changes next session
[Checkbox list of concrete next steps.]

## Cost & Model
[Table. Model, pricing, cost driver, what made it expensive, how to reduce.]

## Open questions
[Bulleted list of unresolved decisions — creative, technical, or both.]
```

**Rules for writing session notes:**
- Write them at the end of the session, not during
- Include wrong turns — they're more useful than the right answers
- If a session was mostly debugging, say so. Don't reframe it as "we made progress on the foundation."
- Cost section is mandatory. Even a rough estimate.
- Open questions should be real questions, not rhetorical ones. If you know the answer, it's not an open question.

---

## What this log is not

- A tutorial ("here's how to build X")
- A polished retrospective ("we made some mistakes but learned a lot")
- A product diary ("here's what shipped")

It's a process document. The process is messy. That's the point.
