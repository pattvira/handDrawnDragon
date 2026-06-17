const SPHERE_RADIUS = 30;                                                     
const PARTICLE_SIZE = SPHERE_RADIUS * 0.05;

class Particle {
  constructor() {
    let theta = random(TWO_PI);                                                             
    let phi = acos(random(-1, 1));  
    let r = SPHERE_RADIUS;     
                                        
    this.offset = createVector(
      r * sin(phi) * cos(theta),                                                            
      r * sin(phi) * sin(theta),                                             
      r * cos(phi));
    }                                                                           
  
  display(center) {                                                          
      push();                                                                                 
      translate(                                            
        center.x + this.offset.x,                                                           
        center.y + this.offset.y,                                                             
        center.z + this.offset.z 
      );                                                                                      
      noStroke();                                           
      fill(0);                                                                       
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