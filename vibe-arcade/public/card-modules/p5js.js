export default {
  code: `
// === p5.js helper utilities ===

function p5DrawGrid(p, cols, rows, cellW, cellH, color) {
  p.stroke(color || 50);
  p.strokeWeight(1);
  for (let x = 0; x <= cols; x++) {
    p.line(x * cellW, 0, x * cellW, rows * cellH);
  }
  for (let y = 0; y <= rows; y++) {
    p.line(0, y * cellH, cols * cellW, y * cellH);
  }
}

function p5DrawGlow(p, x, y, size, color, glowSize) {
  p.noStroke();
  const c = p.color(color);
  for (let i = glowSize || 3; i > 0; i--) {
    c.setAlpha(30 / i);
    p.fill(c);
    p.ellipse(x, y, size + i * 4, size + i * 4);
  }
  c.setAlpha(255);
  p.fill(c);
  p.ellipse(x, y, size, size);
}

function p5DrawProgressBar(p, x, y, w, h, value, maxValue, color, bgColor) {
  p.noStroke();
  p.fill(bgColor || 30);
  p.rect(x, y, w, h);
  p.fill(color || p.color(0, 255, 136));
  p.rect(x, y, w * (value / maxValue), h);
  p.stroke(80);
  p.noFill();
  p.rect(x, y, w, h);
}

function p5Ease(t, type) {
  switch (type || 'easeInOut') {
    case 'easeIn': return t * t;
    case 'easeOut': return t * (2 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'elastic': return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    default: return t;
  }
}

class P5ParticleSystem {
  constructor(p) {
    this.p = p;
    this.particles = [];
  }
  emit(x, y, count, color, speedRange) {
    for (let i = 0; i < (count || 5); i++) {
      const speed = speedRange || 4;
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color: color || this.p.color(255, 230, 0)
      });
    }
  }
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.1;
      p.life -= 1/60;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  draw() {
    this.p.noStroke();
    for (const pt of this.particles) {
      const alpha = (pt.life / pt.maxLife) * 255;
      const c = this.p.color(pt.color.levels ? pt.color.levels[0] : 255, pt.color.levels ? pt.color.levels[1] : 230, pt.color.levels ? pt.color.levels[2] : 0, alpha);
      this.p.fill(c);
      this.p.ellipse(pt.x, pt.y, pt.size);
    }
  }
}

function p5CreateEntity(x, y, w, h, color) {
  return {
    x: x || 0, y: y || 0, w: w || 30, h: h || 30,
    vx: 0, vy: 0, color: color || '#00fff5',
    draw(p) {
      p.fill(this.color);
      p.noStroke();
      p.rect(this.x, this.y, this.w, this.h);
    },
    collidesWith(other) {
      return this.x < other.x + other.w && this.x + this.w > other.x &&
             this.y < other.y + other.h && this.y + this.h > other.y;
    }
  };
}

function p5ShakeScreen(p, intensity) {
  if (intensity > 0) {
    p.translate(
      (Math.random() - 0.5) * intensity * 2,
      (Math.random() - 0.5) * intensity * 2
    );
  }
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const W = canvas.width, H = canvas.height;
  let score = 0;
  let running = true;

  const sketch = (p) => {
    let player;
    const keys = {};

    p.setup = () => {
      const c = p.createCanvas(W, H);
      c.parent(canvas.parentNode);
      // Replace the original canvas content
      canvas.style.display = 'none';

      player = p5CreateEntity(W/2 - 15, H - 60, 30, 40, '#00fff5');
    };

    p.draw = () => {
      if (!running) return;

      // === UPDATE ===
      if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) player.x -= 5;
      if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) player.x += 5;
      if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) player.y -= 5;
      if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) player.y += 5;

      player.x = p.constrain(player.x, 0, W - player.w);
      player.y = p.constrain(player.y, 0, H - player.h);

      score++;
      if (score % 60 === 0) onScore(1);

      // === RENDER ===
      p.background(10, 10, 26);
      player.draw(p);

      p.fill(255);
      p.textFont('Courier New');
      p.textSize(20);
      p.textAlign(p.LEFT);
      p.text('SCORE: ' + Math.floor(score / 60), 15, 30);
    };

    p.keyPressed = () => {
      keys[p.keyCode] = true;
    };

    p.keyReleased = () => {
      keys[p.keyCode] = false;
    };
  };

  new p5(sketch);
}
`,
  tierCode: {
    3: `
// === p5 trail effect ===
class P5Trail {
  constructor(p, maxLen) { this.p = p; this.points = []; this.maxLen = maxLen || 20; }
  add(x, y) {
    this.points.push({ x, y });
    if (this.points.length > this.maxLen) this.points.shift();
  }
  draw(color) {
    for (let i = 1; i < this.points.length; i++) {
      const alpha = (i / this.points.length) * 150;
      this.p.stroke(this.p.red(this.p.color(color || '#00fff5')), this.p.green(this.p.color(color || '#00fff5')), this.p.blue(this.p.color(color || '#00fff5')), alpha);
      this.p.strokeWeight(i / this.points.length * 4);
      this.p.line(this.points[i-1].x, this.points[i-1].y, this.points[i].x, this.points[i].y);
    }
  }
}
`,
    5: `
// === p5 post-processing ===
function p5ApplyVignette(p, intensity) {
  p.loadPixels();
  const cx = p.width/2, cy = p.height/2;
  const maxDist = Math.sqrt(cx*cx + cy*cy);
  for (let y = 0; y < p.height; y += 2) {
    for (let x = 0; x < p.width; x += 2) {
      const dist = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy));
      const factor = 1 - (dist / maxDist) * (intensity || 0.5);
      const idx = (y * p.width + x) * 4;
      p.pixels[idx] *= factor;
      p.pixels[idx+1] *= factor;
      p.pixels[idx+2] *= factor;
    }
  }
  p.updatePixels();
}
`
  },
  aiContext: 'p5.js helper utilities. p5DrawGrid for grid lines. p5DrawGlow for glowing circles. p5DrawProgressBar for UI bars. P5ParticleSystem for particles. p5CreateEntity for simple game objects with collision. The scaffold creates a new p5 instance using the canvas, with setup/draw pattern.',
  provides: ['p5DrawGrid', 'p5DrawGlow', 'p5DrawProgressBar', 'p5Ease', 'P5ParticleSystem', 'p5CreateEntity', 'p5ShakeScreen'],
  requires: [],
  conflicts: ['phaser', 'pixijs', 'matterjs'],
  dependencies: ['https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js']
};
