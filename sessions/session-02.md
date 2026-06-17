# Session 02 — How the Dragon Looks (Algorithm Exploration)

---

session: 02
dates: 2026-06-16 → 2026-06-17
model: Claude Sonnet 4.6
stack: p5.js (WEBGL mode) for prototyping + React/Three.js InstancedMesh for production port
status: Complete — SphereCluster snake ported to Three.js, deployed to Vercel

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
const RADIAL_BIAS   = 0.5;  // 0.1 = shell, 1.0 = center-filled
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

## Exact sequence of what happened

**Day 1 — June 16**

Patt opened by describing a swarming behavior: particles spread across the screen seek a drawn line using steering (like the Chladni sketch, which Patt wrote). Claude read the Chladni code — `sketch.js` and `particle.js`. Understood the field-check pattern: `if abs(chladni(x,y)) > threshold` → wander, else → settle. Discussion: could this be translated from a mathematical field to a drawn curve?

First discussion: seek-to-line (Chladni-style, particles settle when close) vs flocking (line as soft attractor, tube shape from equilibrium between attraction and separation). Patt described wanting a "tubular swarm around the line" not particles locking on. Moved to flocking approach.

Claude generated a 2D p5 sketch — `lineForce()` + `separate()` in a Particle class. Patt asked to move to WEBGL for 3D. Claude rewrote for WEBGL: added z-coordinates, `restZ` per particle, orbit mode toggled by keypress (needed because `orbitControl()` steals mouse events). Patt ran it.

Patt shared screenshots. Observation: looked completely 2D from the front-on camera. Particles rendered as colorful dashes, not spheres (low-detail `sphere()` in WEBGL). Clusters piled at the start of the path, not along it. z-depth existed but was invisible without orbiting.

Tried reducing `Z_SPREAD` to match `TUBE_RADIUS` — still too flat-looking. Discussion: in 2D, a "tube" is just a ribbon. The 3D volume only becomes visible when you orbit, which isn't the interaction model for the final app.

**Pivot 1: abandoned flocking, moved to SphereCluster**

Patt described a completely different idea: a fixed point in space with a group of particles forming the illusion of a sphere. Not steering behavior. Not dynamic. Static particle clusters placed along the line.

Discussion before any code:
- Q: surface shell or filled volume? A: both — shell-biased but with particles inside too
- Q: what makes it look "full" at low count? A: particle size large enough to overlap neighbors
- Patt shared a reference screenshot of what they'd already made — colorful overlapping spheres, organic and clustered, not geometric

Claude explained the math: spherical coordinates (r, theta, phi → x, y, z). `theta` and `phi` give uniform angular coverage. `r = SPHERE_RADIUS * pow(random(), RADIAL_BIAS)` biases distribution toward surface. Explained why `pow()` — uniform `random()` over-crowds the center in 3D because smaller shells have less volume.

Claude generated `Particle` and `ParticleSystem` classes. Two files matching Chladni structure. Patt ran it and adjusted constants directly.

**Day 2 — June 17**

