import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Object3D,
  Color,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { useInputSpine } from "./hooks/useInputSpine";

const PARTICLE_COUNT = 50;
const TRAVEL_SPEED = 0.12; // how fast particles move along the path
const OSC_SPEED = 2.5; // how fast the perpendicular wiggle cycles
const OSC_CYCLES = 2; // wave cycles visible along the body
const AMP_PERP = 0.45; // perpendicular (side-to-side) amplitude
const AMP_ALONG = 0.17; // along-axis (fore/aft) amplitude — the 0.15 factor
const SPHERE_RADIUS = 0.07;

const PALETTE = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e91e63",
  "#00bcd4",
  "#ff5722",
];

const _dummy = new Object3D();
const _color = new Color();
const _tangent = new Vector3();

function Swarm({ pointsRef }) {
  const meshRef = useRef();
  const timeRef = useRef(0);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        phase: i / PARTICLE_COUNT, // evenly staggered 0→1 along the path
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      })),
    [],
  );

  // Seed instanceColor before first render so the shader compiles with it
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    particles.forEach(({ color }, i) => {
      _color.set(color);
      mesh.setColorAt(i, _color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const time = timeRef.current;
    const mesh = meshRef.current;
    const points = pointsRef.current;
    if (!mesh || points.length < 2) {
      if (mesh) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          _dummy.scale.setScalar(0);
          _dummy.updateMatrix();
          mesh.setMatrixAt(i, _dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
      return;
    }

    const curve = new CatmullRomCurve3(points, false, "catmullrom", 0.5);

    _dummy.scale.setScalar(1);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const { phase, color } = particles[i];

      // Travel position along the curve
      const pathT = (phase + time * TRAVEL_SPEED) % 1;

      const pos = curve.getPointAt(pathT);
      curve.getTangentAt(pathT, _tangent).normalize();

      // In-plane normal: rotate tangent 90°
      const nx = -_tangent.y;
      const ny = _tangent.x;

      // All particles share the same oscillation phase — whole body swings together
      const oscPhase = phase * Math.PI * 2 * OSC_CYCLES + time * OSC_SPEED;

      const perpDisp = AMP_PERP * Math.sin(oscPhase);
      const alongDisp = AMP_ALONG * Math.sin(0.5 * oscPhase);

      _dummy.position.set(
        pos.x + nx * perpDisp + _tangent.x * alongDisp,
        pos.y + ny * perpDisp + _tangent.y * alongDisp,
        0,
      );
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);

      _color.set(color);
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]}>
      <sphereGeometry args={[SPHERE_RADIUS, 6, 6]} />
      <meshBasicMaterial color="hotpink" />
    </instancedMesh>
  );
}

// Debug line — confirms input is working independently of the particle system
function DebugLine({ pointsRef }) {
  const lineRef = useRef();

  useFrame(() => {
    const pts = pointsRef.current;
    if (!lineRef.current || pts.length < 2) return;
    const curve = new CatmullRomCurve3(pts);
    const sampled = curve.getPoints(80);
    const flat = new Float32Array(sampled.length * 3);
    sampled.forEach((p, i) => {
      flat[i * 3] = p.x;
      flat[i * 3 + 1] = p.y;
      flat[i * 3 + 2] = p.z;
    });
    lineRef.current.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(flat, 3),
    );
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="white" />
    </line>
  );
}

function Scene() {
  const pointsRef = useInputSpine();
  return (
    <>
      <DebugLine pointsRef={pointsRef} />
      <Swarm pointsRef={pointsRef} />
    </>
  );
}

export default function App() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ fov: 60, near: 0.1, far: 100, position: [0, 0, 10] }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} />
      <Scene />
    </Canvas>
  );
}
