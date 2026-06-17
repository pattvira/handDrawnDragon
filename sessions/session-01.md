# Session 01 — Scaffold, Input Engine & Particle Body Iteration

---

session: 01
dates: 2026-06-15
model: Claude Sonnet 4.6
stack: Vite + React + Three.js (@react-three/fiber, @react-three/drei)
status: Complete — particle system working, aesthetic direction still open

---

## What we were trying to build

A mobile-first interactive generative toy called **Project Noni Dragon**. The user draws a path with their finger, and a volumetric particle body — inspired by the fluffy, clustered aesthetic of Project Noni — follows that path like a living dragon.

Step 1 goal: get the input engine working (touch → 3D spline).
Step 2 goal: replace the debug line with a real particle body.

---

## What we actually built

### Step 1 — Input Engine ✓

- Vite + React + Three.js project scaffolded with mobile-first viewport (`touch-action: none`, `user-scalable=no`, `viewport-fit=cover`, no scroll)
- `useInputSpine` hook: normalizes touch and mouse events → unprojects 2D screen coordinates to 3D world space via raycasting against the z=0 plane → feeds a rolling 60-point window into a `CatmullRomCurve3`
- Distance threshold prevents near-duplicate points that cause spline artifacts
- Debug line rendered the live spline path, confirming the math worked

**Bug found and fixed:** `pointsRef.current = []` on mousedown replaced the array reference, breaking the `useFrame` closure. Fixed with `pointsRef.current.length = 0` to mutate in place.

### Step 2 — Particle Body (iterated 4 times)

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
- Result: visually interesting but not what the user had in mind. Useful as proof-of-concept for animation mechanics.

**Iteration 4 — Travel + perpendicular oscillation on hand-drawn path**

Reference provided: a 2D canvas snippet — 300 particles at fixed positions along a straight axis, oscillating perpendicularly in a Lissajous figure-8 pattern. User's intent: combine that oscillation with forward travel along the drawn path.

How it works:

- 300 particles, each with a fixed `phase` (evenly staggered 0→1)
- Per frame: `pathT = (phase + time × TRAVEL_SPEED) % 1` — particle moves forward along the curve
- At `pathT`: `curve.getPointAt()` for position, `curve.getTangentAt()` for direction
- In-plane normal: rotate tangent 90° → `(-tangent.y, tangent.x, 0)`
- Displacement: `pos + normal × AMP_PERP × sin(oscPhase) + tangent × AMP_ALONG × sin(2 × oscPhase)`
- `oscPhase` explored in two forms: staggered per-particle (traveling sine-wave ribbon) and unified (whole body swings as one)

Result: both variations work technically. Neither matches the target aesthetic. The sine-wave ribbon is too structured; the unified swing is too mechanical. The organic clustered feel from the Noni reference hasn't been reached.

**Current state:** `PARTICLE_COUNT = 50`, `meshBasicMaterial color="hotpink"`, `DebugLine` still in scene as diagnostic scaffolding.

### Debugging — Black screen + cannot draw

Two rendering bugs consumed most of the second work block before any creative iteration.

**Black screen:**

- Switching to `meshBasicMaterial vertexColors` without pre-initializing `instanceColor` caused Three.js to compile the shader without vertex color support — subsequent `setColorAt` calls silently ignored
- Root issue: R3F v9 starts its render loop in a `useLayoutEffect` (Canvas level), which fires before Swarm's `useEffect` — color seeding was happening after the shader was already compiled

**Cannot draw:**

- R3F v9 connects its event manager to the canvas container, which can shadow direct `gl.domElement` listeners
- Fix: split event attachment — `mousedown`/`touchstart` on `gl.domElement`, `mousemove`/`mouseup` on `window` (standard drag pattern)

**The diagnostic that unlocked both:**
Added a `DebugLine` component alongside `Swarm` — same `pointsRef`, same `useFrame`, but draws a white line. White line appeared → input confirmed working → problem isolated to Swarm's rendering alone. Then stripped to `meshBasicMaterial color="hotpink"` → pink spheres appeared → problem isolated to color initialization timing specifically.

