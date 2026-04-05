export default {
  code: `
// === BossAI class ===
class BossAI {
  constructor(options) {
    const opts = options || {};
    this.x = opts.x || 400;
    this.y = opts.y || 80;
    this.w = opts.w || 80;
    this.h = opts.h || 60;
    this.health = opts.health || 20;
    this.maxHealth = this.health;
    this.alive = true;
    this.color = opts.color || '#ff4444';
    this.accentColor = opts.accentColor || '#ff8888';
    this.speed = opts.speed || 2;
    this.attackPatterns = opts.patterns || ['sweep', 'burst', 'charge'];
    this.currentPattern = null;
    this.patternTimer = 0;
    this.patternDuration = 3;
    this.attackCooldown = 0;
    this.phase = 1; // boss phase (gets harder as health drops)
    this.staggerTimer = 0;
    this.flashTimer = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.vx = 0; this.vy = 0;
    this.scoreValue = opts.scoreValue || 500;
    this.entranceTimer = 2;
    this.entering = true;
    this.startY = -80;
  }
  update(dt, playerX, playerY, W, H, projectilesFn) {
    if (this.entering) {
      this.entranceTimer -= dt;
      this.y = this.startY + (80 - this.startY) * (1 - this.entranceTimer / 2);
      if (this.entranceTimer <= 0) { this.entering = false; this.y = 80; }
      return;
    }
    if (!this.alive) return;
    if (this.staggerTimer > 0) { this.staggerTimer -= dt; return; }
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    // Phase check
    const hpPct = this.health / this.maxHealth;
    this.phase = hpPct > 0.6 ? 1 : hpPct > 0.3 ? 2 : 3;
    // Pattern management
    this.patternTimer -= dt;
    if (this.patternTimer <= 0) {
      this.currentPattern = this.attackPatterns[Math.floor(Math.random() * this.attackPatterns.length)];
      this.patternDuration = 2 + Math.random() * 2;
      this.patternTimer = this.patternDuration;
    }
    // Execute pattern
    this.attackCooldown -= dt;
    switch (this.currentPattern) {
      case 'sweep':
        this.targetX = playerX;
        this.x += (this.targetX - this.x) * 0.02;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 0.5 / this.phase;
          if (projectilesFn) projectilesFn(this.x + this.w/2, this.y + this.h, 0, 5 + this.phase);
        }
        break;
      case 'burst':
        this.x += Math.sin(Date.now() / 300) * this.speed;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 0.8 / this.phase;
          if (projectilesFn) {
            const count = 3 + this.phase * 2;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              projectilesFn(this.x + this.w/2, this.y + this.h/2, Math.cos(angle) * 4, Math.sin(angle) * 4);
            }
          }
        }
        break;
      case 'charge':
        if (this.patternTimer > this.patternDuration * 0.5) {
          // Windup - track player
          this.targetX = playerX;
          this.targetY = playerY - 100;
        } else {
          // Charge down
          this.y += 8;
          if (this.y > H - 100) {
            this.y = 80;
            this.patternTimer = 0; // End pattern
          }
        }
        this.x += (this.targetX - this.x) * 0.05;
        break;
    }
    // Stay in bounds
    this.x = Math.max(0, Math.min(this.x, W - this.w));
    this.y = Math.max(0, Math.min(this.y, H - this.h));
  }
  takeDamage(amount) {
    if (!this.alive || this.entering) return false;
    this.health -= (amount || 1);
    this.flashTimer = 0.15;
    if (this.health % 5 === 0) this.staggerTimer = 0.3;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      return true; // Boss defeated
    }
    return false;
  }
  checkHit(entity) {
    if (!this.alive || this.entering) return false;
    return entity.x + entity.w > this.x && entity.x < this.x + this.w &&
           entity.y + entity.h > this.y && entity.y < this.y + this.h;
  }
  draw(ctx) {
    if (!this.alive && this.flashTimer <= 0) return;
    // Flash on damage
    if (this.flashTimer > 0) {
      ctx.fillStyle = '#fff';
    } else {
      ctx.fillStyle = this.color;
    }
    // Stagger shake
    const ox = this.staggerTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
    // Body
    ctx.fillRect(this.x + ox, this.y, this.w, this.h);
    // Detail
    ctx.fillStyle = this.accentColor;
    ctx.fillRect(this.x + ox + 8, this.y + 8, this.w - 16, this.h - 16);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x + ox + 15, this.y + 12, 10, 8);
    ctx.fillRect(this.x + ox + this.w - 25, this.y + 12, 10, 8);
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x + ox + 18, this.y + 14, 4, 4);
    ctx.fillRect(this.x + ox + this.w - 22, this.y + 14, 4, 4);
    // Phase indicator
    if (this.phase >= 2) {
      ctx.strokeStyle = this.phase >= 3 ? '#ff0000' : '#ff8800';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x + ox - 2, this.y - 2, this.w + 4, this.h + 4);
    }
  }
  drawHealthBar(ctx, x, y, w, h) {
    const barW = w || 300;
    const barH = h || 20;
    const barX = x || 250;
    const barY = y || 15;
    const pct = this.health / this.maxHealth;
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(barX, barY, barW, barH);
    // Health fill
    let color;
    if (pct > 0.6) color = '#ff4444';
    else if (pct > 0.3) color = '#ff8800';
    else color = '#ff0000';
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barW * pct, barH);
    // Phase markers
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(barX + barW * 0.3, barY, 2, barH);
    ctx.fillRect(barX + barW * 0.6, barY, 2, barH);
    // Border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    // Boss name
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', barX + barW/2, barY - 4);
    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Courier New';
    ctx.fillText(this.health + '/' + this.maxHealth, barX + barW/2, barY + barH - 4);
  }
}

// === Boss warning ===
function drawBossWarning(ctx, W, H, timer) {
  if (timer <= 0) return;
  const pulse = Math.sin(timer * 10) * 0.3 + 0.7;
  ctx.globalAlpha = pulse * Math.min(timer, 1);
  ctx.fillStyle = '#ff0000';
  ctx.font = 'bold 48px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('WARNING!', W/2, H/2 - 20);
  ctx.font = 'bold 24px Courier New';
  ctx.fillText('BOSS INCOMING', W/2, H/2 + 20);
  ctx.globalAlpha = 1;
  // Red border
  ctx.strokeStyle = 'rgba(255,0,0,' + (pulse * 0.5) + ')';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, W - 8, H - 8);
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Boss projectile patterns ===
class BossProjectilePattern {
  constructor() { this.projectiles = []; }
  spiralBurst(cx, cy, count, speed, color) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.projectiles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 5, color: color || '#ff4444', alive: true
      });
    }
  }
  aimAt(cx, cy, tx, ty, speed, count, spread, color) {
    const baseAngle = Math.atan2(ty - cy, tx - cx);
    for (let i = 0; i < (count || 1); i++) {
      const angle = baseAngle + (i - (count-1)/2) * (spread || 0.2);
      this.projectiles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * (speed || 5), vy: Math.sin(angle) * (speed || 5),
        size: 4, color: color || '#ff8800', alive: true
      });
    }
  }
  update() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20 || p.x > 820 || p.y < -20 || p.y > 620) this.projectiles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  checkHitPlayer(player) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (player.x + player.w > p.x - p.size && player.x < p.x + p.size &&
          player.y + player.h > p.y - p.size && player.y < p.y + p.size) {
        this.projectiles.splice(i, 1);
        return true;
      }
    }
    return false;
  }
}
`,
    5: `
// === Multi-phase boss ===
class MultiBoss extends BossAI {
  constructor(options) {
    super(options);
    this.phases = options.bossPhases || [
      { hpThreshold: 0.6, patterns: ['sweep', 'burst'], speed: 2, color: '#ff4444' },
      { hpThreshold: 0.3, patterns: ['burst', 'charge'], speed: 3, color: '#ff8800' },
      { hpThreshold: 0, patterns: ['sweep', 'burst', 'charge'], speed: 4, color: '#ff00ff' },
    ];
    this.currentBossPhase = 0;
    this.phaseTransitioning = false;
    this.transitionTimer = 0;
  }
  update(dt, playerX, playerY, W, H, projectilesFn) {
    // Check phase transitions
    const hpPct = this.health / this.maxHealth;
    const phaseConfig = this.phases[this.currentBossPhase];
    if (phaseConfig && hpPct <= phaseConfig.hpThreshold && this.currentBossPhase < this.phases.length - 1) {
      this.currentBossPhase++;
      this.phaseTransitioning = true;
      this.transitionTimer = 1.5;
      const newPhase = this.phases[this.currentBossPhase];
      this.attackPatterns = newPhase.patterns;
      this.speed = newPhase.speed;
      this.color = newPhase.color;
    }
    if (this.phaseTransitioning) {
      this.transitionTimer -= dt;
      this.flashTimer = 0.1;
      if (this.transitionTimer <= 0) this.phaseTransitioning = false;
      return;
    }
    super.update(dt, playerX, playerY, W, H, projectilesFn);
  }
  drawPhaseIndicator(ctx, x, y) {
    ctx.fillStyle = '#888';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PHASE ' + (this.currentBossPhase + 1) + '/' + this.phases.length, x, y);
  }
}
`
  },
  aiContext: 'BossAI is a fully featured boss with health, attack patterns (sweep, burst, charge), phases that increase difficulty as HP drops, entrance animation, stagger on hits. update() takes dt, player position, bounds, and a projectile function. drawHealthBar renders a segmented HP bar. drawBossWarning shows a pre-boss warning overlay.',
  provides: ['BossAI', 'drawBossWarning'],
  requires: [],
  conflicts: [],
  dependencies: []
};
