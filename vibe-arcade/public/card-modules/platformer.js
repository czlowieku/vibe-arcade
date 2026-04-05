export default {
  code: `
// === PlatformerPhysics ===
class PlatformerPhysics {
  constructor(gravity, jumpForce, moveSpeed) {
    this.gravity = gravity || 0.6;
    this.jumpForce = jumpForce || -12;
    this.moveSpeed = moveSpeed || 5;
    this.friction = 0.85;
    this.maxFallSpeed = 15;
  }
  applyGravity(entity) {
    entity.vy = Math.min((entity.vy || 0) + this.gravity, this.maxFallSpeed);
    entity.y += entity.vy;
  }
  applyMovement(entity, keys) {
    if (keys['ArrowLeft'] || keys['KeyA']) entity.vx = -this.moveSpeed;
    else if (keys['ArrowRight'] || keys['KeyD']) entity.vx = this.moveSpeed;
    else entity.vx = (entity.vx || 0) * this.friction;
    if (Math.abs(entity.vx) < 0.1) entity.vx = 0;
    entity.x += entity.vx;
  }
  jump(entity) {
    if (entity.grounded) {
      entity.vy = this.jumpForce;
      entity.grounded = false;
      return true;
    }
    return false;
  }
}

// === createPlayer ===
function createPlayer(x, y, w, h, color) {
  return {
    x: x || 100, y: y || 300, w: w || 30, h: h || 40,
    vx: 0, vy: 0, grounded: false,
    color: color || '#00fff5',
    lives: 3, score: 0, facing: 1,
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      // Eyes
      const eyeX = this.facing > 0 ? this.x + this.w - 8 : this.x + 4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(eyeX, this.y + 8, 4, 4);
      ctx.fillRect(eyeX, this.y + 16, 4, 4);
    }
  };
}

// === createPlatform ===
function createPlatform(x, y, w, h, color, moving) {
  return {
    x: x, y: y, w: w || 120, h: h || 16,
    color: color || '#4a4a6a',
    moving: moving || false,
    moveSpeed: 1, moveRange: 80, startX: x, dir: 1,
    update() {
      if (this.moving) {
        this.x += this.moveSpeed * this.dir;
        if (Math.abs(this.x - this.startX) > this.moveRange) this.dir *= -1;
      }
    },
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(this.x, this.y, this.w, 3);
    }
  };
}

// === resolveCollisions ===
function resolveCollisions(player, platforms) {
  player.grounded = false;
  for (const p of platforms) {
    if (player.x + player.w > p.x && player.x < p.x + p.w &&
        player.y + player.h > p.y && player.y < p.y + p.h) {
      const overlapTop = player.y + player.h - p.y;
      const overlapBottom = p.y + p.h - player.y;
      const overlapLeft = player.x + player.w - p.x;
      const overlapRight = p.x + p.w - player.x;
      const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);
      if (minOverlap === overlapTop && player.vy >= 0) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.grounded = true;
        if (p.moving) player.x += p.moveSpeed * p.dir;
      } else if (minOverlap === overlapBottom && player.vy < 0) {
        player.y = p.y + p.h;
        player.vy = 0;
      } else if (minOverlap === overlapLeft) {
        player.x = p.x - player.w;
        player.vx = 0;
      } else if (minOverlap === overlapRight) {
        player.x = p.x + p.w;
        player.vx = 0;
      }
    }
  }
}

// === generatePlatformLevel ===
function generatePlatformLevel(W, H, numPlatforms, movingChance) {
  const platforms = [];
  // Ground
  platforms.push(createPlatform(0, H - 20, W, 20, '#3a3a5a', false));
  for (let i = 0; i < (numPlatforms || 12); i++) {
    const x = Math.random() * (W - 140) + 20;
    const y = H - 80 - Math.random() * (H - 160);
    const w = 80 + Math.random() * 100;
    const moving = Math.random() < (movingChance || 0.2);
    platforms.push(createPlatform(x, y, w, 16, '#4a4a6a', moving));
  }
  return platforms;
}

// === Collectible helper ===
function createCollectible(x, y, value, color) {
  return {
    x: x, y: y, w: 16, h: 16,
    value: value || 10, color: color || '#ffe600',
    collected: false, bobOffset: Math.random() * Math.PI * 2,
    update(time) { this.drawY = this.y + Math.sin(time * 3 + this.bobOffset) * 4; },
    draw(ctx, time) {
      if (this.collected) return;
      this.update(time);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x + 8, this.drawY + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x + 8, this.drawY + 8, 3, 0, Math.PI * 2);
      ctx.fill();
    },
    checkCollect(player) {
      if (this.collected) return 0;
      if (player.x + player.w > this.x && player.x < this.x + this.w &&
          player.y + player.h > this.y && player.y < this.y + this.h) {
        this.collected = true;
        return this.value;
      }
      return 0;
    }
  };
}

// === Hazard/spike helper ===
function createHazard(x, y, w, h, color) {
  return {
    x: x, y: y, w: w || 30, h: h || 10,
    color: color || '#ff4444',
    draw(ctx) {
      ctx.fillStyle = this.color;
      for (let i = 0; i < this.w; i += 10) {
        ctx.beginPath();
        ctx.moveTo(this.x + i, this.y + this.h);
        ctx.lineTo(this.x + i + 5, this.y);
        ctx.lineTo(this.x + i + 10, this.y + this.h);
        ctx.fill();
      }
    },
    checkHit(player) {
      return player.x + player.w > this.x && player.x < this.x + this.w &&
             player.y + player.h > this.y && player.y < this.y + this.h;
    }
  };
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const physics = new PlatformerPhysics(0.6, -12, 5);
  const player = createPlayer(100, H - 80, 30, 40, '#00fff5');
  const platforms = generatePlatformLevel(W, H, 14, 0.25);
  const collectibles = [];
  for (let i = 0; i < 10; i++) {
    collectibles.push(createCollectible(
      Math.random() * (W - 40) + 20,
      Math.random() * (H - 200) + 60,
      10, '#ffe600'
    ));
  }
  let score = 0;
  let gameTime = 0;
  // === INPUT ===
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && player.grounded) {
      physics.jump(player);
    }
  });
  window.addEventListener('keyup', e => keys[e.code] = false);
  let running = true;
  function gameLoop() {
    if (!running) return;
    gameTime += 1/60;
    // === UPDATE ===
    physics.applyMovement(player, keys);
    physics.applyGravity(player);
    for (const p of platforms) p.update();
    resolveCollisions(player, platforms);
    // Wrap horizontally
    if (player.x > W) player.x = -player.w;
    if (player.x + player.w < 0) player.x = W;
    // Collect items
    for (const c of collectibles) {
      const pts = c.checkCollect(player);
      if (pts > 0) { score += pts; onScore(pts); }
    }
    // Fall off screen
    if (player.y > H + 50) {
      running = false;
      onGameOver(score);
      return;
    }
    // === RENDER ===
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    for (const p of platforms) p.draw(ctx);
    for (const c of collectibles) c.draw(ctx, gameTime);
    player.draw(ctx);
    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 15, 30);
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}
`,
  tierCode: {
    3: `
// === Particle system for platformer ===
class PlatformParticles {
  constructor() { this.particles = []; }
  emit(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4 - 1,
        life: 0.5 + Math.random() * 0.5, maxLife: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 3, color: color || '#ffe600'
      });
    }
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
// === Combo system ===
class ComboTracker {
  constructor() { this.combo = 0; this.timer = 0; this.maxCombo = 0; }
  hit() { this.combo++; this.timer = 2; if (this.combo > this.maxCombo) this.maxCombo = this.combo; return this.combo; }
  update(dt) { this.timer -= dt; if (this.timer <= 0) this.combo = 0; }
  getMultiplier() { return 1 + Math.floor(this.combo / 3) * 0.5; }
  draw(ctx, x, y) {
    if (this.combo > 1) {
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 16px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(this.combo + 'x COMBO!', x, y);
    }
  }
}
`,
    5: `
// === Camera system for large levels ===
class PlatformCamera {
  constructor(W, H, levelW, levelH) {
    this.x = 0; this.y = 0;
    this.viewW = W; this.viewH = H;
    this.levelW = levelW; this.levelH = levelH;
    this.smoothing = 0.08;
    this.shakeAmount = 0; this.shakeDuration = 0;
  }
  follow(target) {
    const tx = target.x - this.viewW / 2;
    const ty = target.y - this.viewH / 2;
    this.x += (tx - this.x) * this.smoothing;
    this.y += (ty - this.y) * this.smoothing;
    this.x = Math.max(0, Math.min(this.x, this.levelW - this.viewW));
    this.y = Math.max(0, Math.min(this.y, this.levelH - this.viewH));
  }
  shake(amount, duration) { this.shakeAmount = amount; this.shakeDuration = duration; }
  apply(ctx) {
    let ox = -this.x, oy = -this.y;
    if (this.shakeDuration > 0) {
      ox += (Math.random() - 0.5) * this.shakeAmount * 2;
      oy += (Math.random() - 0.5) * this.shakeAmount * 2;
      this.shakeDuration -= 1/60;
    }
    ctx.save();
    ctx.translate(ox, oy);
  }
  restore(ctx) { ctx.restore(); }
}
// === Enemy AI for platformer ===
class PlatformEnemy {
  constructor(x, y, w, h, patrolRange, speed, color) {
    this.x = x; this.y = y; this.w = w || 24; this.h = h || 24;
    this.startX = x; this.patrolRange = patrolRange || 100;
    this.speed = speed || 1.5; this.dir = 1; this.alive = true;
    this.color = color || '#ff4444'; this.vy = 0;
  }
  update() {
    if (!this.alive) return;
    this.x += this.speed * this.dir;
    if (Math.abs(this.x - this.startX) > this.patrolRange) this.dir *= -1;
  }
  draw(ctx) {
    if (!this.alive) return;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    const eyeX = this.dir > 0 ? this.x + this.w - 7 : this.x + 3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(eyeX, this.y + 5, 4, 4);
  }
  checkStompedBy(player) {
    if (!this.alive) return false;
    if (player.x + player.w > this.x && player.x < this.x + this.w &&
        player.y + player.h > this.y && player.y + player.h < this.y + this.h / 2 + 5 &&
        player.vy > 0) {
      this.alive = false;
      player.vy = -8;
      return true;
    }
    return false;
  }
  checkHit(player) {
    if (!this.alive) return false;
    return player.x + player.w > this.x + 2 && player.x < this.x + this.w - 2 &&
           player.y + player.h > this.y + 2 && player.y < this.y + this.h - 2;
  }
}
`
  },
  aiContext: 'PlatformerPhysics handles gravity, movement and jumping. createPlayer/createPlatform create entities. resolveCollisions handles platform collision with push-out. generatePlatformLevel creates a random set of platforms with optional moving ones. createCollectible/createHazard for items and spikes.',
  provides: ['PlatformerPhysics', 'createPlayer', 'createPlatform', 'resolveCollisions', 'generatePlatformLevel', 'createCollectible', 'createHazard'],
  requires: [],
  conflicts: [],
  dependencies: []
};
