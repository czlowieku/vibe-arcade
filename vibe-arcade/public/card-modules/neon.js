export default {
  code: `
// === NEON_COLORS ===
const NEON_COLORS = {
  cyan: '#00fff5', magenta: '#ff00ff', yellow: '#ffe600',
  green: '#00ff88', pink: '#ff6699', orange: '#ff8800',
  blue: '#4488ff', white: '#ffffff',
  bg: '#0a0a1a', bgLight: '#1a1a2e',
  all: ['#00fff5', '#ff00ff', '#ffe600', '#00ff88', '#ff6699', '#ff8800', '#4488ff']
};

// === drawNeonGlow ===
function drawNeonGlow(ctx, x, y, w, h, color, glowSize) {
  const glow = glowSize || 10;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = glow * 2;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

// === drawNeonCircle ===
function drawNeonCircle(ctx, x, y, radius, color, glowSize) {
  const glow = glowSize || 12;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = glow * 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// === drawNeonLine ===
function drawNeonLine(ctx, x1, y1, x2, y2, color, width, glowSize) {
  const glow = glowSize || 10;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// === drawNeonText ===
function drawNeonText(ctx, text, x, y, color, fontSize, glowSize) {
  const glow = glowSize || 15;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.font = 'bold ' + (fontSize || 24) + 'px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.shadowBlur = glow * 0.6;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

// === drawNeonBackground ===
function drawNeonBackground(ctx, W, H, time) {
  // Dark gradient bg
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(1, '#12122a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Grid lines
  ctx.strokeStyle = 'rgba(0,255,245,0.06)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  const offsetY = ((time || 0) * 30) % gridSize;
  for (let y = -gridSize + offsetY; y < H + gridSize; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  // Horizon glow
  const horizonGrad = ctx.createRadialGradient(W/2, H, 0, W/2, H, W * 0.6);
  horizonGrad.addColorStop(0, 'rgba(255,0,255,0.08)');
  horizonGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, 0, W, H);
}

// === NeonTrail ===
class NeonTrail {
  constructor(maxLength, color) {
    this.points = [];
    this.maxLength = maxLength || 20;
    this.color = color || '#00fff5';
  }
  add(x, y) {
    this.points.push({ x, y });
    if (this.points.length > this.maxLength) this.points.shift();
  }
  clear() { this.points = []; }
  draw(ctx) {
    if (this.points.length < 2) return;
    for (let i = 1; i < this.points.length; i++) {
      const alpha = i / this.points.length;
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = alpha * 4;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(this.points[i-1].x, this.points[i-1].y);
      ctx.lineTo(this.points[i].x, this.points[i].y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

// === NeonPulse - pulsing glow effect ===
class NeonPulse {
  constructor(color, speed) { this.color = color || '#00fff5'; this.speed = speed || 2; this.phase = 0; }
  update(dt) { this.phase += this.speed * (dt || 1/60); }
  getAlpha() { return 0.5 + Math.sin(this.phase) * 0.3; }
  getSize() { return 1 + Math.sin(this.phase) * 0.2; }
}

// === Neon border ===
function drawNeonBorder(ctx, W, H, color, width) {
  const w = width || 3;
  ctx.shadowColor = color || '#00fff5';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = color || '#00fff5';
  ctx.lineWidth = w;
  ctx.strokeRect(w/2, w/2, W - w, H - w);
  ctx.shadowBlur = 0;
}

// === Scanline overlay ===
function drawScanlines(ctx, W, H, alpha) {
  ctx.fillStyle = 'rgba(0,0,0,' + (alpha || 0.03) + ')';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === NeonParticleSystem ===
class NeonParticleSystem {
  constructor(maxParticles) { this.particles = []; this.max = maxParticles || 100; }
  emit(x, y, count, colors) {
    const c = colors || NEON_COLORS.all;
    for (let i = 0; i < count && this.particles.length < this.max; i++) {
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
        life: 0.5 + Math.random() * 1, maxLife: 0.5 + Math.random() * 1,
        size: 1 + Math.random() * 3, color: c[Math.floor(Math.random() * c.length)]
      });
    }
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
`,
    5: `
// === Neon bloom post-processing ===
function applyNeonBloom(ctx, canvas, intensity) {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.data;
  const threshold = 180;
  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
    if (brightness > threshold) {
      const boost = (intensity || 1.3);
      pixels[i] = Math.min(255, pixels[i] * boost);
      pixels[i+1] = Math.min(255, pixels[i+1] * boost);
      pixels[i+2] = Math.min(255, pixels[i+2] * boost);
    }
  }
  ctx.putImageData(data, 0, 0);
}
// === Chromatic aberration ===
function drawChromaticAberration(ctx, canvas, offset) {
  const o = offset || 2;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.3;
  ctx.drawImage(canvas, o, 0);
  ctx.drawImage(canvas, -o, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
`
  },
  aiContext: 'NEON_COLORS provides a palette. drawNeonGlow/Circle/Line/Text all add glowing shadow effects. drawNeonBackground draws a grid-lined dark bg. NeonTrail tracks positions for a trailing glow effect. NeonPulse provides oscillating size/alpha. drawNeonBorder, drawScanlines for screen effects.',
  provides: ['NEON_COLORS', 'drawNeonGlow', 'drawNeonCircle', 'drawNeonLine', 'drawNeonText', 'drawNeonBackground', 'NeonTrail', 'NeonPulse', 'drawNeonBorder', 'drawScanlines'],
  requires: [],
  conflicts: [],
  dependencies: []
};
