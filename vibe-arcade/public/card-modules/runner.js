export default {
  code: `
// === ScrollingWorld ===
class ScrollingWorld {
  constructor(W, H, speed) {
    this.W = W; this.H = H;
    this.speed = speed || 4;
    this.baseSpeed = speed || 4;
    this.scrollX = 0;
    this.layers = [];
  }
  addLayer(drawFn, speedMultiplier) {
    this.layers.push({ draw: drawFn, speed: speedMultiplier || 1 });
  }
  update(dt) {
    this.scrollX += this.speed;
  }
  draw(ctx) {
    for (const layer of this.layers) {
      const offset = -(this.scrollX * layer.speed) % this.W;
      ctx.save();
      ctx.translate(offset, 0);
      layer.draw(ctx, this.scrollX * layer.speed);
      ctx.translate(this.W, 0);
      layer.draw(ctx, this.scrollX * layer.speed + this.W);
      ctx.restore();
    }
  }
  setSpeed(speed) { this.speed = speed; }
  getDistance() { return Math.floor(this.scrollX / 10); }
}

// === ObstacleGenerator ===
class ObstacleGenerator {
  constructor(W, H, groundY) {
    this.W = W; this.H = H;
    this.groundY = groundY || H - 60;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.5;
    this.minInterval = 0.6;
  }
  update(dt, scrollSpeed) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn(scrollSpeed);
      this.spawnTimer = this.spawnInterval;
      if (this.spawnInterval > this.minInterval) this.spawnInterval -= 0.005;
    }
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].x -= scrollSpeed;
      if (this.obstacles[i].x + this.obstacles[i].w < -20) {
        this.obstacles.splice(i, 1);
      }
    }
  }
  spawn(scrollSpeed) {
    const types = ['low', 'high', 'wide'];
    const type = types[Math.floor(Math.random() * types.length)];
    let obs;
    if (type === 'low') {
      obs = createObstacle(this.W + 20, this.groundY - 30, 25, 30, '#ff4444');
    } else if (type === 'high') {
      obs = createObstacle(this.W + 20, this.groundY - 60, 25, 60, '#ff8800');
    } else {
      obs = createObstacle(this.W + 20, this.groundY - 20, 50, 20, '#ff4444');
    }
    obs.type = type;
    obs.passed = false;
    this.obstacles.push(obs);
  }
  draw(ctx) {
    for (const o of this.obstacles) o.draw(ctx);
  }
  checkCollision(runner) {
    for (const o of this.obstacles) {
      if (runner.x + runner.w > o.x + 4 && runner.x < o.x + o.w - 4 &&
          runner.y + runner.h > o.y + 4 && runner.y < o.y + o.h - 4) {
        return o;
      }
    }
    return null;
  }
  checkPassed(runner) {
    let count = 0;
    for (const o of this.obstacles) {
      if (!o.passed && o.x + o.w < runner.x) {
        o.passed = true;
        count++;
      }
    }
    return count;
  }
}

// === LaneSystem ===
class LaneSystem {
  constructor(numLanes, laneHeight, topY) {
    this.numLanes = numLanes || 3;
    this.laneHeight = laneHeight || 80;
    this.topY = topY || 200;
    this.currentLane = Math.floor(numLanes / 2);
  }
  getLaneY(lane) {
    return this.topY + lane * this.laneHeight;
  }
  getCurrentY() {
    return this.getLaneY(this.currentLane);
  }
  moveUp() {
    if (this.currentLane > 0) { this.currentLane--; return true; }
    return false;
  }
  moveDown() {
    if (this.currentLane < this.numLanes - 1) { this.currentLane++; return true; }
    return false;
  }
  drawLanes(ctx, W) {
    for (let i = 0; i < this.numLanes; i++) {
      const y = this.getLaneY(i);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, y + this.laneHeight);
      ctx.lineTo(W, y + this.laneHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// === createRunner ===
function createRunner(x, y, w, h, color) {
  return {
    x: x || 80, y: y || 400, w: w || 30, h: h || 40,
    targetY: y || 400, vy: 0, grounded: true,
    color: color || '#00fff5',
    jumpForce: -12, gravity: 0.6,
    alive: true, ducking: false,
    legPhase: 0,
    jump() {
      if (this.grounded) {
        this.vy = this.jumpForce;
        this.grounded = false;
        return true;
      }
      return false;
    },
    duck(active) {
      if (active && this.grounded) {
        this.ducking = true;
        this.h = 20;
      } else {
        this.ducking = false;
        this.h = 40;
      }
    },
    update(groundY) {
      this.vy += this.gravity;
      this.y += this.vy;
      if (this.y + this.h >= groundY) {
        this.y = groundY - this.h;
        this.vy = 0;
        this.grounded = true;
      }
      this.legPhase += 0.15;
    },
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      // Running legs
      if (this.grounded && !this.ducking) {
        const legOff = Math.sin(this.legPhase) * 6;
        ctx.fillRect(this.x + 4, this.y + this.h, 6, 8 + legOff);
        ctx.fillRect(this.x + this.w - 10, this.y + this.h, 6, 8 - legOff);
      }
      // Eye
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x + this.w - 8, this.y + 6, 5, 5);
    }
  };
}

// === createObstacle ===
function createObstacle(x, y, w, h, color) {
  return {
    x: x, y: y, w: w || 25, h: h || 30,
    color: color || '#ff4444',
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      // Warning stripes
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < this.h; i += 8) {
        ctx.fillRect(this.x, this.y + i, this.w, 3);
      }
    }
  };
}

// === Ground drawing ===
function drawGround(ctx, W, groundY, color, scrollX) {
  ctx.fillStyle = color || '#2a2a4a';
  ctx.fillRect(0, groundY, W, 600 - groundY);
  // Ground line
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(W, groundY);
  ctx.stroke();
  // Ground detail
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const offset = -(scrollX || 0) % 40;
  for (let x = offset; x < W + 40; x += 40) {
    ctx.fillRect(x, groundY + 5, 20, 2);
  }
}

// === Distance/score display ===
function drawRunnerHUD(ctx, distance, score, speed) {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('DIST: ' + distance + 'm', 15, 30);
  ctx.fillText('SCORE: ' + score, 15, 55);
  ctx.fillStyle = '#888';
  ctx.font = '14px Courier New';
  ctx.fillText('SPEED: ' + speed.toFixed(1) + 'x', 15, 75);
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GROUND_Y = H - 60;
  const world = new ScrollingWorld(W, H, 5);
  const obstacles = new ObstacleGenerator(W, H, GROUND_Y);
  const runner = createRunner(80, GROUND_Y - 40, 30, 40, '#00fff5');
  let score = 0;
  let gameTime = 0;
  let speedMult = 1;
  // Background layer
  world.addLayer((ctx, sx) => {
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect((i * 47 + 10) % W, 30 + (i * 23) % 150, 2, 2);
    }
  }, 0.3);
  // === INPUT ===
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') runner.jump();
    if (e.code === 'ArrowDown' || e.code === 'KeyS') runner.duck(true);
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') runner.duck(false);
  });
  let running = true;
  function gameLoop() {
    if (!running) return;
    const dt = 1/60;
    gameTime += dt;
    speedMult = 1 + gameTime * 0.02;
    world.setSpeed(5 * speedMult);
    // === UPDATE ===
    world.update(dt);
    obstacles.update(dt, 5 * speedMult);
    runner.update(GROUND_Y);
    const passed = obstacles.checkPassed(runner);
    if (passed > 0) { score += passed * 10; onScore(passed * 10); }
    if (obstacles.checkCollision(runner)) {
      running = false; onGameOver(score); return;
    }
    // === RENDER ===
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    world.draw(ctx);
    drawGround(ctx, W, GROUND_Y, '#2a2a4a', world.scrollX);
    obstacles.draw(ctx);
    runner.draw(ctx);
    drawRunnerHUD(ctx, world.getDistance(), score, speedMult);
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}
`,
  tierCode: {
    3: `
// === Coin/pickup spawner ===
class RunnerPickupSpawner {
  constructor(W, groundY) {
    this.W = W; this.groundY = groundY;
    this.pickups = []; this.timer = 0;
  }
  update(dt, scrollSpeed) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1.5 + Math.random();
      const y = this.groundY - 60 - Math.random() * 100;
      this.pickups.push({ x: this.W + 10, y, w: 16, h: 16, color: '#ffe600', collected: false, value: 5 });
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      this.pickups[i].x -= scrollSpeed;
      if (this.pickups[i].x < -20) this.pickups.splice(i, 1);
    }
  }
  checkCollect(runner) {
    let pts = 0;
    for (const p of this.pickups) {
      if (p.collected) continue;
      if (runner.x + runner.w > p.x && runner.x < p.x + p.w && runner.y + runner.h > p.y && runner.y < p.y + p.h) {
        p.collected = true; pts += p.value;
      }
    }
    return pts;
  }
  draw(ctx, time) {
    for (const p of this.pickups) {
      if (p.collected) continue;
      ctx.fillStyle = p.color;
      const bob = Math.sin(time * 4 + p.x * 0.01) * 3;
      ctx.beginPath();
      ctx.arc(p.x + 8, p.y + 8 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
// === Double jump ===
function enableDoubleJump(runner) {
  runner.jumpCount = 0;
  runner.maxJumps = 2;
  const origJump = runner.jump.bind(runner);
  runner.jump = function() {
    if (this.jumpCount < this.maxJumps) {
      this.vy = this.jumpForce;
      this.grounded = false;
      this.jumpCount++;
      return true;
    }
    return false;
  };
  const origUpdate = runner.update.bind(runner);
  runner.update = function(groundY) {
    origUpdate(groundY);
    if (this.grounded) this.jumpCount = 0;
  };
}
`,
    5: `
// === Procedural terrain generation ===
class TerrainGenerator {
  constructor(W, H, groundY) {
    this.W = W; this.H = H; this.groundY = groundY;
    this.segments = []; this.segWidth = 200;
    for (let i = 0; i < Math.ceil(W / this.segWidth) + 2; i++) {
      this.segments.push({ x: i * this.segWidth, height: 0, type: 'flat' });
    }
  }
  update(scrollX) {
    const frontX = scrollX + this.W + this.segWidth;
    while (this.segments.length > 0 && this.segments[0].x + this.segWidth < scrollX - this.segWidth) {
      this.segments.shift();
    }
    while (this.segments.length === 0 || this.segments[this.segments.length-1].x < frontX) {
      const lastX = this.segments.length > 0 ? this.segments[this.segments.length-1].x + this.segWidth : 0;
      const types = ['flat', 'ramp-up', 'ramp-down', 'pit'];
      const type = types[Math.floor(Math.random() * types.length)];
      const h = type === 'ramp-up' ? -40 : type === 'ramp-down' ? 40 : type === 'pit' ? 100 : 0;
      this.segments.push({ x: lastX, height: h, type });
    }
  }
  getGroundY(worldX) {
    for (const seg of this.segments) {
      if (worldX >= seg.x && worldX < seg.x + this.segWidth) {
        return this.groundY + seg.height;
      }
    }
    return this.groundY;
  }
  draw(ctx, scrollX) {
    ctx.fillStyle = '#2a2a4a';
    ctx.beginPath();
    ctx.moveTo(0, this.H);
    for (const seg of this.segments) {
      const sx = seg.x - scrollX;
      ctx.lineTo(sx, this.groundY + seg.height);
      ctx.lineTo(sx + this.segWidth, this.groundY + seg.height);
    }
    ctx.lineTo(this.W, this.H);
    ctx.closePath();
    ctx.fill();
  }
}
// === Afterimage trail effect ===
class AfterimageTrail {
  constructor(maxImages) { this.images = []; this.maxImages = maxImages || 5; }
  capture(x, y, w, h, color) {
    this.images.push({ x, y, w, h, color, alpha: 0.4 });
    if (this.images.length > this.maxImages) this.images.shift();
  }
  draw(ctx) {
    for (let i = 0; i < this.images.length; i++) {
      const img = this.images[i];
      const a = (i / this.images.length) * 0.3;
      ctx.globalAlpha = a;
      ctx.fillStyle = img.color;
      ctx.fillRect(img.x, img.y, img.w, img.h);
    }
    ctx.globalAlpha = 1;
  }
}
`
  },
  aiContext: 'ScrollingWorld handles parallax scrolling layers. ObstacleGenerator spawns obstacles that scroll left. LaneSystem manages lane-based movement (up/down). createRunner makes a running character with jump and duck. createObstacle makes scrolling obstacles. drawGround and drawRunnerHUD for rendering.',
  provides: ['ScrollingWorld', 'ObstacleGenerator', 'LaneSystem', 'createRunner', 'createObstacle', 'drawGround', 'drawRunnerHUD'],
  requires: [],
  conflicts: [],
  dependencies: []
};
