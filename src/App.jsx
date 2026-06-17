import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Object3D, Color, Vector3, Float32BufferAttribute } from "three";
import { useInputSpine } from "./hooks/useInputSpine";
import "./App.css";

// Match p5 sketch proportions (p5 canvas 400×400, Three.js frustum height ≈ 11.55 at z=10)
// Scale factor: 11.55 / 400 ≈ 0.029 per pixel
const N_CLUSTERS = 5;
const PARTICLES_PER_CLUSTER = 500;
const N_TOTAL = N_CLUSTERS * PARTICLES_PER_CLUSTER;
const SPHERE_RADIUS = 0.5; // p5: 20px → 0.58
const PARTICLE_SIZE = 0.03; // p5: 2px  → 0.058
const RADIAL_BIAS = 0.5;
const CLUSTER_SPACING = 0.3; // p5: 10px → 0.29
const T_START = (N_CLUSTERS - 1) * CLUSTER_SPACING;
const SPEED = 2.5; // world units/sec (p5: 1.5px/frame × 60 × 0.029)
const MORPH_SPEED = 1.8; // 0→1 per second
const STAGGER = 0.8;
const SINE_FREQ = 1.5; // cycles/unit (p5: 0.05/px ÷ 0.029 ≈ 1.72)
const SINE_AMP = 1.0; // world units (p5: 40px → 1.16)
const J_PTS = 20;

const COLOR_PALETTE = [
  "#abcd5e",
  "#14976b",
  "#2b67af",
  "#62b6de",
  "#f589a3",
  "#ef562f",
  "#fc8405",
  "#f9d531",
];

function getOffsetPointAt(path, lengths, totalLen, d) {
  d = Math.min(Math.max(d, 0), totalLen);
  for (let j = 1; j < path.length; j++) {
    if (lengths[j] >= d) {
      const frac = (d - lengths[j - 1]) / (lengths[j] - lengths[j - 1]);
      const pos = new Vector3().lerpVectors(path[j - 1], path[j], frac);
      const ahead = path[Math.min(j + J_PTS, path.length - 1)];
      const behind = path[Math.max(j - J_PTS, 0)];
      const tx = ahead.x - behind.x;
      const ty = ahead.y - behind.y;
      const tLen = Math.sqrt(tx * tx + ty * ty) || 1;
      const sine = Math.sin(d * SINE_FREQ) * SINE_AMP;
      pos.x += (-ty / tLen) * sine;
      pos.y += (tx / tLen) * sine;
      return pos;
    }
  }
  return path[path.length - 1].clone();
}

const _dummy = new Object3D();

