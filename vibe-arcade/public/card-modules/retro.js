export default {
  code: `
// === RETRO_COLORS ===
const RETRO_COLORS = {
  black: '#000000', darkGreen: '#0f380f', green: '#306230',
  lightGreen: '#8bac0f', lightest: '#9bbc0f',
  white: '#ffffff', red: '#cc0000', blue: '#0000cc',
  yellow: '#cccc00', orange: '#cc6600',
  bg: '#0f380f',
  palette: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  nes: ['#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc', '#7c7c7c', '#a40000', '#0000a4', '#44a800', '#a4a400', '#a45400']
};

// === drawPixelRect ===
function drawPixelRect(ctx, x, y, w, h, color, pixelSize) {
  const ps = pixelSize || 4;
  ctx.fillStyle = color;
  const px = Math.round(x / ps) * ps;
  const py = Math.round(y / ps) * ps;
  const pw = Math.round(w / ps) * ps;
  const ph = Math.round(h / ps) * ps;
  ctx.fillRect(px, py, pw, ph);
}

// === drawPixelText ===
function drawPixelText(ctx, text, x, y, color, size) {
  const s = size || 16;
  ctx.fillStyle = color || RETRO_COLORS.lightest;
  ctx.font = s + 'px Courier New';
  ctx.textAlign = 'left';
  // Snap to pixel grid
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  ctx.fillText(text, px, py);
}

// === drawPixelSprite ===
function drawPixelSprite(ctx, x, y, sprite, pixelSize, palette) {
  const ps = pixelSize || 4;
  const pal = palette || RETRO_COLORS.nes;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const val = sprite[row][col];
      if (val === 0) continue;
      ctx.fillStyle = pal[val] || pal[1];
      ctx.fillRect(x + col * ps, y + row * ps, ps, ps);
    }
  }
}

// === SpriteSheet ===
class SpriteSheet {
  constructor(sprites, pixelSize) {
    this.sprites = sprites; // Map of name -> 2D array
    this.pixelSize = pixelSize || 4;
    this.animations = {};
    this.currentAnim = null;
    this.frame = 0;
    this.frameTimer = 0;
    this.frameRate = 8;
  }
  addAnimation(name, frameNames, loop) {
    this.animations[name] = { frames: frameNames, loop: loop !== false };
  }
  play(name) {
    if (this.currentAnim !== name) {
      this.currentAnim = name;
      this.frame = 0;
      this.frameTimer = 0;
    }
  }
  update(dt) {
    if (!this.currentAnim) return;
    const anim = this.animations[this.currentAnim];
    if (!anim) return;
    this.frameTimer += dt;
    if (this.frameTimer >= 1 / this.frameRate) {
      this.frameTimer = 0;
      this.frame++;
      if (this.frame >= anim.frames.length) {
        this.frame = anim.loop ? 0 : anim.frames.length - 1;
      }
    }
  }
  getCurrentSprite() {
    if (!this.currentAnim) return null;
    const anim = this.animations[this.currentAnim];
    if (!anim) return null;
    return this.sprites[anim.frames[this.frame]];
  }
  draw(ctx, x, y, palette) {
    const sprite = this.getCurrentSprite();
    if (sprite) drawPixelSprite(ctx, x, y, sprite, this.pixelSize, palette);
  }
}

// === SPRITES templates ===
const SPRITES = {
  player_idle: [
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,3,1,3,1,0,0],
    [0,1,1,1,1,1,0,0],
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,0,0,0,1,0,0],
    [0,1,0,0,0,1,0,0],
  ],
  player_walk1: [
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,3,1,3,1,0,0],
    [0,1,1,1,1,1,0,0],
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,0,1,0,1,0,0,0],
    [0,1,0,0,0,1,0,0],
  ],
  player_walk2: [
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,3,1,3,1,0,0],
    [0,1,1,1,1,1,0,0],
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,0,0,0,1,0,0],
    [0,0,1,0,1,0,0,0],
  ],
  enemy_1: [
    [0,0,5,5,5,5,0,0],
    [0,5,5,5,5,5,5,0],
    [5,5,1,5,5,1,5,5],
    [5,5,5,5,5,5,5,5],
    [5,5,1,1,1,1,5,5],
    [0,5,5,5,5,5,5,0],
    [0,0,5,0,0,5,0,0],
    [0,5,0,0,0,0,5,0],
  ],
  coin: [
    [0,0,4,4,4,0,0,0],
    [0,4,4,4,4,4,0,0],
    [4,4,1,4,1,4,4,0],
    [4,4,4,4,4,4,4,0],
    [4,4,1,4,1,4,4,0],
    [0,4,4,4,4,4,0,0],
    [0,0,4,4,4,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  heart: [
    [0,5,5,0,5,5,0,0],
    [5,5,5,5,5,5,5,0],
    [5,5,5,5,5,5,5,0],
    [5,5,5,5,5,5,5,0],
    [0,5,5,5,5,5,0,0],
    [0,0,5,5,5,0,0,0],
    [0,0,0,5,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
};

// === Retro screen effect ===
function drawRetroBackground(ctx, W, H) {
  ctx.fillStyle = RETRO_COLORS.bg;
  ctx.fillRect(0, 0, W, H);
}

// === Retro CRT effect ===
function drawCRTEffect(ctx, W, H) {
  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < H; y += 2) {
    ctx.fillRect(0, y, W, 1);
  }
  // Vignette
  const grad = ctx.createRadialGradient(W/2, H/2, W * 0.3, W/2, H/2, W * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// === Retro score display ===
function drawRetroScore(ctx, text, x, y) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 2, y - 14, text.length * 10 + 4, 18);
  drawPixelText(ctx, text, x, y, RETRO_COLORS.lightest, 14);
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Animated retro tiles ===
class RetroTileMap {
  constructor(cols, rows, tileSize) {
    this.cols = cols; this.rows = rows; this.tileSize = tileSize || 32;
    this.tiles = [];
    for (let r = 0; r < rows; r++) {
      this.tiles[r] = new Array(cols).fill(0);
    }
    this.tileSprites = {};
  }
  setTile(col, row, id) { if (this.tiles[row]) this.tiles[row][col] = id; }
  setTileSprite(id, sprite) { this.tileSprites[id] = sprite; }
  draw(ctx, palette) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const id = this.tiles[r][c];
        if (id === 0) continue;
        const sprite = this.tileSprites[id];
        if (sprite) {
          drawPixelSprite(ctx, c * this.tileSize, r * this.tileSize, sprite, this.tileSize / 8, palette);
        } else {
          ctx.fillStyle = RETRO_COLORS.palette[id] || '#888';
          ctx.fillRect(c * this.tileSize, r * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }
  }
}
`,
    5: `
// === Screen transition effects ===
class RetroTransition {
  constructor(W, H) { this.W = W; this.H = H; this.progress = 0; this.active = false; this.type = 'fade'; this.onMidpoint = null; this.midpointCalled = false; }
  start(type, onMidpoint) { this.active = true; this.progress = 0; this.type = type || 'fade'; this.onMidpoint = onMidpoint; this.midpointCalled = false; }
  update(dt) {
    if (!this.active) return;
    this.progress += dt * 2;
    if (this.progress >= 0.5 && !this.midpointCalled && this.onMidpoint) { this.midpointCalled = true; this.onMidpoint(); }
    if (this.progress >= 1) this.active = false;
  }
  draw(ctx) {
    if (!this.active) return;
    const t = this.progress < 0.5 ? this.progress * 2 : (1 - this.progress) * 2;
    if (this.type === 'fade') {
      ctx.fillStyle = 'rgba(0,0,0,' + t + ')';
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.type === 'pixelate') {
      const size = Math.max(1, Math.floor(t * 20));
      ctx.fillStyle = RETRO_COLORS.bg;
      for (let x = 0; x < this.W; x += size * 2) {
        for (let y = 0; y < this.H; y += size * 2) {
          if (Math.random() < t) ctx.fillRect(x, y, size, size);
        }
      }
    }
  }
}
// === Palette swap ===
function swapPalette(original, newPalette) {
  return original.map(row => row.map(val => val === 0 ? 0 : Math.min(val, newPalette.length - 1)));
}
`
  },
  aiContext: 'RETRO_COLORS provides GB/NES palettes. drawPixelRect/Text snap to pixel grids. drawPixelSprite renders a 2D array using a color palette. SpriteSheet manages named sprite animations. SPRITES has preset sprite templates (player, enemy, coin, heart). drawRetroBackground, drawCRTEffect, drawRetroScore for retro visuals.',
  provides: ['RETRO_COLORS', 'drawPixelRect', 'drawPixelText', 'drawPixelSprite', 'SpriteSheet', 'SPRITES', 'drawRetroBackground', 'drawCRTEffect', 'drawRetroScore'],
  requires: [],
  conflicts: [],
  dependencies: []
};
