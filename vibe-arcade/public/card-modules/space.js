export default {
  code: `
// === SPACE_COLORS ===
const SPACE_COLORS = {
  bg: '#050510', deepBlue: '#0a0a2e', nebula: '#1a0a3a',
  star: '#ffffff', starDim: '#8888aa', starBright: '#ffffcc',
  ship: '#4488ff', enemy: '#ff4444', bullet: '#ffe600',
  planet1: '#3366aa', planet2: '#cc6633', planet3: '#448844',
  asteroid: '#887766', explosion: '#ff8800',
  all: ['#4488ff', '#ff4444', '#ffe600', '#00ff88', '#ff8800', '#aa44ff']
};

// === Starfield class ===
class Starfield {
  constructor(W, H, numStars, numLayers) {
    this.W = W; this.H = H;
    this.layers = [];
    const layers = numLayers || 3;
    for (let l = 0; l < layers; l++) {
      const stars = [];
      const count = Math.floor((numStars || 100) / layers);
      const speed = 0.2 + l * 0.4;
      const brightness = 0.3 + l * 0.25;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 0.5 + l * 0.5 + Math.random() * 0.5,
          twinkle: Math.random() * Math.PI * 2
        });
      }
      this.layers.push({ stars, speed, brightness });
    }
  }
  update(dt) {
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        star.y += layer.speed;
        star.twinkle += 0.03;
        if (star.y > this.H) { star.y = 0; star.x = Math.random() * this.W; }
      }
    }
  }
  draw(ctx) {
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        const twinkle = 0.5 + Math.sin(star.twinkle) * 0.5;
        const alpha = layer.brightness * twinkle;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// === drawPlanet ===
function drawPlanet(ctx, x, y, radius, color1, color2, hasRing) {
  // Planet body
  const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  grad.addColorStop(0, color1 || '#4488cc');
  grad.addColorStop(1, color2 || '#224466');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Ring
  if (hasRing) {
    ctx.strokeStyle = 'rgba(200,200,220,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.8, radius * 0.4, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// === drawAsteroid ===
function drawAsteroid(ctx, x, y, size, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation || 0);
  ctx.fillStyle = SPACE_COLORS.asteroid;
  ctx.beginPath();
  const verts = 8;
  for (let i = 0; i < verts; i++) {
    const angle = (i / verts) * Math.PI * 2;
    const r = size * (0.7 + Math.sin(i * 3.7) * 0.3);
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // Craters
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.arc(size * 0.2, -size * 0.1, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-size * 0.3, size * 0.2, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// === drawSpaceBackground ===
function drawSpaceBackground(ctx, W, H, time) {
  // Deep space gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#050510');
  grad.addColorStop(0.5, '#0a0a2e');
  grad.addColorStop(1, '#0f0520');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Nebula clouds
  const t = time || 0;
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#4400aa';
  ctx.beginPath();
  ctx.arc(W * 0.3 + Math.sin(t * 0.1) * 30, H * 0.4, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#aa0044';
  ctx.beginPath();
  ctx.arc(W * 0.7 + Math.cos(t * 0.08) * 20, H * 0.6, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// === Space dust particles ===
class SpaceDust {
  constructor(W, H, count) {
    this.W = W; this.H = H;
    this.particles = [];
    for (let i = 0; i < (count || 30); i++) {
      this.particles.push({
        x: Math.random() * W, y: Math.random() * H,
        speed: 0.1 + Math.random() * 0.3,
        size: Math.random() * 1.5, alpha: 0.1 + Math.random() * 0.3
      });
    }
  }
  update() {
    for (const p of this.particles) {
      p.y += p.speed;
      if (p.y > this.H) { p.y = 0; p.x = Math.random() * this.W; }
    }
  }
  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#8888cc';
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

// === Meteor shower ===
function drawMeteor(ctx, x, y, length, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle || 0.8);
  const grad = ctx.createLinearGradient(0, 0, length || 40, 0);
  grad.addColorStop(0, color || '#ffffff');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length || 40, 0);
  ctx.stroke();
  ctx.restore();
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Nebula system ===
class NebulaSystem {
  constructor(W, H) {
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * W, y: Math.random() * H,
        radius: 80 + Math.random() * 120,
        color: SPACE_COLORS.all[Math.floor(Math.random() * SPACE_COLORS.all.length)],
        drift: { x: (Math.random() - 0.5) * 0.1, y: (Math.random() - 0.5) * 0.1 }
      });
    }
  }
  update() { for (const c of this.clouds) { c.x += c.drift.x; c.y += c.drift.y; } }
  draw(ctx) {
    for (const c of this.clouds) {
      ctx.globalAlpha = 0.04;
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
      grad.addColorStop(0, c.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
`,
    5: `
// === Warp speed effect ===
class WarpEffect {
  constructor(W, H) {
    this.W = W; this.H = H; this.lines = [];
    this.active = false; this.intensity = 0;
    for (let i = 0; i < 50; i++) {
      this.lines.push({ angle: Math.random() * Math.PI * 2, dist: Math.random(), speed: 0.5 + Math.random() * 2 });
    }
  }
  activate() { this.active = true; }
  deactivate() { this.active = false; }
  update(dt) {
    this.intensity += ((this.active ? 1 : 0) - this.intensity) * 0.05;
    for (const l of this.lines) {
      l.dist += l.speed * this.intensity * dt;
      if (l.dist > 1) l.dist = 0;
    }
  }
  draw(ctx) {
    if (this.intensity < 0.01) return;
    const cx = this.W/2, cy = this.H/2;
    ctx.globalAlpha = this.intensity * 0.5;
    for (const l of this.lines) {
      const len = l.dist * this.W * 0.6;
      const r1 = len * 0.8, r2 = len;
      const x1 = cx + Math.cos(l.angle) * r1;
      const y1 = cy + Math.sin(l.angle) * r1;
      const x2 = cx + Math.cos(l.angle) * r2;
      const y2 = cy + Math.sin(l.angle) * r2;
      ctx.strokeStyle = '#aaccff';
      ctx.lineWidth = 1 + l.dist * 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
`
  },
  aiContext: 'SPACE_COLORS provides a space palette. Starfield creates multi-layer parallax stars with twinkle. drawPlanet renders gradient planets with optional rings. drawAsteroid draws rocky asteroids. drawSpaceBackground creates deep space gradient with nebula hints. SpaceDust for floating particles. drawMeteor for streak effects.',
  provides: ['SPACE_COLORS', 'Starfield', 'drawPlanet', 'drawAsteroid', 'drawSpaceBackground', 'SpaceDust', 'drawMeteor'],
  requires: [],
  conflicts: [],
  dependencies: []
};
