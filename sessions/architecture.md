# Project Noni Dragon — Architecture & Technical Reference

A personal reference for understanding the codebase. Written for someone who knows what the app does but needs a reminder of how it's put together.

---

## The Stack

```
Vite → serves the app in development, builds it for production
React → manages components, UI state, what mounts/unmounts
React Three Fiber (R3F) → bridges React and Three.js
Three.js → does the actual 3D rendering
```

**Vite** is the dev server. It's what runs when you do `npm run dev`. You don't touch it. Think of it as the thing that replaced opening an `index.html` directly.

**React** manages the UI — what's on screen, when things mount and unmount, how state flows between components. In this app React's job is mostly: render the Canvas, render the buttons, re-render when a button is toggled.

**Three.js** is the 3D engine — geometry, materials, the render loop, the GPU calls. It knows nothing about React.

**React Three Fiber** is the glue. It lets you write Three.js objects as JSX tags (`<instancedMesh>`, `<sphereGeometry>`) and gives you `useFrame` — a hook that runs your animation code every frame, like p5's `draw()`.

---

## React Hooks — What Each One Does

A React component is a function that re-runs whenever something changes. Hooks are how you store things *between* those re-runs.

### `useState` — UI values that trigger re-renders

```js
const [showLines, setShowLines] = useState(true);
// showLines = current value
// setShowLines(false) → triggers re-render with new value
```

Use for button toggle states, anything visual that needs the screen to update. In p5 terms: a global variable that automatically redraws the screen when you change it.

### `useRef` — values that change silently

```js
const tRef = useRef(0);        // snake head position along path
tRef.current += SPEED * delta; // update every frame, no re-render
```

A box that holds a value without causing re-renders. Used for anything that changes every frame — animation state, particle positions, morph progress. In p5 terms: exactly like a regular global variable (`let t = 0`). Read and write `.current` directly.

### `useMemo` — expensive setup that runs once

```js
const particleData = useMemo(() => {
  // compute 10,000 sphere offsets, delays, colors — once at mount
  return { offsets, delays, clusterIdxs, colorArr };
}, []);
```

Runs a function once and remembers the result. Re-runs only if dependencies change (empty `[]` means never). In p5 terms: `setup()`.

### `useEffect` — one-time side effects after mount

```js
useEffect(() => {
  mesh.setColorAt(i, col); // seed colors into GPU buffer after canvas exists
}, [particleData]);
```

Runs after the component first appears on screen. Used for things that need the canvas or DOM to already exist. In p5 terms: also `setup()`, but specifically for things that depend on the rendered output existing first.

### `useFrame` (R3F only) — the animation loop

```js
useFrame((_, delta) => {
  tRef.current += SPEED * delta; // delta = seconds since last frame
  // update positions, write to GPU buffers
});
```

Runs every animation frame. This is p5's `draw()`. `delta` is the time since the last frame in seconds — use it to make animation frame-rate independent.

---

## p5 → Three.js Translation

| p5 | Three.js / R3F |
|---|---|
| `setup()` | `useMemo` + `useEffect` |
| `draw()` | `useFrame((_, delta) => { ... })` |
| `let t = 0` (global) | `const tRef = useRef(0)` |
| `background(220)` | `<color attach="background" args={["#dcdcdc"]} />` |
| `mousePressed`, `mouseDragged` | event listeners in `useInputSpine` hook |
| `new ParticleSystem(center, 200)` | `useMemo` computing typed arrays of offsets |
| `push(); translate(x,y,z); sphere(); pop();` | `_dummy.position.set(x,y,z); mesh.setMatrixAt(i, _dummy.matrix)` |
| `fill(col)` per particle | `mesh.setColorAt(i, col)` once at init |
| `createVector(x, y, z)` | `new THREE.Vector3(x, y, z)` |
| `p5.Vector.dist(a, b)` | `a.distanceTo(b)` |
| `p5.Vector.lerp(a, b, t)` | `new Vector3().lerpVectors(a, b, t)` |

The biggest conceptual shift: in p5 you *tell* the GPU what to draw each frame, one particle at a time. In Three.js you *write into flat buffers* once per frame, then say "upload these" — the GPU handles the repetition itself.

---

## What `_dummy` Is

`_dummy` is a throwaway `Object3D` used as a staging object to build transform matrices. It lives outside the component so it's created once.

