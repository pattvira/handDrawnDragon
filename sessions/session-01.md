# Session 01 — Scaffold, Input Engine & First Aesthetic Iteration

---
session: 01
date: 2026-06-15
model: Claude Sonnet 4.6
stack: Vite + React + Three.js (@react-three/fiber, @react-three/drei)
status: In progress — aesthetic direction not yet landed
---

## What we were trying to build

A mobile-first interactive generative toy called **Project Noni Dragon**. The user draws a path with their finger, and a volumetric particle body — inspired by the fluffy, clustered aesthetic of Project Noni — follows that path like a living dragon.

Week 1 goal: get the input engine working (touch → 3D spline).
Week 2 goal: replace the debug line with a real particle body.

---

## What we actually built

### Week 1 — Input Engine ✓
- Vite + React + Three.js project scaffolded with mobile-first viewport (`touch-action: none`, `user-scalable=no`, `viewport-fit=cover`, no scroll)
- `useInputSpine` hook: normalizes touch and mouse events → unprojects 2D screen coordinates to 3D world space via raycasting against the z=0 plane → feeds a rolling 60-point window into a `CatmullRomCurve3`
- Distance threshold prevents near-duplicate points that cause spline artifacts
- Debug line rendered the live spline path, confirming the math worked

**Bug found and fixed:** `pointsRef.current = []` on mousedown replaced the array reference, breaking the `useFrame` closure. Fixed with `pointsRef.current.length = 0` to mutate in place.

### Week 2 — Particle Body (iterated 3 times)

**Iteration 1 — Gaussian scatter**
- 800 `InstancedMesh` spheres with random Gaussian offsets (Box-Muller transform) around each spline point
- Problem: per-frame randomness caused all particles to shimmer/jitter constantly
- Fixed by pre-computing offsets once at mount — stable scatter shape
- Result: still felt random and unstructured. Not the right aesthetic.

**Iteration 2 — Frenet frame rings**
- Replaced Gaussian scatter with structured rings using `curve.computeFrenetFrames()`
- At each spine point, 10 particles placed in a perfect circle using `normal × cos(θ) + binormal × sin(θ)`
- 80 slices × 10 per ring = 800 particles total
- Added `MeshStandardMaterial` + directional light for per-sphere lighting
- Added head→tail color gradient (deep navy → pale sky blue) via HSL interpolation
- Result: clean tubular body that bends correctly with the curve. But this wasn't the aesthetic either.

**Iteration 3 — Fixed path + sine animation**
- Disconnected from hand drawing entirely, switched to a fixed closed oval path
- Pre-computed 500 Frenet frames at module load (zero per-frame cost)
- Rings travel continuously along the oval: `t = (i/SPINE_POINTS + time × SPEED) % 1`
- Sine wave pulses each ring's radius: `RING_RADIUS + sin(position × CYCLES - time × 3) × AMP`
- Result: visually interesting but not what the user had in mind. Useful as a proof-of-concept for the animation mechanics.

---

## Where the process broke down

### 1. The vision lived in the user's head, not in shared artifacts
The references provided — a static image of the Noni character, a transcript of someone else's technique breakdown, a frozen frame from an animation — all required interpretation. Each one was a partial signal, not a clear spec.

### 2. Code written before concept was fully confirmed
Multiple times the sequence was: partial description → "yes go ahead" → implementation → "not what I wanted." One extra confirmation round before each coding step would have been cheaper than rewriting.

### 3. Key terms weren't defined early enough
"Rings traveling up and down," "normal to the line," "like a dragon" meant specific things to the user that were interpreted differently each time. No shared vocabulary was established before building.

### 4. Visual/motion intent is fundamentally harder to specify than engineering intent
"Add a login button" has one answer. "Make it feel like a dragon" has infinite wrong answers. The more the target is kinesthetic or aesthetic, the more ambiguity lives in the gap between description and implementation.

### 5. The reference image was a video frame, not a static diagram
Image #4 (the debug screenshot with blue dots and lines) was a frozen frame from an animation. The motion was the meaning — looking at it as a static diagram led to a wrong interpretation of what was being shown.

---

## What worked well

