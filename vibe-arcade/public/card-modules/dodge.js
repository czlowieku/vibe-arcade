export default {
  code: `
// === ProjectileSpawner for dodge ===
class ProjectileSpawner {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.threats = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.5;
    this.minInterval = 0.15;
    this.patterns = ['top', 'sides', 'corners', 'rain', 'spiral'];
    this.currentPattern = 'top';
    this.patternTimer = 0;
    this.patternDuration = 5;
    this.difficulty = 1;
  }
  update(dt) {
    this.patternTimer += dt;
    if (this.patternTimer >= this.patternDuration) {
      this.patternTimer = 0;
      this.currentPattern = this.patterns[Math.floor(Math.random() * this.patterns.length)];
      this.difficulty += 0.2;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(this.minInterval, this.spawnInterval / this.difficulty);
      this.spawnByPattern();
    }
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const t = this.threats[i];
      t.x += t.vx; t.y += t.vy;
      if (t.x < -30 || t.x > this.W + 30 || t.y < -30 || t.y > this.H + 30) {
        this.threats.splice(i, 1);
      }
    }
  }
  spawnByPattern() {
    const speed = 3 + this.difficulty * 0.5;
    switch (this.currentPattern) {
      case 'top':
        this.threats.push(createThreat(Math.random() * this.W, -15, 0, speed, 10, '#ff4444'));
        break;
      case 'sides':
        if (Math.random() < 0.5) {
          this.threats.push(createThreat(-15, Math.random() * this.H, speed, 0, 10, '#ff8800'));
        } else {
          this.threats.push(createThreat(this.W + 15, Math.random() * this.H, -speed, 0, 10, '#ff8800'));
        }
        break;
      case 'corners': {
        const corner = Math.floor(Math.random() * 4);
        const cx = corner % 2 === 0 ? -15 : this.W + 15;
        const cy = corner < 2 ? -15 : this.H + 15;
        const angle = Math.atan2(this.H/2 - cy, this.W/2 - cx) + (Math.random() - 0.5) * 1;
        this.threats.push(createThreat(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, 12, '#ff00ff'));
        break;
      }
      case 'rain':
        for (let i = 0; i < 3; i++) {
          this.threats.push(createThreat(Math.random() * this.W, -15 - i * 20, 0, speed * 0.8, 8, '#44aaff'));
        }
        break;
      case 'spiral': {
        const angle = Date.now() / 200;
        const cx = this.W/2 + Math.cos(angle) * this.W/2;
        this.threats.push(createThreat(cx, -15, Math.sin(angle) * 2, speed, 10, '#44ff44'));
        break;
      }
    }
  }
  draw(ctx) {
    for (const t of this.threats) t.draw(ctx);
  }
}

// === SafeZoneDetector ===
class SafeZoneDetector {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.zones = [];
    this.zoneTimer = 0;
  }
  update(dt) {
    this.zoneTimer -= dt;
    if (this.zoneTimer <= 0) {
      this.zoneTimer = 8 + Math.random() * 5;
      const size = 60 + Math.random() * 40;
      this.zones.push({
        x: Math.random() * (this.W - size),
        y: Math.random() * (this.H - size),
        w: size, h: size,
        life: 3, maxLife: 3, healing: true
      });
    }
    for (let i = this.zones.length - 1; i >= 0; i--) {
      this.zones[i].life -= dt;
      if (this.zones[i].life <= 0) this.zones.splice(i, 1);
    }
  }
  isInSafeZone(entity) {
    for (const z of this.zones) {
      if (entity.x + entity.w > z.x && entity.x < z.x + z.w &&
          entity.y + entity.h > z.y && entity.y < z.y + z.h) {
        return z;
      }
    }
    return null;
  }
  draw(ctx) {
    for (const z of this.zones) {
      const alpha = z.life / z.maxLife * 0.3;
      ctx.fillStyle = 'rgba(0,255,100,' + alpha + ')';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = 'rgba(0,255,100,' + (alpha + 0.2) + ')';
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = 'rgba(0,255,100,0.7)';
      ctx.font = '12px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('SAFE', z.x + z.w/2, z.y + z.h/2 + 4);
    }
  }
}

// === createDodger ===
function createDodger(x, y, size, color, speed) {
  return {
    x: x || 400, y: y || 300, w: size || 20, h: size || 20,
    color: color || '#00fff5', speed: speed || 5,
    health: 3, maxHealth: 3, alive: true,
    invulnTimer: 0, dashCooldown: 0,
    trail: [],
    update(keys, W, H) {
      let dx = 0, dy = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
      if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
      if (keys['ArrowUp'] || keys['KeyW']) dy = -1;
      if (keys['ArrowDown'] || keys['KeyS']) dy = 1;
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      this.x += dx * this.speed;
      this.y += dy * this.speed;
      this.x = Math.max(0, Math.min(this.x, W - this.w));
      this.y = Math.max(0, Math.min(this.y, H - this.h));
      if (this.invulnTimer > 0) this.invulnTimer -= 1/60;
      if (this.dashCooldown > 0) this.dashCooldown -= 1/60;
      // Trail
      if (dx || dy) {
        this.trail.push({ x: this.x + this.w/2, y: this.y + this.h/2, life: 0.3 });
      }
      for (let i = this.trail.length - 1; i >= 0; i--) {
        this.trail[i].life -= 1/60;
        if (this.trail[i].life <= 0) this.trail.splice(i, 1);
      }
    },
    dash(keys) {
      if (this.dashCooldown > 0) return;
      this.dashCooldown = 1;
      this.invulnTimer = 0.3;
      let dx = 0, dy = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
      if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
      if (keys['ArrowUp'] || keys['KeyW']) dy = -1;
      if (keys['ArrowDown'] || keys['KeyS']) dy = 1;
      if (!dx && !dy) dx = 1;
      this.x += dx * 80;
      this.y += dy * 80;
    },
    draw(ctx) {
      // Trail
      for (const t of this.trail) {
        ctx.globalAlpha = t.life / 0.3 * 0.3;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Player
      if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0) return;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x + this.w - 7, this.y + 4, 4, 4);
    },
    drawHealthBar(ctx) {
      for (let i = 0; i < this.maxHealth; i++) {
        ctx.fillStyle = i < this.health ? '#00ff88' : '#333';
        ctx.fillRect(15 + i * 22, 50, 18, 8);
      }
    }
  };
}

// === createThreat ===
function createThreat(x, y, vx, vy, size, color) {
  return {
    x: x, y: y, vx: vx || 0, vy: vy || 3,
    size: size || 10, color: color || '#ff4444',
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(this.x - 2, this.y - 2, this.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

// === checkDodgerHit ===
function checkDodgerHit(dodger, threats) {
  if (dodger.invulnTimer > 0) return false;
  for (const t of threats) {
    const cx = dodger.x + dodger.w/2;
    const cy = dodger.y + dodger.h/2;
    const dx = cx - t.x;
    const dy = cy - t.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < t.size + Math.max(dodger.w, dodger.h) / 2 - 4) {
      dodger.health--;
      dodger.invulnTimer = 1;
      if (dodger.health <= 0) dodger.alive = false;
      return true;
    }
  }
  return false;
}

// === Warning indicator ===
function drawWarning(ctx, x, y, size) {
  const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ff4444';
  ctx.font = (size || 14) + 'px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y);
  ctx.globalAlpha = 1;
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const spawner = new ProjectileSpawner(W, H);
  const safeZones = new SafeZoneDetector(W, H);
  const dodger = createDodger(W/2 - 10, H/2 - 10, 20, '#00fff5', 5);
  let score = 0;
  let gameTime = 0;
  let survivalScore = 0;
  // === INPUT ===
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') dodger.dash(keys);
  });
  window.addEventListener('keyup', e => keys[e.code] = false);
  let running = true;
  function gameLoop() {
    if (!running) return;
    const dt = 1/60;
    gameTime += dt;
    survivalScore += dt;
    if (Math.floor(survivalScore) > Math.floor(survivalScore - dt)) {
      const pts = Math.floor(survivalScore);
      score = pts;
      onScore(1);
    }
    // === UPDATE ===
    dodger.update(keys, W, H);
    spawner.update(dt);
    safeZones.update(dt);
    if (checkDodgerHit(dodger, spawner.threats)) {
      if (!dodger.alive) { running = false; onGameOver(score); return; }
    }
    const zone = safeZones.isInSafeZone(dodger);
    if (zone && dodger.health < dodger.maxHealth) {
      dodger.health = Math.min(dodger.maxHealth, dodger.health + 0.01);
    }
    // === RENDER ===
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    safeZones.draw(ctx);
    spawner.draw(ctx);
    dodger.draw(ctx);
    dodger.drawHealthBar(ctx);
    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('SURVIVE: ' + score + 's', 15, 30);
    ctx.fillStyle = '#888';
    ctx.font = '14px Courier New';
    ctx.fillText('PATTERN: ' + spawner.currentPattern.toUpperCase(), 15, 75);
    if (dodger.dashCooldown <= 0) {
      ctx.fillStyle = '#00fff5';
      ctx.fillText('[SPACE] DASH READY', W - 200, 30);
    } else {
      ctx.fillStyle = '#444';
      ctx.fillText('[SPACE] DASH ' + dodger.dashCooldown.toFixed(1) + 's', W - 200, 30);
    }
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}
`,
  tierCode: {
    3: `
// === Screen flash on hit ===
class HitFlash {
  constructor() { this.alpha = 0; }
  trigger() { this.alpha = 0.5; }
  update() { if (this.alpha > 0) this.alpha -= 0.02; }
  draw(ctx, W, H) {
    if (this.alpha <= 0) return;
    ctx.fillStyle = 'rgba(255,0,0,' + this.alpha + ')';
    ctx.fillRect(0, 0, W, H);
  }
}
// === Score multiplier zones ===
class MultiplierZone {
  constructor(W, H) { this.W = W; this.H = H; this.zones = []; this.timer = 0; }
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 6 + Math.random() * 4;
      this.zones.push({ x: Math.random() * (this.W - 40), y: Math.random() * (this.H - 40), w: 40, h: 40, life: 4, mult: 2 });
    }
    for (let i = this.zones.length - 1; i >= 0; i--) {
      this.zones[i].life -= dt;
      if (this.zones[i].life <= 0) this.zones.splice(i, 1);
    }
  }
  getMultiplier(entity) {
    for (const z of this.zones) {
      if (entity.x + entity.w > z.x && entity.x < z.x + z.w && entity.y + entity.h > z.y && entity.y < z.y + z.h) {
        return z.mult;
      }
    }
    return 1;
  }
  draw(ctx) {
    for (const z of this.zones) {
      ctx.fillStyle = 'rgba(255,215,0,' + (z.life / 4 * 0.3) + ')';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 16px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('x' + z.mult, z.x + z.w/2, z.y + z.h/2 + 5);
    }
  }
}
`,
    5: `
// === Bullet time / slow motion ===
class BulletTime {
  constructor() { this.active = false; this.energy = 100; this.maxEnergy = 100; this.rechargeRate = 10; this.drainRate = 30; this.slowFactor = 0.3; }
  toggle() { if (this.energy > 10) this.active = !this.active; }
  update(dt) {
    if (this.active) {
      this.energy -= this.drainRate * dt;
      if (this.energy <= 0) { this.energy = 0; this.active = false; }
    } else {
      this.energy = Math.min(this.maxEnergy, this.energy + this.rechargeRate * dt);
    }
  }
  getTimeScale() { return this.active ? this.slowFactor : 1; }
  drawUI(ctx, x, y, w) {
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = this.active ? '#ff00ff' : '#00fff5';
    ctx.fillRect(x, y, w * (this.energy / this.maxEnergy), 8);
    if (this.active) {
      ctx.fillStyle = 'rgba(128,0,255,0.1)';
      ctx.fillRect(0, 0, 800, 600);
    }
  }
}
// === Threat prediction lines ===
function drawThreatPrediction(ctx, threats, frames) {
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 1;
  for (const t of threats) {
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + t.vx * (frames || 30), t.y + t.vy * (frames || 30));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
`
  },
  aiContext: 'ProjectileSpawner creates varied threat patterns (top, sides, corners, rain, spiral) with increasing difficulty. SafeZoneDetector spawns temporary healing zones. createDodger makes a player with WASD movement, dash ability, invulnerability frames, and trail. createThreat makes projectile entities. checkDodgerHit tests circle-rect collision with invulnerability.',
  provides: ['ProjectileSpawner', 'SafeZoneDetector', 'createDodger', 'createThreat', 'checkDodgerHit', 'drawWarning'],
  requires: [],
  conflicts: [],
  dependencies: []
};
