export default {
  code: `
// === PixiJS helper utilities ===

function pixiCreateSprite(app, color, w, h, x, y) {
  const gfx = new PIXI.Graphics();
  gfx.beginFill(color || 0x00fff5);
  gfx.drawRect(0, 0, w || 32, h || 32);
  gfx.endFill();
  const texture = app.renderer.generateTexture(gfx);
  const sprite = new PIXI.Sprite(texture);
  sprite.x = x || 0;
  sprite.y = y || 0;
  sprite.vx = 0;
  sprite.vy = 0;
  gfx.destroy();
  return sprite;
}

function pixiCreateText(text, style) {
  const defaultStyle = {
    fontFamily: 'Courier New',
    fontSize: 20,
    fill: 0xffffff,
    fontWeight: 'bold'
  };
  return new PIXI.Text(text, Object.assign(defaultStyle, style || {}));
}

function pixiCreateCircle(app, color, radius) {
  const gfx = new PIXI.Graphics();
  gfx.beginFill(color || 0x00fff5);
  gfx.drawCircle(0, 0, radius || 10);
  gfx.endFill();
  return gfx;
}

function pixiCreateContainer() {
  return new PIXI.Container();
}

function pixiCheckCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function pixiCreateParticles(app, count, color, x, y) {
  const container = new PIXI.Container();
  const particles = [];
  for (let i = 0; i < (count || 10); i++) {
    const gfx = new PIXI.Graphics();
    gfx.beginFill(color || 0xffe600);
    gfx.drawRect(-2, -2, 4, 4);
    gfx.endFill();
    gfx.x = x || 0;
    gfx.y = y || 0;
    gfx.vx = (Math.random() - 0.5) * 8;
    gfx.vy = (Math.random() - 0.5) * 8;
    gfx.life = 0.5 + Math.random() * 0.5;
    container.addChild(gfx);
    particles.push(gfx);
  }
  return { container, particles };
}

function pixiUpdateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= dt;
    p.alpha = Math.max(0, p.life * 2);
    if (p.life <= 0) {
      p.parent?.removeChild(p);
      p.destroy();
      particles.splice(i, 1);
    }
  }
}

function pixiLerpColor(color1, color2, t) {
  const r1 = (color1 >> 16) & 0xff, g1 = (color1 >> 8) & 0xff, b1 = color1 & 0xff;
  const r2 = (color2 >> 16) & 0xff, g2 = (color2 >> 8) & 0xff, b2 = color2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const W = canvas.width, H = canvas.height;
  let score = 0;

  const app = new PIXI.Application({
    view: canvas,
    width: W,
    height: H,
    backgroundColor: 0x0a0a1a,
    antialias: true,
  });

  // Game container
  const gameContainer = pixiCreateContainer();
  app.stage.addChild(gameContainer);

  // Player
  const player = pixiCreateSprite(app, 0x00fff5, 30, 40, W/2, H - 80);
  gameContainer.addChild(player);
  player.speed = 5;

  // Score text
  const scoreText = pixiCreateText('SCORE: 0');
  scoreText.x = 15;
  scoreText.y = 10;
  app.stage.addChild(scoreText);

  // Input
  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  // Game loop
  let running = true;
  app.ticker.add((delta) => {
    if (!running) return;
    const dt = delta / 60;

    // Movement
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;

    // Bounds
    player.x = Math.max(0, Math.min(player.x, W - player.width));
    player.y = Math.max(0, Math.min(player.y, H - player.height));

    // Score over time
    score += dt;
    scoreText.text = 'SCORE: ' + Math.floor(score);
    onScore(dt);
  });
}
`,
  tierCode: {
    3: `
// === PixiJS filter helpers ===
function pixiAddGlow(sprite, color, distance) {
  // Simplified glow using alpha blending
  sprite.alpha = 0.9;
}
// === PixiJS tween helper ===
function pixiTween(sprite, props, duration, onComplete) {
  const start = {};
  for (const key of Object.keys(props)) start[key] = sprite[key];
  let elapsed = 0;
  const ticker = (delta) => {
    elapsed += delta / 60;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    for (const key of Object.keys(props)) {
      sprite[key] = start[key] + (props[key] - start[key]) * ease;
    }
    if (t >= 1) {
      PIXI.Ticker.shared.remove(ticker);
      if (onComplete) onComplete();
    }
  };
  PIXI.Ticker.shared.add(ticker);
}
`,
    5: `
// === PixiJS camera system ===
class PixiCamera {
  constructor(container, W, H) {
    this.container = container;
    this.viewW = W; this.viewH = H;
    this.x = 0; this.y = 0;
    this.zoom = 1; this.targetZoom = 1;
    this.shakeIntensity = 0; this.shakeDuration = 0;
  }
  follow(target, smoothing) {
    const s = smoothing || 0.08;
    this.x += (target.x - this.viewW/2 - this.x) * s;
    this.y += (target.y - this.viewH/2 - this.y) * s;
  }
  shake(intensity, duration) { this.shakeIntensity = intensity; this.shakeDuration = duration; }
  update(dt) {
    this.zoom += (this.targetZoom - this.zoom) * 0.05;
    let ox = -this.x, oy = -this.y;
    if (this.shakeDuration > 0) {
      ox += (Math.random() - 0.5) * this.shakeIntensity * 2;
      oy += (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeDuration -= dt;
    }
    this.container.x = ox;
    this.container.y = oy;
    this.container.scale.set(this.zoom);
  }
}
`
  },
  aiContext: 'PixiJS helper utilities. pixiCreateSprite makes colored rectangles. pixiCreateText for text objects. pixiCreateCircle for circle graphics. pixiCheckCollision for AABB. pixiCreateParticles/pixiUpdateParticles for particle effects. The scaffold creates a PIXI.Application on the provided canvas with a game loop.',
  provides: ['pixiCreateSprite', 'pixiCreateText', 'pixiCreateCircle', 'pixiCreateContainer', 'pixiCheckCollision', 'pixiCreateParticles', 'pixiUpdateParticles', 'pixiLerpColor'],
  requires: [],
  conflicts: ['phaser', 'p5js', 'matterjs'],
  dependencies: ['https://cdn.jsdelivr.net/npm/pixi.js@7.3.3/dist/pixi.min.js']
};