```js
const _dummy = new Object3D(); // created once, module-level

// every frame, for each particle:
_dummy.position.set(wx, wy, wz); // set where you want it
_dummy.scale.setScalar(1);
_dummy.updateMatrix();            // bake position/scale into a 4×4 matrix
mesh.setMatrixAt(i, _dummy.matrix); // write that matrix into GPU buffer slot i
```

Think of it as a "stamp" — you configure it, stamp it into the buffer at position `i`, move to the next particle. The alternative would be constructing a raw 4×4 matrix manually, which is messier.

---

## How InstancedMesh Works

In p5, every `sphere()` is a separate draw call to the GPU — 1000 particles = 1000 calls per frame.

`InstancedMesh` lets you draw one geometry (a sphere) N times in a single draw call. All transform data lives in two flat `Float32Array` buffers on the GPU:

```
instanceMatrix  (N × 16 floats — one 4×4 transform matrix per instance)
instanceColor   (N × 3 floats  — one RGB value per instance)
```

You write into these every frame and flip `needsUpdate = true`. One GPU upload. One draw call. Regardless of N.

```js
// setup (once)
<instancedMesh args={[null, null, N_TOTAL]}>
  <sphereGeometry args={[PARTICLE_SIZE, 8, 8]} />
  <meshBasicMaterial />
</instancedMesh>

// every frame
mesh.setMatrixAt(i, _dummy.matrix);  // writes into instanceMatrix
mesh.instanceMatrix.needsUpdate = true; // one upload covers all N
```

**Important gotcha:** do NOT add `vertexColors` to the material when using instance colors. `vertexColors` reads from a geometry `color` attribute that doesn't exist on `SphereGeometry`, returning 0 — which multiplies with instance colors and produces black. Instance colors work automatically via a separate shader path (`USE_INSTANCING_COLOR`) without any material flag.

---

## File Structure

```
src/
  App.jsx              — everything: DragonClusters, PathLines, SinePath, Scene, App
  App.css              — button overlay styles only
  hooks/
    useInputSpine.js   — mouse/touch → world coordinates → committed path + morph trigger
  utils/
    math.js            — Box-Muller gaussian (unused currently)
```

### Key constants in App.jsx (tunable without understanding internals)

```js
const N_CLUSTERS          = 5;       // number of sphere clusters in the snake
const PARTICLES_PER_CLUSTER = 2000;  // particles per cluster (10k total)
const SPHERE_RADIUS       = 0.5;     // how spread out each cluster is
const PARTICLE_SIZE       = 0.05;    // radius of each individual sphere
const CLUSTER_SPACING     = 0.3;     // arc-length distance between cluster centers
const SPEED               = 2.5;     // world units per second (snake travel speed)
const MORPH_SPEED         = 1.8;     // 0→1 per second (transition speed on new path)
const STAGGER             = 0.8;     // how staggered the morph delay is across particles
const SINE_FREQ           = 1.5;     // how many sine cycles per world unit of path
const SINE_AMP            = 1.0;     // how far the snake weaves side-to-side
```

---

## Data Flow (one frame, idle mode)

```
useInputSpine
  └── committedRef   (Vector3[] — the smoothed drawn path)
  └── metaRef        (lengths[], totalLen — arc-length lookup table)

useFrame:
  tRef += SPEED * delta                         // advance snake head

  for each cluster c:
    clusterCenters[c] = getOffsetPointAt(t - c * CLUSTER_SPACING)
    // arc-length lookup → interpolated position → sine offset perpendicular to tangent

  for each particle i:
    center = clusterCenters[clusterOf[i]]
    worldPos[i] = center + offsets[i]           // offsets pre-computed at init
    _dummy.position.set(worldPos[i])
    _dummy.updateMatrix()
    mesh.setMatrixAt(i, _dummy.matrix)          // write to GPU buffer

  mesh.instanceMatrix.needsUpdate = true        // one GPU upload
```

---

## Do You Need to Write This From Scratch?

No. The architecture is set. What you'll actually do session to session:

- **Tune constants** at the top of `App.jsx` — you can do this entirely yourself
- **Add a new visual mode** — add a `useState` toggle, a new component, maybe a new property. Claude writes the wiring, you steer what it should do
- **Adjust the feel** — morph speed, stagger, sine amplitude — single-number changes

What you need to own is knowing *what to ask for* — what the thing should look like, what behavior you want, what feels wrong. The hook wiring and buffer indexing are Claude's job. The aesthetic direction is yours.
