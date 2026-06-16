# Session 02 — Input Debugging & Motion Model Exploration

---
session: 02
date: 2026-06-15
model: Claude Sonnet 4.6
stack: Vite + React + Three.js (@react-three/fiber, @react-three/drei)
status: In progress — motion model partially working, aesthetic direction still open
---

## What we were trying to build

Reconnect the working input engine from Session 01 to a new particle body, using a 2D canvas snippet as the motion reference. The target: particles that travel forward along the hand-drawn path while also oscillating side-to-side — dragon-like body motion.

---

## What we actually built

### Debugging — Black screen + cannot draw

Session started with two consecutive failures before any creative work happened.

**Black screen:**
- First attempt used `meshBasicMaterial vertexColors` without pre-initializing `instanceColor`
- Three.js compiles the shader on the first WebGL render. If `instanceColor` doesn't exist at compile time, the shader has no vertex color support — subsequent `setColorAt` calls are silently ignored
- Fix attempted: seed colors in `useEffect`. But R3F v9 starts its animation loop in a `useLayoutEffect` (Canvas level), which may fire before Swarm's `useEffect` — making the timing unreliable
- Partial fix: switch back to `meshStandardMaterial vertexColors` with lights, which was the pattern that worked in Session 01

**Cannot draw:**
- After fixing the black screen, drawing produced nothing
- Diagnosis took several rounds because the problem was ambiguous — could be input not firing, or rendering not responding to input
- R3F v9 connects its event manager to the canvas container, which can shadow direct `gl.domElement` event listeners in certain configurations
- Fix: split event listeners — `mousedown`/`touchstart` on `gl.domElement` (canvas), `mousemove`/`mouseup` on `window`. This is the standard drag pattern and bypasses container-level interception

**The diagnostic that unlocked everything:**
Added a `DebugLine` component alongside `Swarm` — same `pointsRef`, same `useFrame`, but just draws a white `CatmullRomCurve3` line. White line appeared immediately on draw → confirmed input was working → problem was isolated to `Swarm`'s rendering alone.

Then stripped `Swarm` to `meshBasicMaterial color="hotpink"` (no vertex colors). Pink spheres appeared → confirmed `InstancedMesh` and matrix updates were working → problem was isolated to color initialization timing.

**Key diagnostic method:** Layer the problem. Test input separately from rendering. Test rendering separately from color. Each layer narrows the failure space by ~90%.

### Iteration 4 — Travel + perpendicular oscillation

**Reference provided:** A 2D canvas snippet with 300 particles, each at a fixed position on a straight axis, oscillating perpendicularly in a Lissajous figure-8 pattern. Colors from a 10-color palette, fixed at mount.

**What the user actually wanted:** Both travel AND oscillation — particles move forward along the drawn path while wiggling side-to-side. (The reference only had oscillation, no travel. The combination was the user's addition.)

**How it works:**
- 300 particles, each with a fixed `phase` (evenly staggered 0→1)
- Per frame: `pathT = (phase + time × TRAVEL_SPEED) % 1` — moves each particle forward
- At `pathT`: `curve.getPointAt()` for base position, `curve.getTangentAt()` for direction
- In-plane normal: rotate tangent 90° → `(-tangent.y, tangent.x, 0)`
- Displacement: `pos + normal × AMP_PERP × sin(oscPhase) + tangent × AMP_ALONG × sin(2 × oscPhase)`
- `oscPhase` explored in two forms:
  - `phase × 2π × OSC_CYCLES + time × OSC_SPEED` — staggered wave, each particle at different oscillation phase → produces a traveling sine-wave ribbon along the body
  - `time × OSC_SPEED` — all particles share the same phase → whole body swings as one unit

**Result:** Both variations work technically. Neither matches the target aesthetic. The sine-wave ribbon is too structured; the unified-swing version is too mechanical. The organic clustered feel from the Noni reference hasn't been reached.

**Current state:** `PARTICLE_COUNT = 50`, `meshBasicMaterial color="hotpink"`, `DebugLine` still in scene. The user reverted the oscPhase experiment and ended the session here to document.

---

## Where the process broke down

### 1. Debugging consumed most of the session
Two rendering bugs (black screen, cannot draw) came before any creative iteration. Both were R3F v9 / Three.js 0.184 compatibility issues — not logic errors, just framework behavior that differs from what earlier versions did. The session's creative budget was mostly spent on infrastructure.

### 2. The reference was misread on first pass
The 2D canvas snippet showed particles at fixed positions oscillating in place. The initial interpretation was "particles follow a Lissajous path" — wrong. The correct read was "particles are anchored to the axis and wiggle perpendicularly." This took an extra exchange to correct before a clean technical spec could be written.

### 3. Motion spec is still not locked
The user knows what it should *feel* like but hasn't been able to specify it in terms the code can execute. "Dragon-like body motion" and the reference snippet are pointing at the same target but from different angles — and the target still isn't fully triangulated.

---

## What worked well

- **The DebugLine diagnostic** was the single most productive thing this session. One small component, added in one edit, eliminated half the problem space in one draw gesture.
- **"Describe back before coding" held.** The motion spec was described in technical terms and confirmed before implementation. The implementation matched the spec. The spec just wasn't the right one yet — which is a creative problem, not a communication problem.
- **The technical architecture of the particle system is solid.** `InstancedMesh`, `CatmullRomCurve3`, `useFrame`, ref-based data flow — all working correctly. Future iterations are aesthetic changes, not structural rewrites.

---

## Key lesson

> Debugging and creative exploration are different modes. When you're in a debugging session, don't also try to move the aesthetic forward. Fix the foundation first, confirm it works, then switch modes.

This session tried to do both at once — and the debugging ate the creative time. The better sequence would have been: fix black screen → confirm with a known-working visual → end session. Start fresh next session with a clean foundation and creative focus.

---

## What changes next session

- [ ] Resolve `instanceColor` initialization properly — either `useLayoutEffect` or a ref-callback pattern — so vertex colors work reliably
- [ ] Remove `DebugLine` once color rendering is confirmed (it's diagnostic scaffolding, not a feature)
- [ ] Find or record a 2–3 second video of the exact body motion the dragon should have — not a still image, not a description
- [ ] Decide on the `oscPhase` equation before writing more code — this is a creative decision, not a technical one
- [ ] Set a particle count and sphere size that feels right before adding color (aesthetic layering: shape first, then color)

---

## Cost & Model

| | |
|---|---|
| **Model** | Claude Sonnet 4.6 |
| **Pricing** | Input $3 / 1M tokens · Output $15 / 1M tokens |
| **Cost driver this session** | Debugging loops — each "try this" → "still broken" → "try this" cycle generates output tokens without advancing the creative work |
| **What made it expensive** | The black screen and cannot-draw bugs each took 3–4 exchanges to isolate. Debugging in a chat interface is inherently expensive because every hypothesis is a full message with context. |
| **How to reduce next session** | Start from a confirmed working baseline. Don't touch the rendering system and the motion model in the same session. |

---

## Open questions

- What is the correct `oscPhase` equation — staggered wave, unified swing, or something else entirely?
- Should particles have random color (from the 10-color palette) or a gradient tied to position or time?
- `instanceColor` timing: is `useLayoutEffect` reliable in R3F v9, or does the color need to be initialized in the ref callback?
- Sphere size and count: 50 particles at 0.07 radius feels sparse. What density looks right?
- Is the `DebugLine` useful to keep as a permanent low-opacity guide, or should it disappear once the particle body is confident?