---

## Where the process broke down

### 1. The vision lived in the user's head, not in shared artifacts

The references provided — a static image, a transcript of someone else's technique breakdown, a frozen video frame, a 2D canvas snippet — all required interpretation. Each was a partial signal, not a clear spec.

### 2. Code written before concept was fully confirmed

Multiple times: partial description → "yes go ahead" → implementation → "not what I wanted." One confirmation round before each coding step would have been cheaper than rewriting.

### 3. Key terms weren't defined early enough

"Rings traveling up and down," "normal to the line," "like a dragon" meant specific things to the user that were interpreted differently each time.

### 4. Visual/motion intent is fundamentally harder to specify than engineering intent

"Add a login button" has one answer. "Make it feel like a dragon" has infinite wrong answers.

### 5. Debugging and creative exploration were mixed in the same session

Two rendering bugs (black screen, cannot draw) consumed the creative budget for the second block. The better sequence: fix the foundation, confirm it works with a known visual, end session. Start fresh with clean foundation and creative focus.

### 6. The reference was misread on first pass

The 2D canvas snippet showed particles oscillating at fixed positions. First interpretation was "particles follow a Lissajous path." Correct read was "particles are anchored and wiggle perpendicularly." Extra exchange needed before a clean spec could be written.

---

## What worked well

- **Technical architecture discussions** landed correctly on the first pass — Frenet frames vs. Gaussian scatter, InstancedMesh single draw-call, rolling window design.
- **The DebugLine diagnostic** was the single most productive thing in the second block. One small component eliminated half the problem space in one draw gesture. Layered debugging (input → rendering → color) is the right approach.
- **The user's spatial intuition** was strong — catching the stale closure bug, correctly identifying that the Noni dragon uses fixed normals rather than randomness.
- **Session-as-documentation** instinct: recognizing that the back-and-forth itself is content worth capturing.

---

## Key lessons

> A 3-second video clip of the exact motion you want removes more ambiguity than 3 paragraphs of description.

> Debugging and creative exploration are different modes. When you hit a bug during a creative session, fix the foundation first — confirm it works with a known visual — then switch back to creative mode. Don't try to do both at once.

> For generative art, the math is the creative act. If AI writes the motion model, the parameter logic, the geometric relationships — you've delegated the part that was actually interesting. The output will feel mediocre not because AI is bad at code, but because you can only describe something you've already understood. AI builds what you can specify; the thing you actually want lives just past what you can specify yet.

For generative art and animation work: before writing any code, separate the target into three questions:

- **Path** — where does the body exist in space?
- **Motion** — what animates? The path? Individual particles? The whole body?
- **Look** — what do individual particles look like and how do they relate to each other?

---

## Proposed workflow for next sessions

Instead of:

> describe vision → AI codes → user reacts → correction → AI recodes

Try:

> describe vision → AI describes back in technical terms → user corrects the description → then AI codes

One confirmation step before implementation, every time.

---

## What changes next session

- [ ] Resolve `instanceColor` initialization properly (ref-callback or `useLayoutEffect`) so vertex colors work
- [ ] Remove `DebugLine` once confirmed — it's diagnostic scaffolding, not a feature
- [ ] Find or record a short video of the exact body motion the dragon should have — not a still image, not a description
- [ ] Decide on `oscPhase` equation before writing code — this is a creative decision
- [ ] Set particle count and sphere size before adding color — shape first, then color
- [ ] Spend time in p5.js sketching the motion before opening a coding session

---

## Working Principles for Creatives Using AI

### 1. You're already using a harness

Claude Code in the terminal + VSCode is a harness — a project management layer on top of a raw AI model. Conductor (the tool in the video) is just a more visual harness with worktrees and PR buttons built in. The underlying model is the same. Understanding this: the harness is the workspace, not the intelligence. You can add structure (git, worktrees, stage separation) to your current setup without switching tools.

