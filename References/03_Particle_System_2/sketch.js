let systems = [];
let path = [];

const MIN_PATH_DIST = 5;
const CLUSTER_SPACING = 30;
const MAX_CLUSTERS = 50;

function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(220);

  if (path.length > 1) {
    push();
    stroke(0);
    noFill();
    beginShape();
    for (let p of path) vertex(p.x, p.y, 0);
    endShape();
    pop();
  }

  for (let s of systems) s.display();
}

function mousePressed() {
  path = [];
  systems = [];
}

function mouseDragged() {
  let pt = createVector(mouseX - width / 2, mouseY - height / 2, 0);
  if (path.length === 0 || p5.Vector.dist(pt, path[path.length - 1]) > MIN_PATH_DIST) {
    path.push(pt);
  }
}

function mouseReleased() {
  if (path.length < 2) return;
  systems = [];
  for (let pt of samplePath(path, CLUSTER_SPACING, MAX_CLUSTERS)) {
    systems.push(new ParticleSystem(pt, 200));
  }
}

function samplePath(pts, spacing, maxClusters) {
  let pathLengths = [0];
  for (let i = 1; i < pts.length; i++) {
    pathLengths.push(pathLengths[i - 1] + p5.Vector.dist(pts[i], pts[i - 1]));
  }
  let totalLen = pathLengths[pathLengths.length - 1];

  let sampled = [];
  let target = 0;
  while (target <= totalLen && sampled.length < maxClusters) {
    for (let j = 1; j < pts.length; j++) {
      if (pathLengths[j] >= target) {
        let t = (target - pathLengths[j - 1]) / (pathLengths[j] - pathLengths[j - 1]);
        sampled.push(p5.Vector.lerp(pts[j - 1], pts[j], t));
        break;
      }
    }
    target += spacing;
  }
  return sampled;
}
