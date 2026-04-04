// NPC Game Runner — runs game code in an IFRAME for full isolation
// Each NPC gets its own iframe with its own window/document/canvas
// No keyboard event leaking between NPC games or to the player

const INPUT_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
const INPUT_CODES = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];

let npcRunnerIdCounter = 0;

export class NpcGameRunner {
  constructor() {
    this.runnerId = ++npcRunnerIdCounter;
    this.iframe = null;
    this.running = false;
    this.score = 0;
    this.gameOver = false;
    this.inputTimer = 0;
    this.skill = 0.5;
    this._pressedKeys = new Set();
  }

  start(gameCode, skill, onScore, onGameOver) {
    this.stop();
    this.skill = skill;
    this.score = 0;
    this.gameOver = false;
    this.inputTimer = 0;
    this._onScore = onScore;
    this._onGameOver = onGameOver;

    // Create hidden iframe — fully isolated window/document
    this.iframe = document.createElement('iframe');
    this.iframe.id = `__vibe_npc_iframe_${this.runnerId}`;
    this.iframe.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:800px;height:600px;border:none;';
    document.body.appendChild(this.iframe);

    const iframeDoc = this.iframe.contentDocument;
    const iframeWin = this.iframe.contentWindow;

    // Write canvas + game code into iframe
    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html><body style="margin:0;overflow:hidden;">
<canvas id="gameCanvas" width="800" height="600"></canvas>
<script>
  var __npcScore = 0;
  function __onScore(pts) {
    __npcScore += pts;
    window.parent.postMessage({ type: 'npc-score', id: ${this.runnerId}, points: pts, total: __npcScore }, '*');
  }
  function __onGameOver(finalScore) {
    window.parent.postMessage({ type: 'npc-gameover', id: ${this.runnerId}, score: finalScore || __npcScore }, '*');
  }
  try {
    ${gameCode}
    startGame(document.getElementById('gameCanvas'), __onScore, __onGameOver);
  } catch(err) {
    console.error('NPC game error:', err);
    __onGameOver(0);
  }
</` + `script>
</body></html>`);
    iframeDoc.close();

    // Listen for messages from iframe
    this._messageHandler = (e) => {
      if (!e.data || e.data.id !== this.runnerId) return;
      if (e.data.type === 'npc-score') {
        this.score = e.data.total;
        if (this._onScore) this._onScore(e.data.points, e.data.total);
      } else if (e.data.type === 'npc-gameover') {
        this.score = e.data.score || this.score;
        this.gameOver = true;
        this.running = false;
        if (this._onGameOver) this._onGameOver(this.score);
      }
    };
    window.addEventListener('message', this._messageHandler);

    this.running = true;
  }

  update(dt, machine) {
    if (!this.running || this.gameOver || !this.iframe) return;
    this._simulateInput(dt);
    this._captureFrame(machine);
  }

  _simulateInput(dt) {
    this.inputTimer -= dt;
    if (this.inputTimer > 0) return;

    // Skill-tiered intervals
    let interval, accuracy;
    if (this.skill >= 0.9) { interval = 0.06 + Math.random() * 0.06; accuracy = 0.95; }
    else if (this.skill >= 0.7) { interval = 0.12 + Math.random() * 0.08; accuracy = 0.80; }
    else if (this.skill >= 0.5) { interval = 0.20 + Math.random() * 0.10; accuracy = 0.65; }
    else if (this.skill >= 0.3) { interval = 0.30 + Math.random() * 0.10; accuracy = 0.50; }
    else { interval = 0.40 + Math.random() * 0.10; accuracy = 0.30; }
    this.inputTimer = interval;

    const iframeWin = this.iframe?.contentWindow;
    if (!iframeWin) return;

    // Release previous keys inside iframe
    for (const key of this._pressedKeys) {
      const idx = INPUT_KEYS.indexOf(key);
      this._dispatchKeyInIframe(iframeWin, 'keyup', key, INPUT_CODES[idx]);
    }
    this._pressedKeys.clear();

    // Press keys based on accuracy
    if (Math.random() < accuracy) {
      const numKeys = Math.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < numKeys; i++) {
        const idx = Math.floor(Math.random() * INPUT_KEYS.length);
        this._dispatchKeyInIframe(iframeWin, 'keydown', INPUT_KEYS[idx], INPUT_CODES[idx]);
        this._pressedKeys.add(INPUT_KEYS[idx]);
      }
    }
  }

  _dispatchKeyInIframe(win, type, key, code) {
    try {
      const event = new win.KeyboardEvent(type, {
        key, code, bubbles: true, cancelable: true,
      });
      win.document.dispatchEvent(event);
      win.dispatchEvent(event);
    } catch (e) {
      // Iframe may be dead
    }
  }

  _captureFrame(machine) {
    if (!this.iframe || !machine?.screenCtx || !machine?.screenTexture) return;
    try {
      const iframeCanvas = this.iframe.contentDocument?.getElementById('gameCanvas');
      if (iframeCanvas) {
        machine.screenCtx.drawImage(iframeCanvas, 0, 0, 800, 600);
        machine.screenTexture.needsUpdate = true;
      }
    } catch (e) {
      // Cross-origin or dead iframe
    }
  }

  stop() {
    this.running = false;
    this.gameOver = true;

    // Release keys
    if (this.iframe?.contentWindow) {
      for (const key of this._pressedKeys) {
        const idx = INPUT_KEYS.indexOf(key);
        this._dispatchKeyInIframe(this.iframe.contentWindow, 'keyup', key, INPUT_CODES[idx]);
      }
    }
    this._pressedKeys.clear();

    // Remove message listener
    if (this._messageHandler) {
      window.removeEventListener('message', this._messageHandler);
      this._messageHandler = null;
    }

    // Remove iframe
    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
  }

  destroy() {
    this.stop();
  }
}
