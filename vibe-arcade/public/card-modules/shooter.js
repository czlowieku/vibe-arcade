export default {
  code: `
// === ProjectileSystem ===
class ProjectileSystem {
  constructor() { this.bullets = []; }
  fire(x, y, vx, vy, size, color, damage, owner) {
    this.bullets.push({ x, y, vx, vy, size: size || 4, color: color || '#ffe600', damage: damage || 1, owner: owner || 'player', alive: true });
  }
  update() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx; b.y += b.vy;
      if (b.x < -20 || b.x > 820 || b.y < -20 || b.y > 620) {
        this.bullets.splice(i, 1);
      }
    }
  }
  draw(ctx) {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  removeDeadBullets() {
    this.bullets = this.bullets.filter(b => b.alive);
  }
}

// === EnemyWaveSpawner ===
class EnemyWaveSpawner {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.wave = 0; this.enemies = [];
    this.spawnTimer = 0; this.waveTimer = 0;
    this.enemiesPerWave = 5;
    this.spawnInterval = 0.8;
  }
  update(dt) {
    this.waveTimer += dt;
    this.spawnTimer -= dt;
    if (this.enemies.filter(e => e.alive).length === 0 && this.spawnTimer <= -1) {
      this.nextWave();
    }
    for (const e of this.enemies) {
      if (e.alive) e.update(dt);
    }
  }
  nextWave() {
    this.wave++;
    this.spawnTimer = 0;
    const count = this.enemiesPerWave + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const delay = i * this.spawnInterval;
      setTimeout(() => {
        if (this.enemies.length < 50) {
          const enemy = createEnemy(
            Math.random() * (this.W - 40) + 20,
            -30 - Math.random() * 60,
            20 + this.wave * 2, 1 + this.wave * 0.5
          );
          this.enemies.push(enemy);
        }
      }, delay * 1000);
    }
  }
  draw(ctx) {
    for (const e of this.enemies) {
      if (e.alive) e.draw(ctx);
    }
  }
}

// === createShip ===
function createShip(x, y, w, h, color, speed) {
  return {
    x: x || 400, y: y || 500, w: w || 30, h: h || 30,
    color: color || '#00fff5', speed: speed || 6,
    vx: 0, vy: 0, health: 3, maxHealth: 3,
    cooldown: 0, fireRate: 0.12, alive: true,
    update(keys, W, H) {
      this.vx = 0; this.vy = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) this.vx = -this.speed;
      if (keys['ArrowRight'] || keys['KeyD']) this.vx = this.speed;
      if (keys['ArrowUp'] || keys['KeyW']) this.vy = -this.speed;
      if (keys['ArrowDown'] || keys['KeyS']) this.vy = this.speed;
      this.x = Math.max(0, Math.min(this.x + this.vx, W - this.w));
      this.y = Math.max(0, Math.min(this.y + this.vy, H - this.h));
      if (this.cooldown > 0) this.cooldown -= 1/60;
    },
    canFire() { return this.cooldown <= 0; },
    fire(projectiles) {
      if (!this.canFire()) return;
      this.cooldown = this.fireRate;
      projectiles.fire(this.x + this.w/2, this.y, 0, -10, 3, '#ffe600', 1, 'player');
    },
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x + this.w/2, this.y);
      ctx.lineTo(this.x, this.y + this.h);
      ctx.lineTo(this.x + this.w, this.y + this.h);
      ctx.closePath();
      ctx.fill();
      // Engine glow
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(this.x + this.w/2, this.y + this.h + 4, 4 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    },
    drawHealthBar(ctx) {
      const bw = 40, bh = 4;
      const bx = this.x + this.w/2 - bw/2, by = this.y - 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = this.health > 1 ? '#00ff88' : '#ff4444';
      ctx.fillRect(bx, by, bw * (this.health / this.maxHealth), bh);
    }
  };
}

// === createEnemy ===
function createEnemy(x, y, size, speed) {
  return {
    x: x, y: y, w: size || 24, h: size || 24,
    speed: speed || 1.5, health: 1, alive: true,
    color: '#ff4444', movePattern: Math.floor(Math.random() * 3),
    startX: x, time: Math.random() * 100, scoreValue: 10,
    update(dt) {
      this.time += dt || 1/60;
      this.y += this.speed;
      if (this.movePattern === 0) {
        this.x = this.startX + Math.sin(this.time * 2) * 60;
      } else if (this.movePattern === 1) {
        this.x += Math.cos(this.time * 3) * 2;
      }
      if (this.y > 620) this.alive = false;
    },
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = '#ff8888';
      ctx.fillRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x + 5, this.y + 8, 4, 4);
      ctx.fillRect(this.x + this.w - 9, this.y + 8, 4, 4);
    },
    takeDamage(dmg) {
      this.health -= dmg;
      if (this.health <= 0) { this.alive = false; return true; }
      return false;
    }
  };
}

// === checkBulletCollisions ===
function checkBulletCollisions(projectiles, enemies, player) {
  const hits = [];
  for (const b of projectiles.bullets) {
    if (!b.alive) continue;
    if (b.owner === 'player') {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          b.alive = false;
          if (e.takeDamage(b.damage)) {
            hits.push({ type: 'kill', enemy: e, x: e.x + e.w/2, y: e.y + e.h/2 });
          } else {
            hits.push({ type: 'hit', enemy: e, x: b.x, y: b.y });
          }
          break;
        }
      }
    } else if (b.owner === 'enemy' && player.alive) {
      if (b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
        b.alive = false;
        player.health--;
        if (player.health <= 0) player.alive = false;
        hits.push({ type: 'player-hit', x: b.x, y: b.y });
      }
    }
  }
  projectiles.removeDeadBullets();
  return hits;
}

// === Explosion helper ===
function createExplosion(x, y, size, color) {
  return {
    x, y, size: size || 20, color: color || '#ff8800',
    life: 0.4, maxLife: 0.4,
    draw(ctx, dt) {
      this.life -= dt;
      if (this.life <= 0) return false;
      const t = 1 - this.life / this.maxLife;
      const r = this.size * (0.5 + t);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    }
  };
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const projectiles = new ProjectileSystem();
  const spawner = new EnemyWaveSpawner(W, H);
  const ship = createShip(W/2 - 15, H - 60, 30, 30, '#00fff5', 6);
  const explosions = [];
  let score = 0;
  let gameTime = 0;
  // === INPUT ===
  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);
  spawner.nextWave();
  let running = true;
  function gameLoop() {
    if (!running) return;
    const dt = 1/60;
    gameTime += dt;
    // === UPDATE ===
    ship.update(keys, W, H);
    if (keys['Space'] || keys['KeyZ']) ship.fire(projectiles);
    projectiles.update();
    spawner.update(dt);
    const hits = checkBulletCollisions(projectiles, spawner.enemies, ship);
    for (const hit of hits) {
      if (hit.type === 'kill') {
        score += hit.enemy.scoreValue;
        onScore(hit.enemy.scoreValue);
        explosions.push(createExplosion(hit.x, hit.y, 25, '#ff8800'));
      }
      if (hit.type === 'player-hit') {
        explosions.push(createExplosion(hit.x, hit.y, 15, '#ff0000'));
      }
    }
    // Check ship collision with enemies
    for (const e of spawner.enemies) {
      if (!e.alive || !ship.alive) continue;
      if (ship.x + ship.w > e.x && ship.x < e.x + e.w && ship.y + ship.h > e.y && ship.y < e.y + e.h) {
        e.alive = false;
        ship.health--;
        if (ship.health <= 0) ship.alive = false;
        explosions.push(createExplosion(e.x + e.w/2, e.y + e.h/2, 30, '#ff4444'));
      }
    }
    if (!ship.alive) { running = false; onGameOver(score); return; }
    // === RENDER ===
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    ship.draw(ctx);
    ship.drawHealthBar(ctx);
    projectiles.draw(ctx);
    spawner.draw(ctx);
    for (let i = explosions.length - 1; i >= 0; i--) {
      if (!explosions[i].draw(ctx, dt)) explosions.splice(i, 1);
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 15, 30);
    ctx.fillText('WAVE: ' + spawner.wave, 15, 55);
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}
`,
  tierCode: {
    3: `
// === Shooter particle trails ===
class BulletTrail {
  constructor() { this.particles = []; }
  add(x, y, color) {
    this.particles.push({ x, y, life: 0.3, maxLife: 0.3, size: 2, color: color || '#ffe600' });
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].life -= dt;
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife * 0.5;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
// === Score popup ===
class ScorePopups {
  constructor() { this.popups = []; }
  add(x, y, text, color) {
    this.popups.push({ x, y, text, color: color || '#ffe600', life: 1, vy: -2 });
  }
  update(dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy; p.life -= dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.popups) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 14px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }
}
`,
    5: `
// === Advanced enemy AI ===
class SmartEnemy {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.w = 28; this.h = 28;
    this.type = type; this.alive = true; this.health = type === 'tank' ? 5 : type === 'fast' ? 1 : 2;
    this.speed = type === 'fast' ? 4 : type === 'tank' ? 0.8 : 1.5;
    this.color = type === 'tank' ? '#8844ff' : type === 'fast' ? '#ff8800' : '#ff4444';
    this.scoreValue = type === 'tank' ? 50 : type === 'fast' ? 15 : 10;
    this.shootTimer = Math.random() * 2; this.canShoot = type !== 'fast';
    this.time = Math.random() * 100;
  }
  update(dt, playerX, projectiles) {
    this.time += dt;
    this.y += this.speed;
    if (this.type === 'fast') {
      this.x += Math.sin(this.time * 5) * 3;
    } else {
      // Track player
      const dx = playerX - this.x;
      this.x += Math.sign(dx) * 0.5;
    }
    if (this.canShoot) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 1.5 + Math.random();
        projectiles.fire(this.x + this.w/2, this.y + this.h, 0, 5, 3, '#ff4444', 1, 'enemy');
      }
    }
    if (this.y > 620) this.alive = false;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    if (this.type === 'tank') {
      ctx.strokeStyle = '#aa66ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    }
  }
  takeDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) { this.alive = false; return true; }
    return false;
  }
}
// === Screen shake ===
class ScreenShake {
  constructor() { this.intensity = 0; this.duration = 0; }
  trigger(intensity, duration) { this.intensity = intensity; this.duration = duration; }
  apply(ctx) {
    if (this.duration <= 0) return;
    this.duration -= 1/60;
    const ox = (Math.random() - 0.5) * this.intensity * 2;
    const oy = (Math.random() - 0.5) * this.intensity * 2;
    ctx.save(); ctx.translate(ox, oy);
  }
  restore(ctx) { if (this.duration > 0) ctx.restore(); }
}
`
  },
  aiContext: 'ProjectileSystem manages bullets with fire/update/draw. EnemyWaveSpawner handles wave-based enemy spawning. createShip creates the player ship with movement, firing, and health. createEnemy creates enemies with move patterns. checkBulletCollisions resolves all bullet-entity collisions. createExplosion for visual effects.',
  provides: ['ProjectileSystem', 'EnemyWaveSpawner', 'createShip', 'createEnemy', 'checkBulletCollisions', 'createExplosion'],
  requires: [],
  conflicts: [],
  dependencies: []
};
