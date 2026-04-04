// NPC Game Runner — executes game code on a hidden canvas for NPC play
// Similar to GameSandbox but lightweight, with simulated AI input

const INPUT_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
const INPUT_CODES = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];

let npcRunnerIdCounter = 0;

export class NpcGameRunner {
  constructor() {
    this.runnerId = ++npcRunnerIdCounter;
    this.canvas = null;
    this.ctx = null;
    this.running = false;
    this.score = 0;
    this.gameOver = false;
    this.inputTimer = 0;
    this.skill = 0.5;
    this._script = null;
    this._canvasId = null;
    this._scoreCallback = null;
    this._gameOverCallback = null;
    this._pressedKeys = new Set();
  }

  start(gameCode, skill, onScore, onGameOver) {
    this.stop();
    this.skill = skill;
    this.score = 0;
    this.gameOver = false;
    this.inputTimer = 0;
    this._scoreCallback = onScore;
    this._gameOverCallback = onGameOver;

    // Create hidden canvas
    this._canvasId = `__vibe_npc_canvas_${this.runnerId}`;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.canvas.id = this._canvasId;
    this.canvas.style.cssText = 'position:absolute;top:-9999px;left:-9999px;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Clear canvas
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, 800, 600);

    // Set up window callbacks with unique names to avoid collision with player sandbox
    const scoreFnName = `__vibe_npc_onScore_${this.runnerId}`;
    const gameOverFnName = `__vibe_npc_onGameOver_${this.runnerId}`;

    window[scoreFnName] = (points) => {
      if (!this.running) return;
      this.score += points;
      if (this._scoreCallback) this._scoreCallback(points, this.score);
    };

    window[gameOverFnName] = (finalScore) => {
      this.running = false;
      this.gameOver = true;
      if (this._gameOverCallback) this._gameOverCallback(finalScore || this.score);
    };

    const wrappedCode = `
      try {
        ${gameCode}
        startGame(
          document.getElementById('${this._canvasId}'),
          window['${scoreFnName}'],
          window['${gameOverFnName}']
        );
      } catch(err) {
        console.error('NPC game error:', err);
        window['${gameOverFnName}'](0);
      }
    `;

    const blob = new Blob([wrappedCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this._script = document.createElement('script');
    this._script.src = url;
    document.body.appendChild(this._script);
    URL.revokeObjectURL(url);

    this.running = true;
  }

  /**
   * Called every frame from npc-manager update loop.
   * Sends simulated inputs and captures frame to machine screen.
   */
  update(dt, machine) {
    if (!this.running || this.gameOver) return;

    // Simulate NPC key inputs
    this._simulateInput(dt);

    // Capture frame to machine screen
    this._captureFrame(machine);
  }

  _simulateInput(dt) {
    this.inputTimer -= dt;
    if (this.inputTimer > 0) return;

    // Skill-tiered input: this.skill is 0.1-1.0 (mapped from 1-10)
    let interval, accuracy;
    if (this.skill >= 0.9) {
      // God tier (skill 9-10): 60-120ms, 95% accuracy
      interval = 0.06 + Math.random() * 0.06;
      accuracy = 0.95;
    } else if (this.skill >= 0.7) {
      // Good (skill 7-8): 120-200ms, 80% accuracy
      interval = 0.12 + Math.random() * 0.08;
      accuracy = 0.80;
    } else if (this.skill >= 0.5) {
      // Decent (skill 5-6): 200-300ms, 65% accuracy
      interval = 0.20 + Math.random() * 0.10;
      accuracy = 0.65;
    } else if (this.skill >= 0.3) {
      // Mediocre (skill 3-4): 300-400ms, 50% accuracy
      interval = 0.30 + Math.random() * 0.10;
      accuracy = 0.50;
    } else {
      // Noob (skill 1-2): 400-500ms, 30% accuracy
      interval = 0.40 + Math.random() * 0.10;
      accuracy = 0.30;
    }
    this.inputTimer = interval;

    // Release previously pressed keys
    for (const key of this._pressedKeys) {
      const idx = INPUT_KEYS.indexOf(key);
      this._dispatchKey('keyup', key, INPUT_CODES[idx]);
    }
    this._pressedKeys.clear();

    // Higher skill = more likely to press meaningful keys, less random pauses
    if (Math.random() < accuracy) {
      // Press 1-2 keys
      const numKeys = Math.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < numKeys; i++) {
        const idx = Math.floor(Math.random() * INPUT_KEYS.length);
        const key = INPUT_KEYS[idx];
        const code = INPUT_CODES[idx];
        this._dispatchKey('keydown', key, code);
        this._pressedKeys.add(key);
      }
    }
  }

  _dispatchKey(type, key, code) {
    // Dispatch on window (games listen on window/document)
    const event = new KeyboardEvent(type, {
      key: key,
      code: code,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  }

  _captureFrame(machine) {
    if (!this.canvas || !machine) return;
    try {
      machine.screenCtx.drawImage(this.canvas, 0, 0);
      machine.screenTexture.needsUpdate = true;
    } catch (e) {
      // Ignore capture errors
    }
  }

  stop() {
    this.running = false;
    this.gameOver = true;

    // Release any held keys
    for (const key of this._pressedKeys) {
      const idx = INPUT_KEYS.indexOf(key);
      this._dispatchKey('keyup', key, INPUT_CODES[idx]);
    }
    this._pressedKeys.clear();

    // Remove script from DOM
    if (this._script && this._script.parentNode) {
      this._script.parentNode.removeChild(this._script);
      this._script = null;
    }

    // Remove canvas from DOM
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // Clean up window globals
    if (this.runnerId) {
      delete window[`__vibe_npc_onScore_${this.runnerId}`];
      delete window[`__vibe_npc_onGameOver_${this.runnerId}`];
    }

    this.canvas = null;
    this.ctx = null;
  }

  destroy() {
    this.stop();
  }
}