Patt wanted to wire clusters to a hand-drawn line. Discussion: break the line into evenly spaced points, place a `ParticleSystem` at each. `samplePath()` function does arc-length parameterization — not just every Nth point (uneven at different draw speeds), but evenly spaced in world distance. Variable name `cumDist` renamed to `pathLengths` (Patt's preference).

Changed from fixed `N_CLUSTERS` to distance-based `CLUSTER_SPACING` with `MAX_CLUSTERS` cap — number of clusters scales with path length.

**Pivot 2: snake animation**

Patt described wanting 3 fixed clusters moving together along the path like a snake — not spread evenly across the whole line, but tight together traveling forward. One `t` value drives the head; each subsequent cluster is at `t - i * CLUSTER_SPACING`. Hard reset when head exits the end.

Fixed bug: snake started with clusters appearing one at a time (tail hadn't entered path yet). Fix: initialize `t = T_START = (N_CLUSTERS-1) * CLUSTER_SPACING` so the whole snake is fully formed from frame one.

Added `RADIAL_BIAS` back to particle.js — Patt had removed randomness from `r`, making clusters look like perfect geometric shells. `pow(random(), 0.5)` restored organic irregularity.

**Pivot 3: transition behavior when new line drawn**

Patt raised the idea of a smooth transition — particles dispersing and reforming when a new line is drawn, similar to the Chladni pattern change. Patt shared a script from a YouTube video describing a three-phase GPU state machine: deform (particles drift outward via noise field), morph (pure lerp from source to target, single progress uniform), reform (noise fades back in). Described glow by travel distance.

Discussion: this approach doesn't need physics. No simulation. Just a progress value per particle, lerp between two snapshots.

First implementation: deform on `mousePressed`, morph on `mouseReleased`. Particles expand radially outward during deform (direction = `sourcePos - center`, which is just the offset vector → creates a bigger sphere expanding outward). Then morph lerps to new positions.

**Patt reverted.** The radial outward expansion made a visible intermediate sphere — too clear as a "step 1."

Tried adjusting: faster speeds (`DEFORM_SPEED`, `MORPH_SPEED`), more chaotic delay (switched from noise-based to `random()` delay so particles have no spatial correlation).

Still too legible as three distinct phases.

**Tried Option 2: random scatter direction.** Changed `dir = sourcePos - center` (radially outward, forms sphere) to `dir = p5.Vector.random3D()` (each particle flies a random direction, no coherent shape). Better chaos, no sphere artifact.

**Tried Option 1: no deform phase at all.** Remove expansion entirely. On `mouseReleased`, each particle lerps directly from current position to new target, staggered by a random delay. Some particles start moving immediately, others wait. The stagger alone creates the organic feel. No intermediate shape, no expansion. Patt liked this.

Bug discovered: drawing a second line crashed. `mousePressed` cleared `path` but `getPointAt` still referenced it — `path[-1].copy()` undefined. Fix: split into `path` (committed, snake runs on this) and `drawingPath` (in-progress, shown as preview). `path` is only replaced on `mouseReleased`.

Final change: Patt wanted dispersion to start after `mouseReleased`, not `mousePressed` — snake should keep playing on old path while drawing. Updated flow: `mouseReleased` computes new path, starts morph immediately. Snake runs on old `path` until `drawingPath` is committed.

---

## How this session actually worked

This is worth documenting separately because the process was meaningfully different from session 01 — and noticeably less frustrating.

### The starting point was something Patt already owned

Session 01 started from a description: "make it look like a dragon." Session 02 started from the Chladni Patterns sketch — Patt's own p5 code, already understood, already working. That's a completely different entry point. Instead of trying to explain a feeling, there was a concrete artifact to point at. "Can we do what this does, but to a drawn line instead of a mathematical field?" is a much more answerable question than "make it organic."

The same pattern repeated when we got to the sphere clusters. Patt didn't describe the look abstractly — they shared a screenshot of a reference image. One image collapsed the whole conversation about what "looks full" and "not perfectly spherical" actually meant.

And when it came to the transition/dispersion behavior, Patt shared a script from a YouTube video describing a three-phase state machine (deform → morph → reform). That gave Claude a concrete technical model to work from rather than interpreting "make it feel alive."

The lesson: concrete artifacts — existing code, images, scripts — are dramatically faster than descriptions. Not because descriptions are bad, but because artifacts carry precision that descriptions can't.

### The vocabulary was specific and technical from the start

Patt described what they wanted using terms that had direct technical translations:
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

---

## p5 Refinements — 04_Particle_System_3

Before porting to Three.js, the p5 prototype was pushed further in a forked folder (`04_Particle_System_3`).

**Sine wave offset path.** Instead of clusters following the drawn line exactly, they follow a sine wave derived from it. `getOffsetPointAt(d)` computes the tangent at each arc-length position using a wide window (`J_PTS = 20` points ahead and behind), rotates it 90° to get the perpendicular, then offsets by `sin(d * SINE_FREQ) * SINE_AMP`. Constants: `SINE_FREQ = 0.05`, `SINE_AMP = 40`. Result: snake weaves side-to-side as it travels. Blue line drawn separately to show the sine path in isolation.

**Laplacian path smoothing.** `smoothPath(pts, passes=5)` — each point averaged with its two neighbors weighted 2:1:1, run N times. Eliminates the jagged tangent artifacts that made the sine path jagged.

**Mode toggles added (p5):**
- `O` — orbit mode (enables `orbitControl()`, blocks mouse drawing)
- `L` — show/hide drawn path + sine path
- `S` — sphere vs fur shape mode (explored and removed — fur was slow and wrong aesthetic)

**Fur mode post-mortem.** Fur drew lines from each particle position in the path tangent direction with a slight radial deflection. Slow because each `line()` still needed per-particle `stroke()` state changes. Aesthetically wrong — lines radiated from cluster center, not from sphere surface in one direction like reference image. Removed.

**Color palette introduced:**
```js
const colorPalette = ["#abcd5e", "#14976b", "#2b67af", "#62b6de", "#f589a3", "#ef562f", "#fc8405", "#f9d531"];
```
Each particle picks randomly from this palette on construction. Replaces `color(random(255), random(255), random(255))`.

---

## Three.js Port

### Architecture

The p5 prototype (cluster snake + sine offset + staggered morph) was ported to React/Three.js in `src/App.jsx`.

**Key structural changes from p5:**

| p5 | Three.js |
|---|---|
| `ParticleSystem` objects with `Particle` instances | Single `InstancedMesh`, N_TOTAL = 5 × 200 |
| `sphere()` = 1 draw call per particle | All particles = 1 draw call total |
| `this.offset`, `this.worldPos` as p5.Vector | Flat `Float32Array` buffers for offsets, worldPos, source, target |
| `path` as global array of p5.Vectors | `committedRef` (Vector3[]), smoothed on mouseUp |
| Mouse events in p5 global scope | `useInputSpine` hook, raycasts to z=0 plane |

**`useInputSpine` rewrite.** The original hook kept a rolling 60-point window for continuous streaming. Rewritten to expose:
- `committedRef` — finalized smoothed path (set on mouseUp)
- `drawingRef` — in-progress path (cleared on mouseDown)
- `metaRef` — `{ lengths[], totalLen }` precomputed arc-length data
- `morphCountRef` — integer that increments on each new path commit, used as trigger signal
- `orbitMode` param — blocks all drawing input when orbit is enabled

**`DragonClusters` component.** Single `instancedMesh` with `N_TOTAL` instances. All particle data (offsets, delays, colors, cluster assignments) in typed arrays computed once in `useMemo`. Animation state in refs (never triggers re-renders):
- `worldPosRef` — current position of every particle, updated every frame
- `sourcePosRef` / `targetPosRef` — captured at morph start, lerped between

**Path math as standalone functions.** `getOffsetPointAt(path, lengths, totalLen, d)` defined at module level, not inside React. Called every frame inside `useFrame` — avoids React overhead.

### The instanceColor black bug

Setting `<meshBasicMaterial vertexColors />` caused all particles to render black.

**Root cause:** `vertexColors={true}` adds `USE_COLOR` to the shader, which reads from a `color` attribute on the geometry. `SphereGeometry` has no `color` attribute. WebGL returns `0` for undefined attributes. The shader does `vColor.xyz *= color` → `anything * 0 = black`. This happened even after `setColorAt()` set the instance colors.

**Fix:** Remove `vertexColors` entirely. Three.js `InstancedMesh` applies `instanceColor` via a separate `USE_INSTANCING_COLOR` shader path that activates automatically when `mesh.instanceColor !== null`. No `vertexColors` flag needed.

```jsx
// Wrong — USE_COLOR reads missing geometry attribute → black
<meshBasicMaterial vertexColors />

// Correct — instanceColor applied via USE_INSTANCING_COLOR automatically
<meshBasicMaterial />
```

Also added `mesh.material.needsUpdate = true` after the `useEffect` that seeds colors, to force shader recompile once `instanceColor` buffer exists.

### Button toggles

Replaced p5's key handlers with HTML button overlays positioned absolute over the canvas. Three buttons:
- **Lines** — show/hide committed path + drawing-in-progress path
- **Sine** — show/hide the sine offset path (blue, `#2b67af`, 150 sample points)
- **Orbit** — enables drei `OrbitControls`, blocks drawing input

Two-line bug: the drawing path geometry persisted after mouse release because `updateLine` returned early on empty arrays instead of clearing geometry. Fixed by writing `new Float32Array(0)` to the position attribute when `pts.length < 2`.

### InstancedMesh vs p5 — the core difference

In p5, every `sphere()` call is a separate CPU→GPU instruction. At 1000 particles: 1000 draw calls, 1000 state changes per frame.

In Three.js `InstancedMesh`, all transform data lives in a flat `Float32Array` (`instanceMatrix`, 16 floats × N instances). One GPU upload per frame, one draw call regardless of instance count.

**Performance test results:**

| Particles/cluster | Total | Result |
|---|---|---|
| 200 | 1,000 | Smooth |
| 2,000 | 10,000 | Smooth |
| 200,000 | 1,000,000 | Laggy but runs |

At 1M particles, the bottleneck is the CPU JS loop writing to `instanceMatrix`, not the GPU. The GPU handles the rendering fine. Next step for pushing higher: write matrix entries directly to `instanceMatrix.array` (skip `Object3D.updateMatrix()` overhead), or move position math into a GPU compute shader.

---

---

## Deployment

**GitHub:** `github.com/pattvira/handDrawnDragon`
- `References/` excluded from git tracking (added to `.gitignore`) — p5 sketches and assets stay local only
- `bluedragon.mov` (117MB) had to be scrubbed from git history with `filter-branch` before push would succeed

**Vercel:** Connected to GitHub repo, auto-deploys on push. Vite detected automatically, no config needed.

---

## What changes next session

- [ ] Test on actual mobile device via Vercel URL — check feel, frame rate, touch input
- [ ] Tune constants for mobile: `SPHERE_RADIUS`, `CLUSTER_SPACING`, `SINE_AMP`, `SINE_FREQ`
- [ ] Decide on particle count for mobile target
- [ ] Explore fur/hair shape mode more seriously with a clearer reference
- [ ] Consider depth cues to make 3D readable without orbit (size falloff, color gradient with z)

---

## Sketch

p5.js editor: https://editor.p5js.org/pattvira/sketches/yBQutF8A_
