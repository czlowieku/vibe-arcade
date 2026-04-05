export default {
  code: `
// === CountdownTimer ===
class CountdownTimer {
  constructor(options) {
    const opts = options || {};
    this.totalTime = opts.totalTime || 60;
    this.timeLeft = this.totalTime;
    this.running = true;
    this.warningThreshold = opts.warningThreshold || 10;
    this.criticalThreshold = opts.criticalThreshold || 5;
    this.bonusFlash = 0;
    this.onTimeUp = opts.onTimeUp || null;
    this.onWarning = opts.onWarning || null;
    this.warningSent = false;
    this.flashColor = '#ffe600';
    this.pulsePhase = 0;
  }
  update(dt) {
    if (!this.running) return;
    this.timeLeft -= dt;
    this.pulsePhase += dt * 6;
    this.bonusFlash = Math.max(0, this.bonusFlash - dt * 2);
    if (this.timeLeft <= this.warningThreshold && !this.warningSent) {
      this.warningSent = true;
      if (this.onWarning) this.onWarning(this.timeLeft);
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.running = false;
      if (this.onTimeUp) this.onTimeUp();
    }
  }
  addTime(seconds) {
    this.timeLeft += seconds;
    this.bonusFlash = 1;
    this.flashColor = seconds > 0 ? '#00ff88' : '#ff4444';
    if (this.timeLeft > this.warningThreshold) this.warningSent = false;
  }
  getState() {
    if (this.timeLeft <= 0) return 'expired';
    if (this.timeLeft <= this.criticalThreshold) return 'critical';
    if (this.timeLeft <= this.warningThreshold) return 'warning';
    return 'normal';
  }
  getTimeFormatted() {
    const s = Math.ceil(this.timeLeft);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return (min > 0 ? min + ':' : '') + (sec < 10 ? '0' : '') + sec;
  }
  getPercent() {
    return this.timeLeft / this.totalTime;
  }
  pause() { this.running = false; }
  resume() { this.running = true; }
  reset() { this.timeLeft = this.totalTime; this.running = true; this.warningSent = false; }
  drawTimer(ctx, x, y, style) {
    const s = style || 'bar';
    const state = this.getState();
    if (s === 'bar') {
      this._drawBar(ctx, x, y, state);
    } else if (s === 'circle') {
      this._drawCircle(ctx, x, y, state);
    } else {
      this._drawText(ctx, x, y, state);
    }
  }
  _drawBar(ctx, x, y, state) {
    const w = 200, h = 16;
    const pct = this.getPercent();
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, w, h);
    // Fill
    let color = '#00ff88';
    if (state === 'warning') color = '#ffaa00';
    if (state === 'critical') {
      color = '#ff4444';
      if (Math.sin(this.pulsePhase) > 0) color = '#ff0000';
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * pct, h);
    // Border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    // Time text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(this.getTimeFormatted(), x + w/2, y + h - 3);
    // Bonus flash
    if (this.bonusFlash > 0) {
      ctx.globalAlpha = this.bonusFlash * 0.5;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }
  _drawCircle(ctx, x, y, state) {
    const r = 30;
    const pct = this.getPercent();
    let color = '#00ff88';
    if (state === 'warning') color = '#ffaa00';
    if (state === 'critical') color = '#ff4444';
    // Background circle
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Progress arc
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * pct);
    ctx.stroke();
    // Text
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(this.getTimeFormatted(), x, y + 5);
  }
  _drawText(ctx, x, y, state) {
    let color = '#00ff88';
    if (state === 'warning') color = '#ffaa00';
    if (state === 'critical') {
      color = Math.sin(this.pulsePhase) > 0 ? '#ff4444' : '#ff0000';
    }
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(this.getTimeFormatted(), x, y);
  }
  drawScreenWarning(ctx, W, H) {
    const state = this.getState();
    if (state === 'critical') {
      const pulse = (Math.sin(this.pulsePhase) + 1) / 2;
      ctx.globalAlpha = pulse * 0.1;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      // Border flash
      ctx.strokeStyle = 'rgba(255,0,0,' + (pulse * 0.5) + ')';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, W - 4, H - 4);
    } else if (state === 'warning') {
      ctx.strokeStyle = 'rgba(255,170,0,0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
    }
  }
  drawBonusPopup(ctx, W, H) {
    if (this.bonusFlash > 0) {
      ctx.globalAlpha = this.bonusFlash;
      ctx.fillStyle = this.flashColor;
      ctx.font = 'bold 28px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(this.flashColor === '#00ff88' ? '+TIME!' : '-TIME!', W/2, H/2 - 40);
      ctx.globalAlpha = 1;
    }
  }
}
`,
  scaffold: null,
  tierCode: {
    3: `
// === Time bonus spawner ===
class TimeBonusSpawner {
  constructor(W, H) {
    this.W = W; this.H = H; this.bonuses = [];
    this.spawnTimer = 0; this.spawnInterval = 8;
  }
  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval + Math.random() * 4;
      this.bonuses.push({
        x: Math.random() * (this.W - 30) + 15,
        y: Math.random() * (this.H - 100) + 50,
        value: Math.random() < 0.8 ? 5 : 10,
        life: 5, maxLife: 5, size: 18
      });
    }
    for (let i = this.bonuses.length - 1; i >= 0; i--) {
      this.bonuses[i].life -= dt;
      if (this.bonuses[i].life <= 0) this.bonuses.splice(i, 1);
    }
  }
  checkCollect(entity) {
    for (let i = this.bonuses.length - 1; i >= 0; i--) {
      const b = this.bonuses[i];
      if (entity.x + entity.w > b.x - b.size && entity.x < b.x + b.size &&
          entity.y + entity.h > b.y - b.size && entity.y < b.y + b.size) {
        this.bonuses.splice(i, 1);
        return b.value;
      }
    }
    return 0;
  }
  draw(ctx, time) {
    for (const b of this.bonuses) {
      const alpha = b.life / b.maxLife;
      const pulse = Math.sin((time || 0) * 5) * 0.2 + 0.8;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold ' + Math.floor(b.size * pulse) + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('+' + b.value, b.x, b.y);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y - 5, b.size * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
`,
    5: `
// === Multi-phase timer ===
class PhaseTimer {
  constructor(phases) {
    // phases: array of { name, duration, speedMult, color }
    this.phases = phases || [
      { name: 'WARM UP', duration: 15, speedMult: 0.8, color: '#00ff88' },
      { name: 'NORMAL', duration: 25, speedMult: 1, color: '#ffffff' },
      { name: 'RUSH', duration: 15, speedMult: 1.5, color: '#ffaa00' },
      { name: 'FINAL', duration: 5, speedMult: 2, color: '#ff4444' },
    ];
    this.currentPhase = 0;
    this.phaseTimer = 0;
    this.totalElapsed = 0;
    this.onPhaseChange = null;
  }
  update(dt) {
    if (this.currentPhase >= this.phases.length) return;
    this.phaseTimer += dt;
    this.totalElapsed += dt;
    const phase = this.phases[this.currentPhase];
    if (this.phaseTimer >= phase.duration) {
      this.phaseTimer = 0;
      this.currentPhase++;
      if (this.onPhaseChange && this.currentPhase < this.phases.length) {
        this.onPhaseChange(this.phases[this.currentPhase]);
      }
    }
  }
  getCurrentPhase() {
    if (this.currentPhase >= this.phases.length) return null;
    return this.phases[this.currentPhase];
  }
  isFinished() { return this.currentPhase >= this.phases.length; }
  getSpeedMultiplier() {
    const phase = this.getCurrentPhase();
    return phase ? phase.speedMult : 1;
  }
  draw(ctx, x, y) {
    const phase = this.getCurrentPhase();
    if (!phase) return;
    ctx.fillStyle = phase.color;
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(phase.name + ' - ' + Math.ceil(phase.duration - this.phaseTimer) + 's', x, y);
  }
}
`
  },
  aiContext: 'CountdownTimer manages a game countdown with warning/critical states. update(dt) decreases time. addTime(seconds) for time bonuses. getState() returns normal/warning/critical/expired. drawTimer supports bar, circle, and text styles. drawScreenWarning adds red flash in critical state. drawBonusPopup shows "+TIME!" effects.',
  provides: ['CountdownTimer'],
  requires: [],
  conflicts: [],
  dependencies: []
};
