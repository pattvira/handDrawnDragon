const SPHERE_RADIUS = 20;
const PARTICLE_SIZE = SPHERE_RADIUS * 0.1;
const RADIAL_BIAS = 0.5;
const STAGGER = 0.8;

class Particle {
  constructor() {
    let theta = random(TWO_PI);
    let phi = acos(random(-1, 1));
    let r = SPHERE_RADIUS * pow(random(), RADIAL_BIAS);

    this.offset = createVector(
      r * sin(phi) * cos(theta),
      r * sin(phi) * sin(theta),
      r * cos(phi),
    );

    this.col = color(random(255), random(255), random(255));
    this.worldPos = createVector(0, 0, 0);
    this.sourcePos = createVector(0, 0, 0);
    this.targetPos = createVector(0, 0, 0);
    this.delay = random(1);
  }

  startMorph(newCenter) {
    this.sourcePos = this.worldPos.copy();
    this.targetPos = p5.Vector.add(newCenter, this.offset);
  }

  updateMorph(progress) {
    let localP = constrain(map(progress, this.delay * STAGGER, 1, 0, 1), 0, 1);
    this.worldPos = p5.Vector.lerp(this.sourcePos, this.targetPos, localP);
  }

  display(center, phase) {
    let pos =
      phase === 'idle'
        ? p5.Vector.add(center, this.offset)
        : this.worldPos;
    push();
    translate(pos.x, pos.y, pos.z);
    noStroke();
    fill(this.col);
    sphere(PARTICLE_SIZE, 10, 10);
    pop();
  }
}

class ParticleSystem {
  constructor(center, n) {
    this.center = center;
    this.particles = [];
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle());
    }
  }

  startMorph() {
    for (let p of this.particles) p.startMorph(this.center);
  }

  updateMorph(progress) {
    for (let p of this.particles) p.updateMorph(progress);
  }

  display(phase) {
    for (let p of this.particles) p.display(this.center, phase);
  }
}
