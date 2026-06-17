let systems = [];
let path = [];
let drawingPath = [];
let pathLengths = [];
let totalLen = 0;
let t = 0;
let phase = "idle"; // 'idle', 'morph'
let orbitMode = false;
let showLines = true;
let morphProgress = 0;

const MIN_PATH_DIST = 5;
const N_CLUSTERS = 5;
const CLUSTER_SPACING = 10;
const SPEED = 1.5;
const T_START = (N_CLUSTERS - 1) * CLUSTER_SPACING;
const MORPH_SPEED = 0.03;
const SINE_FREQ = 0.05; // cycles per unit distance along path
const SINE_AMP = 40; // perpendicular offset amplitude in pixels

function setup() {
  createCanvas(400, 400, WEBGL);
  for (let i = 0; i < N_CLUSTERS; i++) {
    systems.push(new ParticleSystem(createVector(0, 0, 0), 200));
  }
}

function draw() {
  background(220);
  if (orbitMode) orbitControl();

  if (showLines) {
    if (drawingPath.length > 1) {
      push();
      stroke(0, 80);
      noFill();
      beginShape();
      for (let p of drawingPath) vertex(p.x, p.y, 0);
      endShape();
      pop();
    }

    if (path.length > 1) {
      push();
      stroke(0);
      noFill();
      beginShape();
      for (let p of path) vertex(p.x, p.y, 0);
      endShape();
      pop();

      // draw sine path in blue
      push();
      stroke(0, 100, 255);
      noFill();
      beginShape();
      for (let d = 0; d <= totalLen; d += 2) {
        let pt = getOffsetPointAt(d);
        vertex(pt.x, pt.y, 0);
      }
      endShape();
      pop();
    }
  }

  if (phase === "morph") {
    morphProgress = min(morphProgress + MORPH_SPEED, 1);
    for (let s of systems) {
      s.updateMorph(morphProgress);
      s.display("morph");
    }
    if (morphProgress >= 1) {
      phase = "idle";
      t = T_START;
    }
  } else {
    if (totalLen > 0) {
      t += SPEED;
      if (t > totalLen) t = T_START;
      for (let i = 0; i < N_CLUSTERS; i++) {
        let d = t - i * CLUSTER_SPACING;
        if (d < 0) continue;
        systems[i].center = getOffsetPointAt(d);
        systems[i].display("idle");
      }
    }
  }
}

function keyPressed() {
  if (key === "o" || key === "O") orbitMode = !orbitMode;
  if (key === "l" || key === "L") showLines = !showLines;
}

function mousePressed() {
  if (orbitMode) return;
  drawingPath = [];
}

function mouseDragged() {
  if (orbitMode) return;
  let pt = createVector(mouseX - width / 2, mouseY - height / 2, 0);
  if (
    drawingPath.length === 0 ||
    p5.Vector.dist(pt, drawingPath[drawingPath.length - 1]) > MIN_PATH_DIST
  ) {
    drawingPath.push(pt);
  }
}

function smoothPath(pts, passes = 5) {
  let result = pts.slice();
  for (let p = 0; p < passes; p++) {
    let s = [result[0]];
    for (let i = 1; i < result.length - 1; i++) {
      s.push(
        p5.Vector.add(
          p5.Vector.add(result[i - 1], result[i + 1]),
          p5.Vector.mult(result[i], 2),
        ).div(4),
      );
    }
    s.push(result[result.length - 1]);
    result = s;
  }
  return result;
}

function mouseReleased() {
  if (orbitMode) return;
  if (drawingPath.length < 2) return;

  path = smoothPath(drawingPath);
  drawingPath = [];

  pathLengths = [0];
  for (let i = 1; i < path.length; i++) {
    pathLengths.push(pathLengths[i - 1] + p5.Vector.dist(path[i], path[i - 1]));
  }
  totalLen = pathLengths[pathLengths.length - 1];

  // update cluster centers to new path then start morph
  for (let i = 0; i < N_CLUSTERS; i++) {
    let d = T_START - i * CLUSTER_SPACING;
    systems[i].center = getOffsetPointAt(max(d, 0));
  }
  for (let s of systems) s.startMorph();
  phase = "morph";
  morphProgress = 0;
}

function getPointAt(d) {
  d = constrain(d, 0, totalLen);
  for (let j = 1; j < path.length; j++) {
    if (pathLengths[j] >= d) {
      let frac =
        (d - pathLengths[j - 1]) / (pathLengths[j] - pathLengths[j - 1]);
      return p5.Vector.lerp(path[j - 1], path[j], frac);
    }
  }
  return path[path.length - 1].copy();
}

let jPts = 20;

function getOffsetPointAt(d) {
  d = constrain(d, 0, totalLen);
  for (let j = 1; j < path.length; j++) {
    if (pathLengths[j] >= d) {
      let frac =
        (d - pathLengths[j - 1]) / (pathLengths[j] - pathLengths[j - 1]);
      let pos = p5.Vector.lerp(path[j - 1], path[j], frac);
      // tangent = direction across a wider window of points for smoother result
      let ahead = path[min(j + jPts, path.length - 1)];
      let behind = path[max(j - jPts, 0)];
      let tangent = p5.Vector.sub(ahead, behind).normalize();
      // perpendicular = rotate tangent 90°
      let perp = createVector(-tangent.y, tangent.x, 0);
      // sine offset along perpendicular
      pos.add(p5.Vector.mult(perp, sin(d * SINE_FREQ) * SINE_AMP));
      return pos;
    }
  }
  return path[path.length - 1].copy();
}
