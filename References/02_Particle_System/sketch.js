let systems = [];

function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(220);
  // orbitControl();
  for (let i = 0; i < systems.length; i++) {
    systems[i].display();
  }
}

function mouseDragged() {
  systems.push(
    new ParticleSystem(
      createVector(mouseX - width / 2, mouseY - height / 2, 0),
      200,
    ),
  );
}
