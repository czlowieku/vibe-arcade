export default {
  code: `
// === PowerupSystem ===
class PowerupSystem {
  constructor(W, H, options) {
    const opts = options || {};
    this.W = W; this.H = H;
    this.available = [];
    this.active = [];
    this.spawnTimer = 0;
    this.spawnInterval = opts.spawnInterval || 6;
    this.maxSpawned = opts.maxSpawned || 3;
    this.types = opts.types || [
      { id: 'speed', name: 'SPEED', color: '#4488ff', duration: 5, icon: '>>', effect: 'speed_boost' },
      { id: 'shield', name: 'SHIELD', color: '#00ff88', duration: 5, icon: 'O', effect: 'shield' },
      { id: 'double', name: '2X', color: '#ffe600', duration: 5, icon: 'x2', effect: 'double_points' },
      { id: 'magnet', name: 'MAGNET', color: '#ff44ff', duration: 5, icon: 'M', effect: 'magnet' },
      { id: 'shrink', name: 'SHRINK', color: '#aa88ff', duration: 5, icon: '<>', effect: 'shrink' },
    ];
  }
  update(dt) {
    // Spawn new powerups
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.available.length < this.maxSpawned) {
      this.spawnTimer = this.spawnInterval + Math.random() * 3;
      this.spawn();
    }
    // Update spawned powerups (bob animation, expiry)
    for (let i = this.available.length - 1; i >= 0; i--) {
      const p = this.available[i];
      p.lifeTimer -= dt;
      p.bobPhase += dt * 3;
      if (p.lifeTimer <= 0) this.available.splice(i, 1);
    }
    // Update active powerups (duration countdown)
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].remaining -= dt;
      if (this.active[i].remaining <= 0) {
        this.active.splice(i, 1);
      }
    }
  }
  spawn() {
    const type = this.types[Math.floor(Math.random() * this.types.length)];
    this.available.push({
      x: 30 + Math.random() * (this.W - 60),
      y: 50 + Math.random() * (this.H - 150),
      w: 24, h: 24,
      type: type,
      lifeTimer: 8,
      bobPhase: Math.random() * Math.PI * 2,
      collected: false
    });
  }
  spawnAt(x, y, typeId) {
    const type = this.types.find(t => t.id === typeId) || this.types[0];
    this.available.push({
      x, y, w: 24, h: 24, type: type,
      lifeTimer: 8, bobPhase: 0, collected: false
    });
  }
  collect(entity) {
    for (let i = this.available.length - 1; i >= 0; i--) {
      const p = this.available[i];
      if (p.collected) continue;
      const bobY = Math.sin(p.bobPhase) * 4;
      if (entity.x + entity.w > p.x && entity.x < p.x + p.w &&
          entity.y + entity.h > p.y + bobY && entity.y < p.y + p.h + bobY) {
        p.collected = true;
        this.available.splice(i, 1);
        this.activate(p.type);
        return p.type;
      }
    }
    return null;
  }
  activate(type) {
    // Remove existing of same type
    this.active = this.active.filter(a => a.type.id !== type.id);
    this.active.push({
      type: type,
      remaining: type.duration
    });
  }
  isActive(effectId) {
    return this.active.some(a => a.type.id === effectId || a.type.effect === effectId);
  }
  getActiveEffects() {
    return this.active.map(a => a.type.effect);
  }
  getMultiplier(effectId) {
    if (this.isActive(effectId)) return 2;
    return 1;
  }
  drawAvailable(ctx) {
    for (const p of this.available) {
      if (p.collected) continue;
      const bobY = Math.sin(p.bobPhase) * 4;
      const flash = p.lifeTimer < 2 ? (Math.sin(p.lifeTimer * 8) > 0 ? 1 : 0.3) : 1;
      ctx.globalAlpha = flash;
      // Glow
      ctx.shadowColor = p.type.color;
      ctx.shadowBlur = 10;
      // Background
      ctx.fillStyle = p.type.color;
      ctx.beginPath();
      ctx.arc(p.x + p.w/2, p.y + p.h/2 + bobY, p.w/2 + 2, 0, Math.PI * 2);
      ctx.fill();
      // Inner
      ctx.fillStyle = '#0a0a1a';
      ctx.beginPath();
      ctx.arc(p.x + p.w/2, p.y + p.h/2 + bobY, p.w/2 - 2, 0, Math.PI * 2);
      ctx.fill();
      // Icon
      ctx.fillStyle = p.type.color;
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(p.type.icon, p.x + p.w/2, p.y + p.h/2 + bobY + 4);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
  drawActive(ctx, x, y) {
    let offsetX = x || 10;
    const baseY = y || 580;
    for (const a of this.active) {
      const pct = a.remaining / a.type.duration;
      // Bar background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(offsetX, baseY, 60, 14);
      // Bar fill
      ctx.fillStyle = a.type.color;
      ctx.fillRect(offsetX, baseY, 60 * pct, 14);
      // Border
      ctx.strokeStyle = a.type.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX, baseY, 60, 14);
      // Text
      ctx.fillStyle = '#fff';
      ctx.font = '9px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(a.type.name, offsetX + 30, baseY + 10);
      offsetX += 65;
    }
  }
  drawCollectEffect(ctx, x, y, color) {
    // Call this for one-time collect animation
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = color || '#ffe600';
    ctx.lineWidth = 2;
    for (let r = 10; r < 30; r += 8) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// === Shield visual helper ===
function drawShieldEffect(ctx, entity, color) {
  const cx = entity.x + entity.w/2;
  const cy = entity.y + entity.h/2;
  const r = Math.max(entity.w, entity.h) * 0.7;
  ctx.strokeStyle = color || '#00ff88';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 200) * 0.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color || '#00ff88';
  ctx.fill();
  ctx.globalAlpha = 1;
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Power-up combo system ===
class PowerupCombo {
  constructor() { this.combos = []; this.activeCombo = null; }
  registerCombo(ids, name, bonusEffect) {
    this.combos.push({ ids: ids.sort(), name, bonusEffect });
  }
  check(activeEffects) {
    const sorted = [...activeEffects].sort();
    for (const combo of this.combos) {
      if (combo.ids.every(id => sorted.includes(id))) {
        this.activeCombo = combo;
        return combo;
      }
    }
    this.activeCombo = null;
    return null;
  }
  draw(ctx, x, y) {
    if (!this.activeCombo) return;
    ctx.fillStyle = '#ff00ff';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('COMBO: ' + this.activeCombo.name + '!', x, y);
  }
}
`,
    5: `
// === Rare/legendary powerups ===
class LegendaryPowerup {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.active = false; this.x = 0; this.y = 0;
    this.type = null; this.lifeTimer = 0; this.phase = 0;
    this.types = [
      { id: 'timestop', name: 'TIME STOP', color: '#ffffff', duration: 3, effect: 'freeze_enemies' },
      { id: 'nuke', name: 'NUKE', color: '#ff0000', duration: 0.1, effect: 'destroy_all' },
      { id: 'invincible', name: 'STAR', color: '#ffe600', duration: 8, effect: 'invincible' },
    ];
  }
  trySpawn(score) {
    if (this.active) return false;
    if (Math.random() < 0.002 * (score / 100)) {
      this.spawn();
      return true;
    }
    return false;
  }
  spawn() {
    this.active = true;
    this.x = 50 + Math.random() * (this.W - 100);
    this.y = 50 + Math.random() * (this.H - 150);
    this.type = this.types[Math.floor(Math.random() * this.types.length)];
    this.lifeTimer = 5;
    this.phase = 0;
  }
  update(dt) {
    if (!this.active) return;
    this.lifeTimer -= dt;
    this.phase += dt * 4;
    if (this.lifeTimer <= 0) this.active = false;
  }
  collect(entity) {
    if (!this.active) return null;
    const dx = entity.x + entity.w/2 - this.x;
    const dy = entity.y + entity.h/2 - this.y;
    if (Math.sqrt(dx*dx + dy*dy) < 25) {
      this.active = false;
      return this.type;
    }
    return null;
  }
  draw(ctx) {
    if (!this.active) return;
    const pulse = Math.sin(this.phase) * 0.3 + 0.7;
    const r = 16 + pulse * 4;
    // Rainbow glow
    ctx.shadowColor = this.type.color;
    ctx.shadowBlur = 20 + pulse * 10;
    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Star overlay
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(this.type.name, this.x, this.y + 4);
    // Expiry flash
    if (this.lifeTimer < 2 && Math.sin(this.lifeTimer * 10) > 0) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(this.x, this.y, r + 5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
`
  },
  aiContext: 'PowerupSystem spawns, tracks, and manages collectible power-ups. Built-in types: speed, shield, double, magnet, shrink — but you can add your own via addType(id, color, icon, duration). collect(entity) checks collision and activates. isActive(effectId) / getMultiplier(effectId) for checking status. drawAvailable renders floating pickups, drawActive shows timers. BE CREATIVE — add power-ups that make sense for this specific game genre. A shooter might add homing bullets or rapid fire, a platformer might add wall jump or coin magnet. Surprise the player!',
  provides: ['PowerupSystem', 'drawShieldEffect'],
  requires: [],
  conflicts: [],
  dependencies: []
};
