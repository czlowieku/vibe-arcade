export default {
  code: `
// === FOREST_COLORS ===
const FOREST_COLORS = {
  darkGreen: '#1a3a1a', green: '#2a6a2a', lightGreen: '#4a9a4a',
  leafGreen: '#66bb66', brown: '#5a3a1a', darkBrown: '#3a2010',
  trunk: '#6a4a2a', gold: '#ffcc44', firefly: '#ccff66',
  mushroom: '#cc4444', mushroomCap: '#ff6666',
  sky: '#1a2a3a', fog: 'rgba(150,180,150,0.1)',
  bg: '#0a1a0a',
  all: ['#2a6a2a', '#4a9a4a', '#66bb66', '#ffcc44', '#cc4444', '#8866aa']
};

// === FireflySystem ===
class FireflySystem {
  constructor(W, H, count) {
    this.W = W; this.H = H;
    this.fireflies = [];
    for (let i = 0; i < (count || 25); i++) {
      this.fireflies.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 2,
        size: 2 + Math.random() * 2,
        color: Math.random() < 0.7 ? FOREST_COLORS.firefly : FOREST_COLORS.gold
      });
    }
  }
  update(dt) {
    for (const f of this.fireflies) {
      f.phase += f.speed * dt;
      f.x += f.vx + Math.sin(f.phase) * 0.3;
      f.y += f.vy + Math.cos(f.phase * 0.7) * 0.2;
      if (f.x < -10) f.x = this.W + 10;
      if (f.x > this.W + 10) f.x = -10;
      if (f.y < -10) f.y = this.H + 10;
      if (f.y > this.H + 10) f.y = -10;
      // Random direction change
      if (Math.random() < 0.01) { f.vx = (Math.random() - 0.5) * 0.8; f.vy = (Math.random() - 0.5) * 0.8; }
    }
  }
  draw(ctx) {
    for (const f of this.fireflies) {
      const glow = (Math.sin(f.phase) + 1) / 2;
      if (glow < 0.3) continue;
      ctx.globalAlpha = glow * 0.8;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * glow, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

// === drawTree ===
function drawTree(ctx, x, y, size, trunkColor, leafColor) {
  const tc = trunkColor || FOREST_COLORS.trunk;
  const lc = leafColor || FOREST_COLORS.green;
  // Trunk
  ctx.fillStyle = tc;
  const tw = size * 0.2;
  const th = size * 0.6;
  ctx.fillRect(x - tw/2, y - th, tw, th);
  // Trunk detail
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x - tw/4, y - th, tw/4, th);
  // Canopy (layered circles)
  const layers = 3;
  for (let i = layers - 1; i >= 0; i--) {
    const ly = y - th - i * size * 0.25;
    const lr = size * 0.4 + (layers - i) * size * 0.05;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.arc(x + 3, ly + 3, lr, 0, Math.PI * 2);
    ctx.fill();
    // Leaf
    ctx.fillStyle = i === 0 ? lc : i === 1 ? FOREST_COLORS.lightGreen : FOREST_COLORS.leafGreen;
    ctx.beginPath();
    ctx.arc(x + (i - 1) * size * 0.1, ly, lr, 0, Math.PI * 2);
    ctx.fill();
  }
}

// === drawMushroom ===
function drawMushroom(ctx, x, y, size, capColor, stemColor) {
  const cc = capColor || FOREST_COLORS.mushroomCap;
  const sc = stemColor || '#eeddcc';
  // Stem
  ctx.fillStyle = sc;
  ctx.fillRect(x - size * 0.15, y - size * 0.5, size * 0.3, size * 0.5);
  // Cap
  ctx.fillStyle = cc;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.5, size * 0.4, Math.PI, 0);
  ctx.fill();
  // Spots
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - size * 0.15, y - size * 0.6, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 0.1, y - size * 0.65, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 0.05, y - size * 0.5, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

// === drawForestBackground ===
function drawForestBackground(ctx, W, H, time) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0a1a2a');
  skyGrad.addColorStop(0.3, '#1a2a3a');
  skyGrad.addColorStop(0.7, '#1a3a2a');
  skyGrad.addColorStop(1, '#0a1a0a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);
  // Moon
  ctx.fillStyle = '#ddeeff';
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.15, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Background trees (silhouettes)
  ctx.fillStyle = 'rgba(10,30,10,0.5)';
  for (let x = 0; x < W; x += 40 + Math.random() * 30) {
    const h = 80 + Math.random() * 120;
    ctx.beginPath();
    ctx.moveTo(x, H - 60);
    ctx.lineTo(x + 15, H - 60 - h);
    ctx.lineTo(x + 30, H - 60);
    ctx.fill();
  }
  // Ground
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(0, H - 60, W, 60);
  // Grass
  ctx.strokeStyle = '#2a4a2a';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 5) {
    const h = 5 + Math.random() * 10;
    const sway = Math.sin((time || 0) * 1.5 + x * 0.05) * 2;
    ctx.beginPath();
    ctx.moveTo(x, H - 60);
    ctx.lineTo(x + sway, H - 60 - h);
    ctx.stroke();
  }
  // Fog
  ctx.fillStyle = FOREST_COLORS.fog;
  ctx.fillRect(0, H * 0.5, W, H * 0.3);
}

// === Leaf particle ===
class FallingLeaves {
  constructor(W, H, count) {
    this.W = W; this.H = H;
    this.leaves = [];
    for (let i = 0; i < (count || 15); i++) {
      this.leaves.push({
        x: Math.random() * W, y: Math.random() * H,
        size: 3 + Math.random() * 4,
        speed: 0.3 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        color: Math.random() < 0.5 ? '#4a8a3a' : '#8a6a2a'
      });
    }
  }
  update(dt) {
    for (const l of this.leaves) {
      l.y += l.speed;
      l.wobble += l.wobbleSpeed * dt;
      l.x += Math.sin(l.wobble) * 0.5;
      l.rotation += l.rotSpeed;
      if (l.y > this.H + 10) { l.y = -10; l.x = Math.random() * this.W; }
    }
  }
  draw(ctx) {
    for (const l of this.leaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rotation);
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Magic sparkle system ===
class MagicSparkles {
  constructor(W, H) { this.W = W; this.H = H; this.sparkles = []; this.timer = 0; }
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.1 + Math.random() * 0.2;
      this.sparkles.push({
        x: Math.random() * this.W, y: Math.random() * this.H,
        size: 1 + Math.random() * 3, life: 0.5 + Math.random() * 1,
        maxLife: 0.5 + Math.random() * 1,
        color: Math.random() < 0.5 ? FOREST_COLORS.gold : '#aaddff'
      });
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      this.sparkles[i].life -= dt;
      this.sparkles[i].y -= 0.3;
      if (this.sparkles[i].life <= 0) this.sparkles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const s of this.sparkles) {
      const alpha = s.life / s.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      // Star shape
      const cx = s.x, cy = s.y, r = s.size;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.3, cy - r * 0.3);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx + r * 0.3, cy + r * 0.3);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.3, cy + r * 0.3);
      ctx.lineTo(cx - r, cy);
      ctx.lineTo(cx - r * 0.3, cy - r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
`,
    5: `
// === Day/night cycle ===
class DayNightCycle {
  constructor(W, H, cycleDuration) {
    this.W = W; this.H = H;
    this.cycleDuration = cycleDuration || 60;
    this.time = 0;
  }
  update(dt) { this.time += dt; }
  getPhase() { return (this.time % this.cycleDuration) / this.cycleDuration; }
  getAmbientColor() {
    const phase = this.getPhase();
    if (phase < 0.25) return 'rgba(0,0,50,0.3)'; // Night
    if (phase < 0.5) return 'rgba(255,200,100,0.1)'; // Dawn
    if (phase < 0.75) return 'rgba(255,255,200,0.05)'; // Day
    return 'rgba(255,100,50,0.15)'; // Dusk
  }
  apply(ctx) {
    ctx.fillStyle = this.getAmbientColor();
    ctx.fillRect(0, 0, this.W, this.H);
  }
}
// === Fog system ===
class ForestFog {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({ x: Math.random() * W, y: H * 0.4 + Math.random() * H * 0.3, w: 200 + Math.random() * 200, h: 40 + Math.random() * 30, speed: 0.1 + Math.random() * 0.2, alpha: 0.03 + Math.random() * 0.04 });
    }
  }
  update(dt) {
    for (const c of this.clouds) {
      c.x += c.speed;
      if (c.x > this.W + c.w) c.x = -c.w;
    }
  }
  draw(ctx) {
    for (const c of this.clouds) {
      ctx.globalAlpha = c.alpha;
      const grad = ctx.createRadialGradient(c.x + c.w/2, c.y, 0, c.x + c.w/2, c.y, c.w/2);
      grad.addColorStop(0, '#aaccaa');
      grad.addColorStop(1, 'rgba(150,180,150,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(c.x, c.y - c.h/2, c.w, c.h);
    }
    ctx.globalAlpha = 1;
  }
}
`
  },
  aiContext: 'FOREST_COLORS provides woodland palette. FireflySystem creates glowing, drifting fireflies. drawTree renders trees with trunk and layered canopy. drawMushroom draws spotted mushrooms. drawForestBackground makes a full forest scene with moon, silhouette trees, ground, and grass. FallingLeaves for drifting leaf particles.',
  provides: ['FOREST_COLORS', 'FireflySystem', 'drawTree', 'drawMushroom', 'drawForestBackground', 'FallingLeaves'],
  requires: [],
  conflicts: [],
  dependencies: []
};
