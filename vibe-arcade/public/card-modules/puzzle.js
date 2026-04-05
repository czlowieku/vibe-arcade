export default {
  code: `
// === Grid class ===
class Grid {
  constructor(cols, rows, cellSize, offsetX, offsetY) {
    this.cols = cols || 8;
    this.rows = rows || 8;
    this.cellSize = cellSize || 60;
    this.offsetX = offsetX || 0;
    this.offsetY = offsetY || 0;
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c] = null;
      }
    }
  }
  get(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.cells[row][col];
  }
  set(col, row, value) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.cells[row][col] = value;
  }
  clear(col, row) { this.set(col, row, null); }
  toPixel(col, row) {
    return { x: this.offsetX + col * this.cellSize, y: this.offsetY + row * this.cellSize };
  }
  fromPixel(px, py) {
    return { col: Math.floor((px - this.offsetX) / this.cellSize), row: Math.floor((py - this.offsetY) / this.cellSize) };
  }
  isValid(col, row) { return col >= 0 && col < this.cols && row >= 0 && row < this.rows; }
  fill(generator) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c] = generator(c, r);
      }
    }
  }
  forEach(callback) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c] !== null) callback(this.cells[r][c], c, r);
      }
    }
  }
  swap(c1, r1, c2, r2) {
    const temp = this.cells[r1][c1];
    this.cells[r1][c1] = this.cells[r2][c2];
    this.cells[r2][c2] = temp;
  }
  drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= this.rows; r++) {
      const y = this.offsetY + r * this.cellSize;
      ctx.beginPath(); ctx.moveTo(this.offsetX, y); ctx.lineTo(this.offsetX + this.cols * this.cellSize, y); ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = this.offsetX + c * this.cellSize;
      ctx.beginPath(); ctx.moveTo(x, this.offsetY); ctx.lineTo(x, this.offsetY + this.rows * this.cellSize); ctx.stroke();
    }
  }
}

// === MatchDetector ===
class MatchDetector {
  constructor(grid, minMatch) {
    this.grid = grid;
    this.minMatch = minMatch || 3;
  }
  findMatches() {
    const matched = new Set();
    // Horizontal
    for (let r = 0; r < this.grid.rows; r++) {
      let run = 1;
      for (let c = 1; c < this.grid.cols; c++) {
        const prev = this.grid.get(c - 1, r);
        const curr = this.grid.get(c, r);
        if (prev && curr && prev.type === curr.type) {
          run++;
        } else {
          if (run >= this.minMatch) {
            for (let k = 0; k < run; k++) matched.add(r + ',' + (c - 1 - k));
          }
          run = 1;
        }
      }
      if (run >= this.minMatch) {
        for (let k = 0; k < run; k++) matched.add(r + ',' + (this.grid.cols - 1 - k));
      }
    }
    // Vertical
    for (let c = 0; c < this.grid.cols; c++) {
      let run = 1;
      for (let r = 1; r < this.grid.rows; r++) {
        const prev = this.grid.get(c, r - 1);
        const curr = this.grid.get(c, r);
        if (prev && curr && prev.type === curr.type) {
          run++;
        } else {
          if (run >= this.minMatch) {
            for (let k = 0; k < run; k++) matched.add((r - 1 - k) + ',' + c);
          }
          run = 1;
        }
      }
      if (run >= this.minMatch) {
        for (let k = 0; k < run; k++) matched.add((this.grid.rows - 1 - k) + ',' + c);
      }
    }
    return [...matched].map(s => { const [r, c] = s.split(',').map(Number); return { col: c, row: r }; });
  }
  hasAnyMatch() { return this.findMatches().length > 0; }
}

// === createBlock ===
const BLOCK_COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
const BLOCK_TYPES = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan'];
function createBlock(type, col, row) {
  const idx = typeof type === 'number' ? type : BLOCK_TYPES.indexOf(type);
  return {
    type: BLOCK_TYPES[idx] || BLOCK_TYPES[0],
    color: BLOCK_COLORS[idx] || BLOCK_COLORS[0],
    col: col, row: row,
    x: 0, y: 0, targetX: 0, targetY: 0,
    scale: 1, alpha: 1, clearing: false,
    draw(ctx, grid) {
      const pos = grid.toPixel(this.col, this.row);
      this.targetX = pos.x; this.targetY = pos.y;
      this.x += (this.targetX - this.x) * 0.2;
      this.y += (this.targetY - this.y) * 0.2;
      const pad = 3;
      const s = grid.cellSize - pad * 2;
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x + pad, this.y + pad, s * this.scale, s * this.scale);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(this.x + pad, this.y + pad, s * this.scale, 4);
      ctx.globalAlpha = 1;
    }
  };
}

// === animateClear ===
function animateClear(blocks, onDone) {
  let frame = 0;
  const maxFrames = 15;
  function step() {
    frame++;
    for (const b of blocks) {
      b.scale = 1 - frame / maxFrames;
      b.alpha = 1 - frame / maxFrames;
    }
    if (frame < maxFrames) {
      requestAnimationFrame(step);
    } else {
      if (onDone) onDone();
    }
  }
  step();
}

// === animateFall ===
function animateFall(grid, numTypes) {
  // Drop blocks down to fill gaps
  for (let c = 0; c < grid.cols; c++) {
    let writeRow = grid.rows - 1;
    for (let r = grid.rows - 1; r >= 0; r--) {
      if (grid.get(c, r) !== null) {
        const block = grid.get(c, r);
        if (r !== writeRow) {
          grid.set(c, writeRow, block);
          grid.clear(c, r);
          block.row = writeRow;
        }
        writeRow--;
      }
    }
    // Fill empty top
    for (let r = writeRow; r >= 0; r--) {
      const typeIdx = Math.floor(Math.random() * (numTypes || 6));
      const block = createBlock(typeIdx, c, r);
      block.y = -grid.cellSize * (writeRow - r + 1);
      grid.set(c, r, block);
    }
  }
}

// === Selection highlight ===
function drawSelection(ctx, grid, col, row) {
  if (col < 0 || row < 0) return;
  const pos = grid.toPixel(col, row);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(pos.x + 1, pos.y + 1, grid.cellSize - 2, grid.cellSize - 2);
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const COLS = 8, ROWS = 8, CELL = 60;
  const ox = (W - COLS * CELL) / 2, oy = (H - ROWS * CELL) / 2;
  const grid = new Grid(COLS, ROWS, CELL, ox, oy);
  const detector = new MatchDetector(grid, 3);
  const NUM_TYPES = 5;
  grid.fill((c, r) => createBlock(Math.floor(Math.random() * NUM_TYPES), c, r));
  // Remove initial matches
  while (detector.hasAnyMatch()) {
    grid.fill((c, r) => createBlock(Math.floor(Math.random() * NUM_TYPES), c, r));
  }
  let score = 0;
  let selectedCol = -1, selectedRow = -1;
  let moves = 30;
  let animating = false;
  // === INPUT ===
  canvas.addEventListener('click', (e) => {
    if (animating) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const pos = grid.fromPixel(mx, my);
    if (!grid.isValid(pos.col, pos.row)) return;
    if (selectedCol < 0) {
      selectedCol = pos.col; selectedRow = pos.row;
    } else {
      const dc = Math.abs(pos.col - selectedCol), dr = Math.abs(pos.row - selectedRow);
      if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) {
        grid.swap(selectedCol, selectedRow, pos.col, pos.row);
        const b1 = grid.get(selectedCol, selectedRow);
        const b2 = grid.get(pos.col, pos.row);
        if (b1) { b1.col = selectedCol; b1.row = selectedRow; }
        if (b2) { b2.col = pos.col; b2.row = pos.row; }
        moves--;
        processMatches();
      }
      selectedCol = -1; selectedRow = -1;
    }
  });
  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);
  function processMatches() {
    const matches = detector.findMatches();
    if (matches.length > 0) {
      animating = true;
      const pts = matches.length * 10;
      score += pts;
      onScore(pts);
      const blocks = matches.map(m => grid.get(m.col, m.row)).filter(Boolean);
      animateClear(blocks, () => {
        for (const m of matches) grid.clear(m.col, m.row);
        animateFall(grid, NUM_TYPES);
        setTimeout(() => { animating = false; processMatches(); }, 300);
      });
    } else if (moves <= 0) {
      onGameOver(score);
    }
  }
  let running = true;
  function gameLoop() {
    if (!running) return;
    // === RENDER ===
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    grid.drawGrid(ctx);
    grid.forEach((block) => block.draw(ctx, grid));
    drawSelection(ctx, grid, selectedCol, selectedRow);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 15, 30);
    ctx.fillText('MOVES: ' + moves, 15, 55);
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}
`,
  tierCode: {
    3: `
// === Chain combo scoring ===
class ChainScorer {
  constructor() { this.chain = 0; }
  startChain() { this.chain = 0; }
  nextChain(matchCount) {
    this.chain++;
    return matchCount * 10 * this.chain;
  }
  draw(ctx, x, y) {
    if (this.chain > 1) {
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 18px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('CHAIN x' + this.chain + '!', x, y);
    }
  }
}
// === Special block ===
function createSpecialBlock(type, col, row) {
  const b = createBlock(type, col, row);
  b.special = true;
  b.originalDraw = b.draw;
  b.draw = function(ctx, grid) {
    this.originalDraw(ctx, grid);
    const pos = grid.toPixel(this.col, this.row);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    const cx = pos.x + grid.cellSize/2, cy = pos.y + grid.cellSize/2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (Date.now() / 300 + i * Math.PI/2);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
    }
    ctx.stroke();
  };
  return b;
}
`,
    5: `
// === Hint system ===
class HintSystem {
  constructor(grid, detector) { this.grid = grid; this.detector = detector; this.hintTimer = 0; this.hint = null; }
  update(dt) {
    this.hintTimer += dt;
    if (this.hintTimer > 3 && !this.hint) { this.findHint(); }
  }
  reset() { this.hintTimer = 0; this.hint = null; }
  findHint() {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        // Try swap right
        if (c < this.grid.cols - 1) {
          this.grid.swap(c, r, c + 1, r);
          if (this.detector.hasAnyMatch()) { this.hint = { c1: c, r1: r, c2: c + 1, r2: r }; this.grid.swap(c, r, c + 1, r); return; }
          this.grid.swap(c, r, c + 1, r);
        }
        // Try swap down
        if (r < this.grid.rows - 1) {
          this.grid.swap(c, r, c, r + 1);
          if (this.detector.hasAnyMatch()) { this.hint = { c1: c, r1: r, c2: c, r2: r + 1 }; this.grid.swap(c, r, c, r + 1); return; }
          this.grid.swap(c, r, c, r + 1);
        }
      }
    }
  }
  draw(ctx) {
    if (!this.hint) return;
    const t = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    ctx.strokeStyle = 'rgba(255,255,0,' + t + ')';
    ctx.lineWidth = 3;
    const p1 = this.grid.toPixel(this.hint.c1, this.hint.r1);
    const p2 = this.grid.toPixel(this.hint.c2, this.hint.r2);
    ctx.strokeRect(p1.x + 2, p1.y + 2, this.grid.cellSize - 4, this.grid.cellSize - 4);
    ctx.strokeRect(p2.x + 2, p2.y + 2, this.grid.cellSize - 4, this.grid.cellSize - 4);
  }
}
// === Board shuffle ===
function shuffleBoard(grid, numTypes) {
  grid.fill((c, r) => createBlock(Math.floor(Math.random() * numTypes), c, r));
}
`
  },
  aiContext: 'Grid provides a 2D cell grid with toPixel/fromPixel conversion, swap, forEach. MatchDetector scans for 3+ horizontal/vertical matches. createBlock makes colored blocks that animate to grid positions. animateClear shrinks/fades matched blocks. animateFall collapses gaps and fills new blocks from top. drawSelection highlights a selected cell.',
  provides: ['Grid', 'MatchDetector', 'createBlock', 'animateClear', 'animateFall', 'drawSelection', 'BLOCK_COLORS', 'BLOCK_TYPES'],
  requires: [],
  conflicts: [],
  dependencies: []
};
