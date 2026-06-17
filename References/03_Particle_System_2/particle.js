const SPHERE_RADIUS = 20;
const PARTICLE_SIZE = SPHERE_RADIUS * 0.1;

class Particle {
  constructor() {
    let theta = random(TWO_PI);
    let phi = acos(random(-1, 1));
    let r = SPHERE_RADIUS;

    this.offset = createVector(
      r * sin(phi) * cos(theta),
      r * sin(phi) * sin(theta),
      r * cos(phi),
    );

    this.col = color(random(255), random(255), random(255));
  }

  display(center) {
    push();
    translate(
      center.x + this.offset.x,
      center.y + this.offset.y,
      center.z + this.offset.z,
    );
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

  display() {
    for (let p of this.particles) {
      p.display(this.center);
    }
  }
}
