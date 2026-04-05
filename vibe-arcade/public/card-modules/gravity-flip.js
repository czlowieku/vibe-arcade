export default {
  code: `
// === GravityFlipSystem ===
class GravityFlipSystem {
  constructor(options) {
    const opts = options || {};
    this.direction = 1; // 1 = down, -1 = up
    this.flipKey = opts.flipKey || 'Space';
    this.altFlipKey = opts.altFlipKey || 'KeyG';
    this.gravity = opts.gravity || 0.6;
    this.cooldown = 0;
    this.cooldownTime = opts.cooldownTime || 0.3;
    this.flipCount = 0;
    this.visualRotation = 0;
    this.targetRotation = 0;
    this.transitionSpeed = opts.transitionSpeed || 0.1;
    this.onFlip = opts.onFlip || null;
    this.arrowAlpha = 0;
  }
  tryFlip(keyCode) {
    if ((keyCode === this.flipKey || keyCode === this.altFlipKey) && this.cooldown <= 0) {
      this.direction *= -1;
      this.cooldown = this.cooldownTime;
      this.flipCount++;
      this.targetRotation += Math.PI;
      this.arrowAlpha = 1;
      if (this.onFlip) this.onFlip(this.direction, this.flipCount);
      return true;
    }
    return false;
  }
  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    this.visualRotation += (this.targetRotation - this.visualRotation) * this.transitionSpeed;
    this.arrowAlpha = Math.max(0, this.arrowAlpha - dt * 2);
  }
  applyGravity(entity) {
    entity.vy = (entity.vy || 0) + this.gravity * this.direction;
    entity.vy = Math.max(-15, Math.min(15, entity.vy));
    entity.y += entity.vy;
  }
  resolveFloor(entity, groundY, ceilingY) {
    entity.grounded = false;
    if (this.direction === 1) {
      // Normal gravity: check floor
      if (entity.y + entity.h >= groundY) {
        entity.y = groundY - entity.h;
        entity.vy = 0;
        entity.grounded = true;
      }
    } else {
      // Flipped gravity: check ceiling
      if (entity.y <= (ceilingY || 0)) {
        entity.y = ceilingY || 0;
        entity.vy = 0;
        entity.grounded = true;
      }
    }
  }
  getGravityDirection() {
    return this.direction;
  }
  isFlipped() {
    return this.direction === -1;
  }
  drawFlipEffect(ctx, W, H) {
    // Screen flash on flip
    if (this.arrowAlpha > 0) {
      ctx.globalAlpha = this.arrowAlpha * 0.15;
      ctx.fillStyle = this.direction === 1 ? '#4488ff' : '#ff4488';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // Direction arrow indicator
    if (this.arrowAlpha > 0) {
      const cx = W / 2, cy = H / 2;
      ctx.globalAlpha = this.arrowAlpha * 0.6;
      ctx.fillStyle = this.direction === 1 ? '#4488ff' : '#ff4488';
      ctx.font = 'bold 48px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(this.direction === 1 ? 'v' : '^', cx, cy);
      ctx.globalAlpha = 1;
    }
  }
  drawGravityIndicator(ctx, x, y, size) {
    const s = size || 20;
    ctx.strokeStyle = this.direction === 1 ? '#4488ff' : '#ff4488';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.direction === 1) {
      ctx.moveTo(x, y); ctx.lineTo(x + s/2, y + s); ctx.lineTo(x + s, y);
    } else {
      ctx.moveTo(x, y + s); ctx.lineTo(x + s/2, y); ctx.lineTo(x + s, y + s);
    }
    ctx.stroke();
    // Label
    ctx.fillStyle = '#888';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('GRAV', x + s + 5, y + s/2 + 4);
  }
  drawFlippedEntity(ctx, entity, drawFn) {
    if (this.direction === -1) {
      ctx.save();
      ctx.translate(entity.x + entity.w/2, entity.y + entity.h/2);
      ctx.scale(1, -1);
      ctx.translate(-(entity.x + entity.w/2), -(entity.y + entity.h/2));
      drawFn(ctx, entity);
      ctx.restore();
    } else {
      drawFn(ctx, entity);
    }
  }
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Gravity particles ===
class GravityParticles {
  constructor() { this.particles = []; }
  emitFlip(x, y, direction) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40, y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: direction * (2 + Math.random() * 3),
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.5 + Math.random() * 0.3,
        size: 2 + Math.random() * 2,
        color: direction === 1 ? '#4488ff' : '#ff4488'
      });
    }
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
`,
    5: `
// === Multi-directional gravity ===
class MultiGravity {
  constructor() {
    this.directions = [
      { name: 'down', gx: 0, gy: 0.6 },
      { name: 'up', gx: 0, gy: -0.6 },
      { name: 'left', gx: -0.6, gy: 0 },
      { name: 'right', gx: 0.6, gy: 0 },
    ];
    this.currentIdx = 0;
    this.cooldown = 0;
    this.transitionAlpha = 0;
  }
  rotate(clockwise) {
    if (this.cooldown > 0) return;
    this.cooldown = 0.5;
    this.transitionAlpha = 1;
    if (clockwise) { this.currentIdx = (this.currentIdx + 1) % 4; }
    else { this.currentIdx = (this.currentIdx + 3) % 4; }
  }
  update(dt) { this.cooldown = Math.max(0, this.cooldown - dt); this.transitionAlpha = Math.max(0, this.transitionAlpha - dt * 2); }
  getCurrent() { return this.directions[this.currentIdx]; }
  apply(entity) {
    const g = this.getCurrent();
    entity.vx = (entity.vx || 0) + g.gx;
    entity.vy = (entity.vy || 0) + g.gy;
    entity.x += entity.vx; entity.y += entity.vy;
  }
  drawIndicator(ctx, x, y) {
    const g = this.getCurrent();
    ctx.fillStyle = '#888';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GRAVITY: ' + g.name.toUpperCase(), x, y);
    if (this.transitionAlpha > 0) {
      ctx.globalAlpha = this.transitionAlpha * 0.2;
      ctx.fillStyle = '#8844ff';
      ctx.fillRect(0, 0, 800, 600);
      ctx.globalAlpha = 1;
    }
  }
}
`
  },
  aiContext: 'GravityFlipSystem toggles gravity direction on key press. tryFlip(keyCode) checks if the flip key was pressed and flips. applyGravity applies current gravity direction to entity. resolveFloor handles floor/ceiling collision based on direction. drawFlipEffect shows screen flash and direction arrow. drawGravityIndicator shows current gravity state. drawFlippedEntity renders entity upside-down when gravity is flipped.',
  provides: ['GravityFlipSystem'],
  requires: [],
  conflicts: [],
  dependencies: []
};
