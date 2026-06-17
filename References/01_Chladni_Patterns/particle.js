const MAX_SPEED = 3;                   
const MAX_FORCE = 0.2;                                                                    
const TUBE_RADIUS = 25;
const SEP_DIST = 15;
const Z_SPREAD = 5;
                                                                                              
class Particle {                          
  constructor() {                                                                           
    this.pos = createVector(random(-width / 2, width / 2),
                            random(-height / 2, height / 2),
                            random(-Z_SPREAD, Z_SPREAD));                                                                                    
    this.vel = createVector(random(-1, 1), random(-1, 1), random(-0.5, 0.5));
    this.acc = createVector();                                                              
    this.restZ = random(-Z_SPREAD, Z_SPREAD);
  }                                                                                         
                                                        
  nearestOnPath() {                                                                         
    if (path.length === 0) return null;
    let nearest = null;                                                                   
    let minD = Infinity;
    for (let pt of path) {
        let d = dist(this.pos.x, this.pos.y, pt.x, pt.y);
        if (d < minD) { minD = d; nearest = pt; }                                             
      }                                                 
    return { point: nearest, dist2D: minD };                                                
  }                                                                                         
                                                                                            
  
  lineForce() {                                                                             
      let result = this.nearestOnPath(); 
      if (!result) return createVector();                                                   
      let { point, dist2D } = result;
      if (dist2D <= TUBE_RADIUS) return createVector();
      let target = createVector(point.x, point.y, this.restZ);                                
      let desired = p5.Vector.sub(target, this.pos);    
      desired.setMag(MAX_SPEED);                                                              
      let steer = p5.Vector.sub(desired, this.vel);                                           
      steer.limit(MAX_FORCE);                                                               
      return steer;                                                                           
    }  
  
  separate() {                            
    let steer = createVector();
    let count = 0;                                                                            
    for (let other of particles) {            
      if (other === this) continue;                                                           
      let d = p5.Vector.dist(this.pos, other.pos);          
      if (d > 0 && d < SEP_DIST) {                                                            
        let away = p5.Vector.sub(this.pos, other.pos);
        away.normalize().div(d);                                                              
        steer.add(away);                                    
        count++;                                                                              
      }
    }                                                                                         
    if (count > 0) {                                        
      steer.div(count).setMag(MAX_SPEED);                                                   
      let s = p5.Vector.sub(steer, this.vel); 
      s.limit(MAX_FORCE * 1.5);           
      return s;
    }                                                                                         
    return steer;
  } 
                         
    update() {
      this.acc.add(this.lineForce());                                                         
      this.acc.add(this.separate());                               
      this.vel.add(this.acc);                                                                 
      this.vel.limit(MAX_SPEED);         
      this.pos.add(this.vel);                                                               
      this.acc.mult(0);      
    }                                                                                         
                                                                   
    display() {                                                                               
      push();                            
      translate(this.pos.x, this.pos.y, this.pos.z);                                        
      noStroke();                                   
      fill(255); 
      sphere(3, 4, 4);
      pop();
    }                                                                                         
  } 