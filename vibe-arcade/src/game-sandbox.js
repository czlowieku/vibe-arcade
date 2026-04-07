// Game sandbox - executes AI-generated Canvas2D game code directly
// This is intentional dynamic code execution for AI-generated mini-games.

const ALLOWED_CDN_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
]);

let runToken = 0;

export class GameSandbox {
  constructor() {
    this.gameCanvas = null;
    this.running = false;
    this.onScore = null;
    this.onGameOver = null;
    this._loadedLibs = new Set();
    this._runToken = 0;
  }

  _createFreshCanvas() {
    if (this.gameCanvas && this.gameCanvas.parentNode) {
      this.gameCanvas.parentNode.removeChild(this.gameCanvas);
    }
    this.gameCanvas = document.createElement('canvas');
    this.gameCanvas.width = 800;
    this.gameCanvas.height = 600;
    return this.gameCanvas;
  }

  async _loadDependencies(deps) {
    if (!deps || deps.length === 0) return;
    const toLoad = deps.filter(url => !this._loadedLibs.has(url));
    for (const url of toLoad) {
      try {
        const parsed = new URL(url);
        if (!ALLOWED_CDN_HOSTS.has(parsed.hostname)) continue;
      } catch { continue; }
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => { this._loadedLibs.add(url); resolve(); };
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    }
  }

  async load(gameCode, onScore, onGameOver, deps) {
    this.stop();
    this.onScore = onScore;
    this.onGameOver = onGameOver;
    this.running = true;
    this._runToken = ++runToken;
    const myToken = this._runToken;

    this._createFreshCanvas();
    await this._loadDependencies(deps);

    // If another load happened while we were loading deps, bail
    if (this._runToken !== myToken) return;

    // Attach canvas
    this.gameCanvas.id = '__vibe_game_canvas';
    this.gameCanvas.style.cssText = 'position:absolute;top:-9999px;left:-9999px;';
    document.body.appendChild(this.gameCanvas);

    // Callbacks — token-guarded so old games can't fire into new ones
    window.__vibe_onScore = (points) => {
      if (this._runToken === myToken && this.onScore) this.onScore(points);
    };
    window.__vibe_onGameOver = (finalScore) => {
      if (this._runToken !== myToken) return;
      this.running = false;
      if (this.onGameOver) this.onGameOver(finalScore);
    };

    // Override rAF so old game loops auto-stop when a new game starts
    const nativeRAF = window.requestAnimationFrame.bind(window);
    window.__vibe_raf = (cb) => {
      if (this._runToken !== myToken) return 0; // old game — stop loop
      return nativeRAF(cb);
    };

    // Wrap in IIFE so const/let/class don't pollute global scope
    // Override requestAnimationFrame inside the IIFE to use token-guarded version
    // This is the core mechanic of Vibe Arcade: AI generates game code that runs here
    const wrappedCode = `
;(function() {
  var requestAnimationFrame = window.__vibe_raf || window.requestAnimationFrame.bind(window);
${gameCode}

  try {
    startGame(
      document.getElementById('__vibe_game_canvas'),
      window.__vibe_onScore,
      window.__vibe_onGameOver
    );
  } catch(err) {
    console.error('Game error:', err);
    var ctx = document.getElementById('__vibe_game_canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#ff4444';
      ctx.font = '24px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('ERROR: ' + err.message, 400, 280);
    }
    if (window.__vibe_onGameOver) window.__vibe_onGameOver(0);
  }
})();
    `;

    const blob = new Blob([wrappedCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this._script = document.createElement('script');
    this._script.src = url;
    document.body.appendChild(this._script);
    URL.revokeObjectURL(url);
  }

  captureFrame(targetCanvas, targetCtx) {
    if (!this.running || !this.gameCanvas) return false;
    try {
      targetCtx.drawImage(this.gameCanvas, 0, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  sendInput(type, key, code) {}

  stop() {
    this.running = false;
    this._runToken = ++runToken; // invalidate old game loops
    if (this._script && this._script.parentNode) {
      this._script.parentNode.removeChild(this._script);
      this._script = null;
    }
    if (this.gameCanvas && this.gameCanvas.parentNode) {
      this.gameCanvas.parentNode.removeChild(this.gameCanvas);
    }
    delete window.__vibe_onScore;
    delete window.__vibe_onGameOver;
    delete window.__vibe_raf;
  }

  destroy() {
    this.stop();
  }
}
