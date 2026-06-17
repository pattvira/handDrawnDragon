let particles = [];                                                                         
const NUM_PARTICLES = 500;             
const MIN_PATH_DIST = 3;                                                                  
let path = [];
let orbitMode = false;

function setup() {
  createCanvas(400, 400, WEBGL);
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push(new Particle());                                                         
  }                                        
}                                                                                           

function draw() {                      
  background(0);                                                                          
    if (orbitMode) orbitControl();
                                  
    if (path.length > 1) {                                                                    
      push();    
      strokeWeight(4);
      stroke(255, 0, 0);                                                                        
      noFill();                          
      beginShape();                                                                         
      for (let p of path) vertex(p.x, p.y, 0);
      endShape();                             
      pop();                                                                                  
    }                                        
                                                                                              
    for (let p of particles) {           
      p.update();                                                                           
      p.display();
    }             
  }  
   
  function mousePressed() {
    if (!orbitMode) path = [];
  }                           
                                                                                              
  function mouseDragged() {                  
    if (orbitMode) return;                                                                    
    let x = mouseX - width / 2;          
    let y = mouseY - height / 2;                                                            
    let pt = createVector(x, y, 0);
    if (path.length === 0 || p5.Vector.dist(pt, path[path.length - 1]) > MIN_PATH_DIST) {
      path.push(pt);                                                                          
    }                                       
  }                                                                                           
                                         
  function keyPressed() {                                                                   
    orbitMode = !orbitMode;
  }
                                                                                              
                                                                                         
      