function DragonClusters({ committedRef, metaRef, morphCountRef }) {
  const meshRef = useRef();

  const particleData = useMemo(() => {
    const offsets = new Float32Array(N_TOTAL * 3);
    const delays = new Float32Array(N_TOTAL);
    const clusterIdxs = new Int32Array(N_TOTAL);
    const colorArr = [];

    for (let c = 0; c < N_CLUSTERS; c++) {
      for (let p = 0; p < PARTICLES_PER_CLUSTER; p++) {
        const i = c * PARTICLES_PER_CLUSTER + p;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = SPHERE_RADIUS * Math.pow(Math.random(), RADIAL_BIAS);
        offsets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        offsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        offsets[i * 3 + 2] = r * Math.cos(phi);
        delays[i] = Math.random();
        clusterIdxs[i] = c;
        colorArr.push(
          new Color(
            COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
          ),
        );
      }
    }
    return { offsets, delays, clusterIdxs, colorArr };
  }, []);

  const worldPosRef = useRef(new Float32Array(N_TOTAL * 3));
  const sourcePosRef = useRef(new Float32Array(N_TOTAL * 3));
  const targetPosRef = useRef(new Float32Array(N_TOTAL * 3));
  const clusterCenters = useRef(
    Array.from({ length: N_CLUSTERS }, () => new Vector3()),
  );
  const tRef = useRef(T_START);
  const morphPhaseRef = useRef("idle");
  const morphProgressRef = useRef(0);
  const lastMorphCountRef = useRef(0);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    particleData.colorArr.forEach((col, i) => mesh.setColorAt(i, col));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Force shader recompile so USE_COLOR gets included now that instanceColor exists
    mesh.material.needsUpdate = true;
  }, [particleData]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const path = committedRef.current;
    const { lengths, totalLen } = metaRef.current;
    const { offsets, delays, clusterIdxs } = particleData;

    if (morphCountRef.current > lastMorphCountRef.current && path.length >= 2) {
      lastMorphCountRef.current = morphCountRef.current;
      sourcePosRef.current.set(worldPosRef.current);

      for (let c = 0; c < N_CLUSTERS; c++) {
        const d = T_START - c * CLUSTER_SPACING;
        clusterCenters.current[c].copy(
          getOffsetPointAt(path, lengths, totalLen, Math.max(d, 0)),
        );
      }
      for (let i = 0; i < N_TOTAL; i++) {
        const ctr = clusterCenters.current[clusterIdxs[i]];
        targetPosRef.current[i * 3] = ctr.x + offsets[i * 3];
        targetPosRef.current[i * 3 + 1] = ctr.y + offsets[i * 3 + 1];
        targetPosRef.current[i * 3 + 2] = ctr.z + offsets[i * 3 + 2];
      }
      morphPhaseRef.current = "morph";
      morphProgressRef.current = 0;
    }

    if (morphPhaseRef.current === "morph") {
      morphProgressRef.current = Math.min(
        morphProgressRef.current + MORPH_SPEED * delta,
        1,
      );
      const progress = morphProgressRef.current;

      for (let i = 0; i < N_TOTAL; i++) {
        const d = delays[i] * STAGGER;
        let localP = (progress - d) / (1 - d);
        localP = Math.min(Math.max(localP, 0), 1);

        const wx =
          sourcePosRef.current[i * 3] +
          (targetPosRef.current[i * 3] - sourcePosRef.current[i * 3]) * localP;
        const wy =
          sourcePosRef.current[i * 3 + 1] +
          (targetPosRef.current[i * 3 + 1] - sourcePosRef.current[i * 3 + 1]) *
            localP;
        const wz =
          sourcePosRef.current[i * 3 + 2] +
          (targetPosRef.current[i * 3 + 2] - sourcePosRef.current[i * 3 + 2]) *
            localP;

        worldPosRef.current[i * 3] = wx;
        worldPosRef.current[i * 3 + 1] = wy;
        worldPosRef.current[i * 3 + 2] = wz;
        _dummy.position.set(wx, wy, wz);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }

      if (morphProgressRef.current >= 1) {
        morphPhaseRef.current = "idle";
        tRef.current = T_START;
      }
    } else {
      if (totalLen <= 0) {
        for (let i = 0; i < N_TOTAL; i++) {
          _dummy.scale.setScalar(0);
          _dummy.updateMatrix();
          mesh.setMatrixAt(i, _dummy.matrix);
        }
      } else {
        tRef.current += SPEED * delta;
        if (tRef.current > totalLen) tRef.current = T_START;

        for (let c = 0; c < N_CLUSTERS; c++) {
          const d = tRef.current - c * CLUSTER_SPACING;
          if (d >= 0)
            clusterCenters.current[c].copy(
              getOffsetPointAt(path, lengths, totalLen, d),
            );
        }

        for (let i = 0; i < N_TOTAL; i++) {
          const c = clusterIdxs[i];
          const d = tRef.current - c * CLUSTER_SPACING;
          if (d < 0) {
            _dummy.scale.setScalar(0);
          } else {
            const ctr = clusterCenters.current[c];
            const wx = ctr.x + offsets[i * 3];
            const wy = ctr.y + offsets[i * 3 + 1];
            const wz = ctr.z + offsets[i * 3 + 2];
            worldPosRef.current[i * 3] = wx;
            worldPosRef.current[i * 3 + 1] = wy;
            worldPosRef.current[i * 3 + 2] = wz;
            _dummy.position.set(wx, wy, wz);
            _dummy.scale.setScalar(1);
          }
          _dummy.updateMatrix();
          mesh.setMatrixAt(i, _dummy.matrix);
        }
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, N_TOTAL]}>
      <sphereGeometry args={[PARTICLE_SIZE, 8, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function PathLines({ committedRef, drawingRef }) {
  const committedLineRef = useRef();
  const drawingLineRef = useRef();

  useFrame(() => {
    const updateLine = (ref, pts) => {
      if (!ref.current) return;
      if (pts.length < 2) {
        // Clear so the old geometry doesn't persist after mouse release
        ref.current.geometry.setAttribute(
          "position",
          new Float32BufferAttribute(new Float32Array(0), 3),
        );
        return;
      }
      const flat = new Float32Array(pts.length * 3);
      pts.forEach((p, i) => {
        flat[i * 3] = p.x;
        flat[i * 3 + 1] = p.y;
        flat[i * 3 + 2] = p.z;
      });
      ref.current.geometry.setAttribute(
        "position",
        new Float32BufferAttribute(flat, 3),
      );
    };
    updateLine(committedLineRef, committedRef.current);
    updateLine(drawingLineRef, drawingRef.current);
  });

  return (
    <>
      <line ref={committedLineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#000000" opacity={0.5} transparent />
      </line>
      <line ref={drawingLineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#000000" opacity={0.25} transparent />
      </line>
    </>
  );
}

function SinePath({ committedRef, metaRef }) {
  const lineRef = useRef();

  useFrame(() => {
    if (!lineRef.current) return;
    const path = committedRef.current;
    const { lengths, totalLen } = metaRef.current;
    if (path.length < 2 || totalLen <= 0) return;

    const STEPS = 150;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      pts.push(
        getOffsetPointAt(path, lengths, totalLen, (i / STEPS) * totalLen),
      );
    }
    const flat = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
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
      <lineBasicMaterial color="#2b67af" opacity={0.7} transparent />
    </line>
  );
}

function Scene({ showLines, showSine, orbitMode }) {
  const { committedRef, metaRef, drawingRef, morphCountRef } =
    useInputSpine(orbitMode);
  return (
    <>
      {orbitMode && <OrbitControls makeDefault />}
      {showLines && (
        <PathLines committedRef={committedRef} drawingRef={drawingRef} />
      )}
      {showSine && <SinePath committedRef={committedRef} metaRef={metaRef} />}
      <DragonClusters
        committedRef={committedRef}
        metaRef={metaRef}
        morphCountRef={morphCountRef}
      />
    </>
  );
}

export default function App() {
  const [showLines, setShowLines] = useState(true);
  const [showSine, setShowSine] = useState(false);
  const [orbitMode, setOrbitMode] = useState(false);

  return (
    <div className="app-root">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 60, near: 0.1, far: 100, position: [0, 0, 10] }}
      >
        <color attach="background" args={["#dcdcdc"]} />
        <Scene
          showLines={showLines}
          showSine={showSine}
          orbitMode={orbitMode}
        />
      </Canvas>

      <div className="controls">
        <button
          className={`btn ${showLines ? "active" : ""}`}
          onClick={() => setShowLines((v) => !v)}
        >
          Lines
        </button>
        <button
          className={`btn ${showSine ? "active" : ""}`}
          onClick={() => setShowSine((v) => !v)}
        >
          Sine
        </button>
        <button
          className={`btn ${orbitMode ? "active" : ""}`}
          onClick={() => setOrbitMode((v) => !v)}
        >
          Orbit
        </button>
      </div>
    </div>
  );
}
