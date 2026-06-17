# Session 02 — Algorithm Pivot & p5 WEBGL Prototype

---

session: 02
dates: 2026-06-16
model: Claude Sonnet 4.6
stack: p5.js (WEBGL mode) — prototyping only, no Three.js changes
status: Complete — prototype running, tuning still needed

---

## What we were trying to build

A new motion model for the dragon body. Session 01's travel + perpendicular oscillation approach was technically working but felt too mechanical and didn't reach the target aesthetic. Goal this session: find a better algorithm by discussing first, prototyping in p5, and only moving to Three.js once the feel is confirmed.

---

## What we actually built

### Starting point: 2D Chladni reference → 3D without GPU

The session started from a specific question: the existing Chladni Patterns sketch (Patt's own p5 code) uses CPU-based steering to move particles toward nodal lines. Could the same approach be adapted to 3D, and applied to a drawn curve instead of a mathematical field — without requiring GPU compute or InstancedMesh?

The answer is yes in principle, but **look had to come before optimization**. InstancedMesh and GPU particles are performance solutions. Reaching for them before the motion feels right would mean optimizing the wrong thing. p5 WEBGL is slower but lets you see and react to what's actually happening — which is the whole point at this stage.

### Algorithm options discussed

**Option A — Chladni-style seek and settle**

Direct translation: replace `chladni(x, y)` with distance-to-curve. If a particle is outside a threshold distance from the line, it wanders. If inside, it seeks the nearest point and settles.

**Option B — Flocking with line as soft attractor**

The line creates a continuous pull rather than a settle condition. Forces:

- **Line attraction** — active only outside a `TUBE_RADIUS` deadband. Inside the tube, no line force.
- **Separation** — particles push each other away when too close. Creates volume — they can't all pile onto the line so they spread outward to equilibrium.
- **Alignment** — not yet implemented.

Inside the tube, only separation acts. Particles constantly nudge each other, drift slightly, correct. The body stays alive even when the line isn't changing.

**3D volume: `restZ`**

Each particle gets a `restZ` at birth — a fixed random value in `[-Z_SPREAD, Z_SPREAD]`. Line force target is `(nearest.x, nearest.y, this.restZ)` rather than `(nearest.x, nearest.y, 0)`. Particles converge in x,y toward the line but seek their own z-layer. Separation acts in full 3D.

### p5 WEBGL prototype

Key mechanics:

- `mousePressed`: clear path
- `mouseDragged`: add points with minimum distance filter
- `nearestOnPath()`: linear scan, returns nearest path vertex and 2D distance
- `lineForce()`: if 2D distance > TUBE_RADIUS, steer toward `(nearest.x, nearest.y, restZ)`. Zero inside tube.
- `separate()`: O(N²) pair check in full 3D
- Key press: toggle draw mode / orbit mode — `orbitControl()` steals mouse events, so they can't coexist

### What the prototype revealed

**z still spreads out too much.** Even after reducing `Z_SPREAD` to match `TUBE_RADIUS`, the z-depth reads as excessive when orbiting. The tube cross-section is wider in z than it looks like it should be. Not yet resolved.

**Unsettled aesthetic question.** Two directions are now visible and neither is clearly right yet:

1. **Chaotic / always-moving** — particles continuously swarm, never settle. Energetic but potentially noisy.
2. **Settle-after-draw** — particles swarm while the line is being drawn, then gradually settle and calm once the finger lifts. This is the instinct but it's unclear how to implement the transition: what changes when the line stops updating? Dampen velocity? Remove the tube radius deadband so particles converge fully onto the line?

**From front-on camera, z-depth is invisible.** The 3D is real but unreadable without orbiting. Front-facing depth cues (size falloff, depth-based color, tilted camera) will be needed in the final version.

### What's different about this workflow

The key shift from session 01: Patt is writing the code and using Claude as a thinking partner, rather than Claude writing the code from a description. The Chladni reference gave a concrete starting point Patt already understood. The discussion translated it to the new context. The prototype was built by Patt using their own brain — reacting to what they saw, adjusting numbers, exploring. Less frustrating, faster feedback loop, more ownership of the result.

---

## Where the process broke down

### 1. Prototype-first instinct is working

Discussing the algorithm before writing code — including describing it back in technical terms and comparing options — took maybe 20 minutes and collapsed what would have been 2-3 coding iterations. This is the workflow change from session 01 actually working.

### 2. p5 WEBGL is a useful middle step

Three.js WEBGL with InstancedMesh adds a lot of complexity (shader compilation timing, R3F event system, instanceColor). p5 WEBGL gives the same 3D space with much less friction. Getting the algorithm right here before porting is cheaper.

### 3. Particle distribution along the line is still unsolved

The nearest-point approach naturally clusters particles at the closest part of the path, not evenly along it. This is fine for Chladni (nodal lines are everywhere) but wrong for a dragon body (needs to fill the whole line). Needs a solution before this feels right.

---

## What worked well

- **Algorithm discussion first** — comparing Option A vs Option B before writing a line of code.
- **Using existing Chladni code as a reference** — the steering pattern (desired - velocity, clamped to maxForce) was already understood. Translation was fast.
- **WEBGL orbit mode** — being able to rotate the view and see z-depth confirmed the approach was working in 3D.
- **`restZ` pattern** — simple, predictable, easy to tune. Gives the z-spread without relying on emergent z-separation.

---

## Key lesson

> The p5 WEBGL prototype is the right place to figure out if z-depth reads visually. The math is always correct; the question is whether it's _perceptible_ from the camera angle the user will actually see. That question is unanswerable without running it.

---

## What changes next session

- [ ] Fix particle distribution — particles should spread along the full line, not cluster at the nearest point. Options: assign each particle an index into the path array, or use a repulsion-from-other-settled-particles force.
- [ ] Add alignment force — particles align velocity with neighbors. Should give the swarm a coherent flow direction along the line.
- [ ] Solve the camera angle problem — what makes z-depth readable without requiring orbit? Depth-based color? Size falloff with z? Fixed tilted camera?
- [ ] Tune `TUBE_RADIUS` and `Z_SPREAD` together until cross-section reads as circular from the intended camera angle.
- [ ] Once p5 feel is confirmed, port to Three.js InstancedMesh.

---

## Cost & Model

|                                |                                                                             |
| ------------------------------ | --------------------------------------------------------------------------- |
| **Model**                      | Claude Sonnet 4.6                                                           |
| **Pricing**                    | Input $3 / 1M tokens · Output $15 / 1M tokens                               |
| **Cost driver**                | Mostly discussion and one prototype build — low output token count          |
| **What made it cheaper**       | Algorithm discussion before coding. One prototype, not four rewrites.       |
| **How to reduce next session** | Solve particle distribution problem on paper or in p5 before opening Claude |

---

## Open questions

- How do particles distribute evenly along the full line rather than clustering at the nearest point?
- Does the separation force alone create enough z-spread, or is `restZ` always needed?
- What makes the 3D volume readable from a fixed front-on camera — depth color? size falloff? tilted camera?
- Is O(N²) separation fast enough at the particle count needed for the dragon to look full?
- Should alignment be neighbor-based, tangent-based (align to curve direction), or both?
- What particle count and size makes the body read as "fluffy" rather than sparse or overcrowded?

---

## Sketch

p5.js editor: https://editor.p5js.org/pattvira/sketches/yBQutF8A_
