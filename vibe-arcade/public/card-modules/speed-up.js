export default {
  code: `
// === SpeedRampSystem ===
class SpeedRampSystem {
  constructor(options) {
    const opts = options || {};
    this.baseSpeed = opts.baseSpeed || 1;
    this.maxSpeed = opts.maxSpeed || 3;
    this.rampInterval = opts.rampInterval || 10; // seconds between ramps
    this.rampAmount = opts.rampAmount || 0.15;
    this.currentSpeed = this.baseSpeed;
    this.elapsed = 0;
    this.lastRampTime = 0;
    this.rampCount = 0;
    this.curve = opts.curve || 'linear'; // 'linear', 'exponential', 'step'
    this.flashTimer = 0;
    this.onRamp = opts.onRamp || null;
  }
  update(dt) {
    this.elapsed += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    switch (this.curve) {
      case 'linear':
        this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.elapsed / this.rampInterval) * this.rampAmount);
        break;
      case 'exponential':
        this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed * Math.pow(1 + this.rampAmount * 0.1, this.elapsed / this.rampInterval));
        break;
      case 'step':
        const steps = Math.floor(this.elapsed / this.rampInterval);
        if (steps > this.rampCount) {
          this.rampCount = steps;
          this.flashTimer = 0.5;
          if (this.onRamp) this.onRamp(this.rampCount);
        }
        this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + steps * this.rampAmount);
        break;
    }
  }
  getMultiplier() {
    return this.currentSpeed;
  }
  isRamping() {
    return this.flashTimer > 0;
  }
  getSpeedPercent() {
    return Math.round((this.currentSpeed / this.maxSpeed) * 100);
  }
  drawSpeedBar(ctx, x, y, w, h) {
    const pct = (this.currentSpeed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed);
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, w, h);
    // Fill
    const r = Math.floor(255 * pct);
    const g = Math.floor(255 * (1 - pct));
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',0)';
    ctx.fillRect(x, y, w * pct, h);
    // Border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(this.currentSpeed.toFixed(1) + 'x', x + w/2, y + h - 2);
  }
  drawFlash(ctx, W, H) {
    if (this.flashTimer <= 0) return;
    ctx.globalAlpha = this.flashTimer * 0.3;
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    // Speed up text
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 32px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('SPEED UP!', W/2, H/2);
  }
  reset() {
    this.currentSpeed = this.baseSpeed;
    this.elapsed = 0;
    this.rampCount = 0;
    this.flashTimer = 0;
  }
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Speed streak visual ===
class SpeedStreak {
  constructor() { this.streaks = []; }
  update(speed, W, H) {
    if (speed > 1.5 && Math.random() < (speed - 1) * 0.3) {
      this.streaks.push({
        x: Math.random() * W, y: Math.random() * H,
        length: 20 + speed * 15, alpha: 0.3, speed: speed * 3
      });
    }
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.x -= s.speed; s.alpha -= 0.02;
      if (s.alpha <= 0 || s.x + s.length < 0) this.streaks.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const s of this.streaks) {
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.length, s.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
`,
    5: `
// === Adaptive difficulty with speed ===
class AdaptiveSpeedDifficulty {
  constructor() {
    this.playerDeaths = 0;
    this.speedAdjust = 0;
    this.scoreThresholds = [100, 300, 600, 1000, 2000];
    this.currentTier = 0;
  }
  recordDeath() {
    this.playerDeaths++;
    if (this.playerDeaths > 3) this.speedAdjust = -0.2;
    if (this.playerDeaths > 6) this.speedAdjust = -0.4;
  }
  checkScore(score) {
    while (this.currentTier < this.scoreThresholds.length && score >= this.scoreThresholds[this.currentTier]) {
      this.currentTier++;
    }
  }
  getModifier() {
    return 1 + this.currentTier * 0.1 + this.speedAdjust;
  }
}
`
  },
  aiContext: 'SpeedRampSystem progressively increases game speed. Supports linear, exponential, and step curves. getMultiplier() returns the current speed factor. drawSpeedBar shows a color-coded speed indicator. drawFlash shows a screen flash on speed increases.',
  provides: ['SpeedRampSystem'],
  requires: [],
  conflicts: [],
  dependencies: []
};