### 2. Separate your stages

Planning, thinking, experimenting, and coding are different cognitive modes. Mixing them in one session creates context-switching cost and inflates token usage.

| Stage             | What it is                           | Tool                                       |
| ----------------- | ------------------------------------ | ------------------------------------------ |
| **Thinking**      | What do I want? Vocabulary alignment | Text conversation — Haiku or Opus, no code |
| **Experimenting** | Does this motion feel right?         | p5.js, Shadertoy — outside Claude entirely |
| **Planning**      | How should this be built?            | Claude Code, plan mode, no edits yet       |
| **Coding**        | Build it                             | Claude Code with Sonnet                    |

The stage most missing from these sessions: **Experimenting** — a cheap visual scratchpad before the coding session starts. A 20-line p5 sketch of the target motion before session 01 would have collapsed most of the iteration.

### 3. Delegate execution, keep creative decisions

The core skill isn't prompting technique. It's knowing which decisions belong to you and which you can safely delegate. Delegating execution works — "implement this equation," "add this event listener pattern." Delegating creative decisions generates iteration cost — "make it feel like a dragon," "make the motion organic." When that boundary blurs, output requires correction, and correction costs tokens and creative energy.

For generative art specifically, the split is sharper: **you write the math, AI writes the plumbing.** The motion equation, the oscillation phase, the geometric relationships — those are the creative act. If you hand those to AI because you haven't figured them out yet, you'll get something technically correct and aesthetically mediocre. Figure out the math yourself first (in p5.js, on paper, in your head), then delegate the Three.js wiring.

### 4. Exhaust cheap tools before opening Claude

For visual/motion work, get something reacting on screen before spending tokens:

- **p5.js editor** (browser, free) — sketch motion ideas in 20 lines
- **Shadertoy** — GPU effects, free, no setup
- **Pen and paper** — draw the motion with arrows

A rough p5 sketch that moves wrong tells you more about what you want than describing it in words.

### 5. Use the cheapest model for the phase you're in

| Phase                               | Model         | Why                               |
| ----------------------------------- | ------------- | --------------------------------- |
| Brainstorming, vocabulary alignment | Haiku         | Fast, cheap, good enough for text |
| Visual/motion exploration           | p5, Shadertoy | Free, instant feedback            |
| Actual implementation               | Sonnet        | Reasoning + code quality          |
| Architecture decisions              | Opus          | Complex tradeoffs                 |

Switch models inside Claude Code with `/model`. A session where no code is written costs almost nothing even on Sonnet. Code output is what's expensive.

### 6. Budget explicitly for exploration

Some sessions are sketchbook sessions — exploratory, disposable, not meant to ship. Budget for them separately. After the budget runs out, document what happened and stop — even if nothing is working. A documented failed session is often more valuable than the code from a successful one.

---

## Cost & Model

|                                |                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model**                      | Claude Sonnet 4.6                                                                                                                                          |
| **Pricing**                    | Input $3 / 1M tokens · Output $15 / 1M tokens                                                                                                              |
| **Cost driver**                | 4 full rewrites of `App.jsx` + two debugging loops (black screen, cannot draw) + long exploratory discussion before aesthetic direction was clear          |
| **What made it expensive**     | Output tokens are 5× input cost — every rewrite is billed at the higher rate. Debugging without isolating the layer first. Iteration without a clear spec. |
| **How to reduce next session** | Use `/compact` mid-session · Lock aesthetic direction in p5 before writing Three.js · One goal per session · Confirm foundation works before creative work |

---

## Open questions

- What is the actual motion the dragon's body should have? (needs video reference, not description)
- What is the correct `oscPhase` equation — staggered wave, unified swing, or something else?
- Should particles have random color (palette) or a gradient tied to position or time?
- `instanceColor` initialization: ref-callback pattern or `useLayoutEffect`?
- Sphere count and size: 50 at 0.07 radius feels sparse — what density looks right?
- Is the `DebugLine` useful to keep as a permanent low-opacity guide?
