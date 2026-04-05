export default {
  code: `
// === OCEAN_COLORS ===
const OCEAN_COLORS = {
  deepBlue: '#0a1628', midBlue: '#1a3a5c', lightBlue: '#2a5a8a',
  teal: '#1a8a8a', cyan: '#00cccc', aqua: '#66dddd',
  sand: '#c4a35a', coral: '#ff6b6b', coralDark: '#cc4444',
  seaweed: '#2a8a4a', seaweedDark: '#1a6a3a',
  bubbleColor: 'rgba(200,240,255,0.3)',
  fish1: '#ff8844', fish2: '#44aaff', fish3: '#ffcc00', fish4: '#ff44aa',
  bg: '#0a1628',
  all: ['#ff8844', '#44aaff', '#ffcc00', '#ff44aa', '#00cccc', '#ff6b6b']
};

// === WaterEffect ===
class WaterEffect {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.waves = [];
    for (let i = 0; i < 3; i++) {
      this.waves.push({
        amplitude: 3 + i * 2, frequency: 0.02 - i * 0.005,
        speed: 0.5 + i * 0.3, phase: Math.random() * Math.PI * 2,
        y: 30 + i * 20, color: i === 0 ? 'rgba(0,150,200,0.15)' : i === 1 ? 'rgba(0,100,180,0.1)' : 'rgba(0,80,150,0.08)'
      });
    }
    this.lightRays = [];
    for (let i = 0; i < 5; i++) {
      this.lightRays.push({
        x: Math.random() * W, width: 30 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3, alpha: 0.03 + Math.random() * 0.03
      });
    }
  }
  update(dt) {
    for (const w of this.waves) w.phase += w.speed * (dt || 1/60);
    for (const r of this.lightRays) {
      r.x += r.speed;
      if (r.x > this.W + r.width) r.x = -r.width;
    }
  }
  draw(ctx) {
    // Light rays from surface
    for (const r of this.lightRays) {
      ctx.globalAlpha = r.alpha;
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.moveTo(r.x, 0);
      ctx.lineTo(r.x + r.width * 0.3, 0);
      ctx.lineTo(r.x + r.width, this.H);
      ctx.lineTo(r.x - r.width * 0.5, this.H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Waves
    for (const w of this.waves) {
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= this.W; x += 5) {
        const y = w.y + Math.sin(x * w.frequency + w.phase) * w.amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.W, 0);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// === BubbleSystem ===
class BubbleSystem {
  constructor(W, H, maxBubbles) {
    this.W = W; this.H = H; this.bubbles = [];
    this.maxBubbles = maxBubbles || 30;
    this.spawnTimer = 0;
  }
  emit(x, y, count) {
    for (let i = 0; i < (count || 1); i++) {
      if (this.bubbles.length >= this.maxBubbles) break;
      this.bubbles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y,
        size: 2 + Math.random() * 6,
        speed: 0.5 + Math.random() * 1.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.4
      });
    }
  }
  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.3 + Math.random() * 0.5;
      this.emit(Math.random() * this.W, this.H + 10, 1);
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.speed;
      b.wobble += b.wobbleSpeed * dt;
      b.x += Math.sin(b.wobble) * 0.5;
      if (b.y + b.size < 0) this.bubbles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const b of this.bubbles) {
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = 'rgba(200,240,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.stroke();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(b.x - b.size * 0.25, b.y - b.size * 0.25, b.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// === drawFish ===
function drawFish(ctx, x, y, size, color, direction, time) {
  const dir = direction || 1;
  const tailWag = Math.sin((time || 0) * 5) * 5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  // Body
  ctx.fillStyle = color || OCEAN_COLORS.fish1;
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size - size * 0.6, -size * 0.4 + tailWag);
  ctx.lineTo(-size - size * 0.6, size * 0.4 + tailWag);
  ctx.closePath();
  ctx.fill();
  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(size * 0.4, -size * 0.1, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(size * 0.45, -size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// === drawCoral ===
function drawCoral(ctx, x, y, size, color) {
  const c = color || OCEAN_COLORS.coral;
  ctx.fillStyle = c;
  // Main branches
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i - 2) * 0.3;
    const len = size * (0.6 + Math.random() * 0.4);
    const bx = x + Math.cos(angle) * len;
    const by = y + Math.sin(angle) * len;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.quadraticCurveTo(x + (bx - x) * 0.5, y + (by - y) * 0.3, bx, by);
    ctx.quadraticCurveTo(x + (bx - x) * 0.5 + 6, y + (by - y) * 0.3, x + 3, y);
    ctx.fill();
    // Tips
    ctx.beginPath();
    ctx.arc(bx, by, 3 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// === drawSeaweed ===
function drawSeaweed(ctx, x, y, height, time, color) {
  const c = color || OCEAN_COLORS.seaweed;
  const segments = 8;
  const segH = height / segments;
  ctx.strokeStyle = c;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= segments; i++) {
    const sway = Math.sin((time || 0) * 1.5 + i * 0.5) * (5 + i * 2);
    const sy = y - i * segH;
    ctx.lineTo(x + sway, sy);
  }
  ctx.stroke();
  // Leaves
  ctx.fillStyle = c;
  for (let i = 2; i < segments; i += 2) {
    const sway = Math.sin((time || 0) * 1.5 + i * 0.5) * (5 + i * 2);
    const sy = y - i * segH;
    ctx.beginPath();
    ctx.ellipse(x + sway + 8, sy, 8, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// === Ocean background ===
function drawOceanBackground(ctx, W, H, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a4a6a');
  grad.addColorStop(0.4, '#0a2a4a');
  grad.addColorStop(1, '#0a1628');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Sandy bottom
  ctx.fillStyle = '#3a3020';
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = '#4a4030';
  for (let x = 0; x < W; x += 15 + Math.random() * 10) {
    const bh = 5 + Math.random() * 10;
    ctx.beginPath();
    ctx.arc(x, H - 30, bh, Math.PI, 0);
    ctx.fill();
  }
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Fish school ===
class FishSchool {
  constructor(count, W, H) {
    this.fish = [];
    for (let i = 0; i < (count || 8); i++) {
      this.fish.push({
        x: Math.random() * W, y: 100 + Math.random() * (H - 200),
        speed: 0.5 + Math.random() * 1.5, dir: Math.random() < 0.5 ? 1 : -1,
        size: 8 + Math.random() * 8,
        color: OCEAN_COLORS.all[Math.floor(Math.random() * OCEAN_COLORS.all.length)],
        wobble: Math.random() * Math.PI * 2
      });
    }
    this.W = W; this.H = H;
  }
  update(dt) {
    for (const f of this.fish) {
      f.x += f.speed * f.dir;
      f.wobble += dt * 2;
      f.y += Math.sin(f.wobble) * 0.3;
      if (f.x > this.W + 30) { f.x = -30; f.dir = 1; }
      if (f.x < -30) { f.x = this.W + 30; f.dir = -1; }
    }
  }
  draw(ctx, time) {
    for (const f of this.fish) drawFish(ctx, f.x, f.y, f.size, f.color, f.dir, time);
  }
}
`,
    5: `
// === Water distortion effect ===
class WaterDistortion {
  constructor(W, H) { this.W = W; this.H = H; this.time = 0; }
  update(dt) { this.time += dt; }
  apply(ctx, canvas) {
    // Simplified water distortion using offset drawing
    const sliceH = 4;
    for (let y = 0; y < this.H; y += sliceH) {
      const offset = Math.sin(this.time * 2 + y * 0.02) * 2;
      ctx.drawImage(canvas, 0, y, this.W, sliceH, offset, y, this.W, sliceH);
    }
  }
}
// === Current system ===
class OceanCurrents {
  constructor(W, H) {
    this.currents = [];
    for (let i = 0; i < 3; i++) {
      this.currents.push({
        y: 100 + i * 150, height: 60, strength: (Math.random() - 0.5) * 2,
        particles: Array.from({length: 10}, () => ({ x: Math.random() * W, offset: Math.random() * 60 }))
      });
    }
    this.W = W;
  }
  applyTo(entity) {
    for (const c of this.currents) {
      if (entity.y > c.y && entity.y < c.y + c.height) {
        entity.x += c.strength;
      }
    }
  }
  draw(ctx) {
    for (const c of this.currents) {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#44aaff';
      ctx.fillRect(0, c.y, this.W, c.height);
      ctx.globalAlpha = 0.3;
      for (const p of c.particles) {
        p.x += c.strength;
        if (p.x > this.W) p.x = 0;
        if (p.x < 0) p.x = this.W;
        ctx.fillRect(p.x, c.y + p.offset, 8, 2);
      }
      ctx.globalAlpha = 1;
    }
  }
}
`
  },
  aiContext: 'OCEAN_COLORS provides underwater palette. WaterEffect draws light rays and surface waves. BubbleSystem spawns rising bubbles with wobble. drawFish renders a fish with tail animation. drawCoral/drawSeaweed for underwater flora. drawOceanBackground creates gradient with sandy bottom.',
  provides: ['OCEAN_COLORS', 'WaterEffect', 'BubbleSystem', 'drawFish', 'drawCoral', 'drawSeaweed', 'drawOceanBackground'],
  requires: [],
  conflicts: [],
  dependencies: []
};
