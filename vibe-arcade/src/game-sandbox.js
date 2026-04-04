// Game sandbox - executes AI-generated Canvas2D game code directly
// The game code is sanitized server-side before reaching here.
// This is intentional dynamic code execution for AI-generated mini-games.

export class GameSandbox {
  constructor() {
    this.gameCanvas = document.createElement('canvas');
    this.gameCanvas.width = 800;
    this.gameCanvas.height = 600;
    this.gameCtx = this.gameCanvas.getContext('2d');
    this.running = false;
    this.onScore = null;
    this.onGameOver = null;
  }

  load(gameCode, onScore, onGameOver) {
    this.stop();
    this.onScore = onScore;
    this.onGameOver = onGameOver;
    this.running = true;

    // Clear canvas to dark background
    this.gameCtx.fillStyle = '#0a0a1a';
    this.gameCtx.fillRect(0, 0, 800, 600);

    // Build a self-contained script and run it via a Blob-based script element
    // This is the core mechanic of Vibe Arcade: AI generates game code that runs here
    const wrappedCode = `
      try {
        ${gameCode}
        startGame(
          document.getElementById('__vibe_game_canvas'),
          window.__vibe_onScore,
          window.__vibe_onGameOver
        );
      } catch(err) {
        console.error('Game error:', err);
        const ctx = document.getElementById('__vibe_game_canvas').getContext('2d');
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ff4444';
        ctx.font = '24px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('ERROR: ' + err.message, 400, 280);
        window.__vibe_onGameOver(0);
      }
    `;

    // Attach canvas to DOM temporarily (hidden) so game code can find it
    this.gameCanvas.id = '__vibe_game_canvas';
    this.gameCanvas.style.cssText = 'position:absolute;top:-9999px;left:-9999px;';
    document.body.appendChild(this.gameCanvas);

    // Set up callbacks on window
    window.__vibe_onScore = (points) => {
      if (this.onScore) this.onScore(points);
    };
    window.__vibe_onGameOver = (finalScore) => {
      this.running = false;
      if (this.onGameOver) this.onGameOver(finalScore);
    };

    // Execute via script element with blob URL
    const blob = new Blob([wrappedCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this._script = document.createElement('script');
    this._script.src = url;
    document.body.appendChild(this._script);
    URL.revokeObjectURL(url);
  }

  captureFrame(targetCanvas, targetCtx) {
    if (!this.running) return false;
    try {
      targetCtx.drawImage(this.gameCanvas, 0, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  sendInput(type, key, code) {
    // Game code listens on window directly — no forwarding needed
  }

  stop() {
    this.running = false;
    // Remove script and canvas from DOM
    if (this._script && this._script.parentNode) {
      this._script.parentNode.removeChild(this._script);
      this._script = null;
    }
    if (this.gameCanvas.parentNode) {
      this.gameCanvas.parentNode.removeChild(this.gameCanvas);
    }
    // Clean up window globals
    delete window.__vibe_onScore;
    delete window.__vibe_onGameOver;
    // Clear canvas
    this.gameCtx.fillStyle = '#0a0a1a';
    this.gameCtx.fillRect(0, 0, 800, 600);
  }

  destroy() {
    this.stop();
  }
}
