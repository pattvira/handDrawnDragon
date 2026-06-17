# Session 02 — How the Dragon Looks (Algorithm Exploration)

---

session: 02
dates: 2026-06-16 → 2026-06-17
model: Claude Sonnet 4.6
stack: p5.js (WEBGL mode) — prototyping only, no Three.js changes
status: In progress — two approaches explored, SphereCluster most promising

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

The key shift from session 01: Patt is writing the code and using Claude as a thinking partner, rather than Claude writing the code from a description. The Chladni reference gave a concrete starting point Patt already understood. The discussion translated it to the new context. The prototype was built by Patt using her own brain — reacting to what she saw, adjusting numbers, exploring. Less frustrating, faster feedback loop, more ownership of the result.

### Pivot: SphereCluster approach

Flocking behavior was set aside. New idea: instead of particles steering toward the line, **break the line into evenly spaced points and place a sphere-cluster of particles at each point.** The dragon body = a chain of `ParticleSystem` instances along the drawn path.

**Structure:**

- `Particle` — stores a pre-computed 3D offset from its cluster center, a color, and a size. Positions computed once at construction, static.
- `ParticleSystem` — takes a center point and N, creates N particles distributed around it as a volumetric sphere cluster.

**The distribution math — spherical coordinates:**

Each particle position is generated in spherical coordinates (r, theta, phi) then converted to Cartesian (x, y, z):

```
theta = random(TWO_PI)          // full rotation around vertical axis
phi   = acos(random(-1, 1))     // vertical spread — acos corrects for pole clustering
r     = SPHERE_RADIUS * pow(random(), RADIAL_BIAS)
```

`theta` and `phi` are fixed — they give uniform angular coverage across the full sphere surface. `r` is the only creative lever.

**Why `pow(random(), n)`:**

`random()` is uniform 0→1. Used directly as r, it over-crowds the center — because in 3D, the volume near the surface is much larger than near the center, so equal probability per radius value actually means most particles end up closer to center than the eye expects.

`pow(random(), n)` biases the distribution:

- `n = 1.0` → linear, center-heavy
- `n = 0.5` → square root, surface-biased (default)
- `n = 0.1` → almost all particles on the surface shell

Lower exponent = more shell-like. Higher = more filled center. This is a general trick: `pow(x, n)` where n < 1 pulls uniform random values toward 1 (toward surface).

**What makes it look "full" at low particle count:**

Particle size relative to sphere radius. Each particle at ~30% of `SPHERE_RADIUS` means neighbors overlap visually — the cluster reads as a solid mass even at 30 particles.

**Tunable constants:**

```js
const SPHERE_RADIUS = 60;
const PARTICLE_SIZE = SPHERE_RADIUS * 0.3;
const RADIAL_BIAS = 0.5; // 0.1 = shell, 1.0 = center-filled
```

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

## How this session actually worked

This is worth documenting separately because the process was meaningfully different from session 01 — and noticeably less frustrating.

### The starting point was something Patt already owned

Session 01 started from a description: "make it look like a dragon." Session 02 started from the Chladni Patterns sketch — Patt's own p5 code, already understood, already working. That's a completely different entry point. Instead of trying to explain a feeling, there was a concrete artifact to point at. "Can we do what this does, but to a drawn line instead of a mathematical field?" is a much more answerable question than "make it organic."

The same pattern repeated when we got to the sphere clusters. Patt didn't describe the look abstractly — she shared a screenshot of a reference image. One image collapsed the whole conversation about what "looks full" and "not perfectly spherical" actually meant.

And when it came to the transition/dispersion behavior, Patt shared a script from a YouTube video describing a three-phase state machine (deform → morph → reform). That gave Claude a concrete technical model to work from rather than interpreting "make it feel alive."

The lesson: concrete artifacts — existing code, images, scripts — are dramatically faster than descriptions. Not because descriptions are bad, but because artifacts carry precision that descriptions can't.

### The vocabulary was specific and technical from the start

Patt described what she wanted using terms that had direct technical translations:

- "tubular swarm around the drawn line" → flocking with line as soft attractor
- "shell of a sphere, closer to nucleus it can be uneven" → spherical coordinates + `pow(random(), n)` radial bias
- "looks full even with a small number of particles" → particle size relative to sphere radius
- "chaotic, not a smooth wave" → `random()` delay instead of noise-based delay

Each of these descriptions pointed almost directly at a specific parameter or algorithm. When vocabulary is that precise, the discussion-to-code ratio can be low and the first implementation is usually close. When it's vague ("make it feel like a dragon"), you get iteration cycles.

### The discussion:code ratio was much higher

Almost every coding step in this session was preceded by a real discussion that ended in alignment. Claude described the approach back in technical terms, Patt confirmed or corrected, then code was written. This happened for:

- Flocking vs Chladni-style seek
- z-spread approach (restZ vs 3D distance)
- SphereCluster structure (Particle + ParticleSystem)
- Distribution math (spherical coordinates, `pow()` bias)
- Snake animation (fixed clusters vs distance-based)
- Transition behavior (three-phase state machine, then which option)

In session 01, code was often written mid-description. Here, the spec came first — even when it was short. That one extra step saved multiple rewrite cycles.

### Claude coded, but Patt steered

The balance that worked: Patt described the concept and the feel, Claude translated that into a technical approach and wrote the code, Patt then took the generated code and modified it directly (tuning constants, changing parameters, adjusting what felt wrong). The creative decisions stayed with Patt. The implementation went to Claude.

This broke down a few times — the dispersion behavior took multiple attempts (Chladni-style, radial outward sphere, random scatter, staggered direct morph) before landing. But each failed attempt was smaller and faster to revert than session 01's full rewrites. The session felt iterative rather than corrective.

### What made the reversions feel cheap

In session 01, reverting felt expensive because each attempt represented a long back-and-forth that produced a lot of code. In session 02, each attempt was short — a few function changes, a few constants. The cost of "let's revert and try option 1 instead" was almost zero. That low revert cost made experimentation feel safe rather than wasteful.

The p5 environment helped too. No build step, no shader compilation timing issues, no R3F event system — just write and run. The feedback loop was fast enough that trying three different dispersion approaches in the same session felt normal, not painful.

### What's still unresolved

The 3D depth problem hasn't been solved. All the p5 work looks good from the front-on camera but flattens visually. Orbiting reveals the depth, but that's not the interaction model for the final app. This is a problem to solve in Three.js, not p5 — but the algorithm needs to be right in p5 first, and it's getting there.

---

## Sketch

p5.js editor: https://editor.p5js.org/pattvira/sketches/yBQutF8A_