- The **technical architecture discussions** were genuinely productive — Frenet frames vs. Gaussian scatter, InstancedMesh single draw-call, rolling window design. These landed correctly on the first pass.
- The user's **spatial intuition** was strong — catching the stale closure bug by noticing "it only updates on resize," and correctly identifying that the Noni dragon uses fixed normals rather than randomness.
- The **session-as-documentation** instinct: recognizing that the back-and-forth itself is content worth capturing.

---

## Key lesson

> A 3-second video clip of the exact motion you want removes more ambiguity than 3 paragraphs of description.

For generative art and animation work specifically: before writing any code, separate the target into three independent questions:
- **Path** — where does the body exist in space? Fixed? Hand-drawn? Procedural?
- **Motion** — what animates? The path? Individual particles? The whole body?
- **Look** — what do individual particles look like and how do they relate to each other?

Answering all three before coding starts would collapse most of the iteration.

---

## Proposed workflow for next sessions

Instead of:
> describe vision → AI codes → user reacts → correction → AI recodes

Try:
> describe vision → AI describes back in technical terms → user corrects the description → then AI codes

One confirmation step before implementation, every time.

---

## What changes next session

- [ ] User finds a video reference (or draws/describes) the exact motion they want — path shape, particle movement, animation behavior
- [ ] Define the three questions (path / motion / look) explicitly before touching code
- [ ] Decide: return to hand-drawn input path, or keep the fixed path as the animation base?
- [ ] Discuss bloom post-processing (conversation was cut off this session)
- [ ] Reconnect `useInputSpine` to the particle body once aesthetic direction is confirmed

## Working Principles for Creatives Using AI

The "confirm before coding" workflow works for engineers but can kill creative process. Creatives discover what they want by reacting to things, not by specifying upfront. The solution isn't to explore less — it's to explore in the right medium first.

### 1. Exhaust cheap tools before opening Claude
For visual/motion work, get something reacting on screen before spending tokens:
- **p5.js editor** (browser, free) — sketch motion ideas in 20 lines
- **Shadertoy** — GPU effects, free, no setup
- **CodePen** — quick throwaway experiments
- **Pen and paper** — draw the motion with arrows

A rough p5 sketch that moves wrong tells you more about what you want than describing it in words.

### 2. Use AI for translation, not invention
Bring a reference — video clip, rough sketch, even a broken p5 prototype — and ask AI to translate it into technical terms. Not "make something that feels like a dragon" but "here's what I made, now port this approach into Three.js." You own the creative direction. AI does the translation.

### 3. Use the cheapest model for the phase you're in

| Phase | Model | Why |
|---|---|---|
| Brainstorming, vocabulary alignment | Haiku | Cheapest, fast, good enough for text |
| "What would this look like if..." | Haiku | Throwaway experiments |
| Actual implementation | Sonnet | Reasoning + code quality |
| Architecture decisions | Opus | Complex tradeoffs |

A session where no code is written costs almost nothing even on Sonnet. Code output is what's expensive.

### 4. The vocabulary session
Before any coding session, spend 10 minutes doing text-only alignment:
> "I'm going to describe what I want. You describe back in technical terms what you'd build. No code yet."

Correct the description until it's accurate, then code. This costs ~1,000 tokens instead of ~10,000 from a rewrite cycle.

### 5. Budget explicitly for exploration
Accept that some sessions are sketchbook sessions — exploratory, disposable, not meant to ship. Budget for them separately. Something like: "I'll spend $X exploring before locking direction. After that, sessions are implementation only."

---

## Cost & Model

| | |
|---|---|
| **Model** | Claude Sonnet 4.6 |
| **Pricing** | Input $3 / 1M tokens · Output $15 / 1M tokens |
| **Cost driver this session** | 3 full rewrites of `App.jsx` + long exploratory discussion before aesthetic direction was clear |
| **What made it expensive** | Output tokens are 5× input — every rewrite is billed at the higher rate. Iteration without a clear spec is the main cost multiplier. |
| **How to reduce next session** | Use `/compact` mid-session to compress history · Lock aesthetic direction before writing code · One goal per session |

---

## Open questions

- What is the actual motion the dragon's body should have? Is it the rings pulsing radially? The whole body writhing? The path itself animated?
- Should the hand-drawn path define a static shape the dragon fills, or does the act of drawing define the direction the dragon travels?
- Bloom: additive glow on top of MeshStandardMaterial — how prominent?
- Color palette: is the navy→sky blue gradient the right direction, or something else?
