import * as THREE from 'three';

// Cabinet side panel colors — each machine gets a unique color
const CABINET_COLORS = [
  0x2980b9, // blue
  0xc0392b, // red
  0x27ae60, // green
  0x8e44ad, // purple
  0xe67e22, // orange
  0xf1c40f, // yellow
];

export class ArcadeMachine {
  constructor(index, position, rotation = 0) {
    this.index = index;
    this.state = 'empty'; // empty | generating | ready | playing | occupied_npc
    this.gameCode = null;
    this.gameTitle = '';
    this.group = new THREE.Group();
    this.highScore = 0;
    this.npcOccupant = null; // NPC currently playing

    // Screen canvas for CanvasTexture
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 800;
    this.screenCanvas.height = 600;
    this.screenCtx = this.screenCanvas.getContext('2d');
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.minFilter = THREE.LinearFilter;

    this.cabinetColor = CABINET_COLORS[index % CABINET_COLORS.length];
    this.highlighted = false;
    this._allMaterials = []; // collected during build for highlight
    this._buildMesh();

    this.group.position.copy(position);
    this.group.rotation.y = rotation;

    this._drawEmptyScreen();
  }

  _buildMesh() {
    // === MAIN CABINET BODY (black) ===
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.6,
      metalness: 0.1,
    });

    // Lower body (wider base)
    const lowerGeo = new THREE.BoxGeometry(1.2, 1.0, 0.8);
    const lower = new THREE.Mesh(lowerGeo, bodyMat);
    lower.position.y = 0.5;
    lower.castShadow = true;
    this.group.add(lower);

    // Upper body (angled back slightly)
    const upperGeo = new THREE.BoxGeometry(1.2, 1.2, 0.7);
    const upper = new THREE.Mesh(upperGeo, bodyMat);
    upper.position.set(0, 1.6, -0.05);
    upper.castShadow = true;
    this.group.add(upper);

    // === SIDE ART PANELS (colored, glowing) ===
    const sideMat = new THREE.MeshStandardMaterial({
      color: this.cabinetColor,
      emissive: this.cabinetColor,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.1,
    });
    // Left side panel
    const sidePanelGeo = new THREE.PlaneGeometry(0.6, 1.8);
    const leftPanel = new THREE.Mesh(sidePanelGeo, sideMat);
    leftPanel.position.set(-0.61, 1.1, 0.0);
    leftPanel.rotation.y = -Math.PI / 2;
    this.group.add(leftPanel);
    // Right side panel
    const rightPanel = new THREE.Mesh(sidePanelGeo, sideMat);
    rightPanel.position.set(0.61, 1.1, 0.0);
    rightPanel.rotation.y = Math.PI / 2;
    this.group.add(rightPanel);

    // === MARQUEE HEADER (top sign) ===
    const marqueeGeo = new THREE.BoxGeometry(1.2, 0.35, 0.15);
    const marqueeMat = new THREE.MeshStandardMaterial({
      color: this.cabinetColor,
      roughness: 0.4,
      metalness: 0.1,
    });
    const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
    marquee.position.set(0, 2.37, 0.22);
    this.group.add(marquee);

    // Marquee light strip (warm white backlight)
    const marqueeLightGeo = new THREE.BoxGeometry(1.0, 0.02, 0.02);
    const marqueeLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff5e0,
      emissiveIntensity: 1.5,
    });
    const marqueeLight = new THREE.Mesh(marqueeLightGeo, marqueeLightMat);
    marqueeLight.position.set(0, 2.2, 0.3);
    this.group.add(marqueeLight);

    // === SCREEN (CRT bezel) ===
    // Bezel (dark frame around screen)
    const bezelGeo = new THREE.BoxGeometry(1.1, 0.85, 0.04);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.7,
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 1.6, 0.33);
    this.group.add(bezel);

    // Screen — CRT with switchable glow
    const screenGeo = new THREE.PlaneGeometry(0.95, 0.7);
    this.screenMat = new THREE.MeshStandardMaterial({
      map: this.screenTexture,
      emissive: 0xffffff,
      emissiveMap: this.screenTexture,
      emissiveIntensity: 1.5, // strong glow for iso view (CRT feel)
    });
    this.screenMesh = new THREE.Mesh(screenGeo, this.screenMat);
    this.screenMesh.position.set(0, 1.6, 0.36);
    this.screenMesh.userData = { machine: this };
    this.group.add(this.screenMesh);

    // === CONTROL PANEL (angled) ===
    const panelGeo = new THREE.BoxGeometry(1.0, 0.12, 0.55);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.6,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 1.0, 0.3);
    panel.rotation.x = -0.25;
    this.group.add(panel);

    // Panel edge trim (glowing accent)
    const trimGeo = new THREE.BoxGeometry(1.02, 0.02, 0.02);
    const trimMat = new THREE.MeshStandardMaterial({
      color: this.cabinetColor,
      emissive: this.cabinetColor,
      emissiveIntensity: 1.0,
    });
    const trimFront = new THREE.Mesh(trimGeo, trimMat);
    trimFront.position.set(0, 0.97, 0.56);
    this.group.add(trimFront);

    // === JOYSTICK (black stick, glowing red ball) ===
    const stickGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.14);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.3 });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.set(-0.28, 1.12, 0.25);
    this.group.add(stick);
    // Joystick base ring
    const jBaseGeo = new THREE.TorusGeometry(0.04, 0.008, 8, 16);
    const jBaseMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
    const jBase = new THREE.Mesh(jBaseGeo, jBaseMat);
    jBase.position.set(-0.28, 1.06, 0.25);
    jBase.rotation.x = Math.PI / 2;
    this.group.add(jBase);
    // Ball top (glowing red)
    const ballGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5, roughness: 0.3,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(-0.28, 1.2, 0.25);
    this.group.add(ball);

    // === BUTTONS (6 buttons, 2 rows, glowing) ===
    const btnGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
    const btnColors = [0xff0000, 0x0088ff, 0xffff00, 0x00ff00, 0xff00ff, 0x00ffff];
    const btnPositions = [
      // Top row (3 buttons)
      [0.0, 1.10, 0.22], [0.12, 1.10, 0.20], [0.24, 1.10, 0.22],
      // Bottom row (3 buttons, slightly offset)
      [0.0, 1.06, 0.30], [0.12, 1.06, 0.28], [0.24, 1.06, 0.30],
    ];
    for (let i = 0; i < 6; i++) {
      const btnMat = new THREE.MeshStandardMaterial({
        color: btnColors[i],
        emissive: btnColors[i],
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.1,
      });
      const btn = new THREE.Mesh(btnGeo, btnMat);
      btn.position.set(btnPositions[i][0], btnPositions[i][1], btnPositions[i][2]);
      this.group.add(btn);
    }

    // === COIN SLOT AREA ===
    const coinPlateMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.5, roughness: 0.3 });
    const coinPlate = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.04), coinPlateMat);
    coinPlate.position.set(0, 0.6, 0.4);
    this.group.add(coinPlate);
    // Coin slot hole
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.01), slotMat);
    slot.position.set(0, 0.6, 0.42);
    this.group.add(slot);

    // Coin insert glow
    const coinGlowGeo = new THREE.BoxGeometry(0.18, 0.04, 0.01);
    const coinGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.0,
    });
    const coinGlow = new THREE.Mesh(coinGlowGeo, coinGlowMat);
    coinGlow.position.set(0, 0.52, 0.42);
    this.group.add(coinGlow);

    // === FEET / LEVELERS ===
    const footMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const footGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8);
    const footPositions = [[-0.45, 0.02, 0.3], [0.45, 0.02, 0.3], [-0.45, 0.02, -0.3], [0.45, 0.02, -0.3]];
    for (const fp of footPositions) {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(...fp);
      this.group.add(foot);
    }
  }

  _drawEmptyScreen() {
    const ctx = this.screenCtx;
    // Dark CRT background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 800, 600);

    // Scanline effect
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < 600; y += 3) {
      ctx.fillRect(0, y, 800, 1);
    }

    ctx.fillStyle = '#555';
    ctx.font = '42px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMPTY SLOT', 400, 270);

    ctx.fillStyle = '#777';
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText('Click to create a game', 400, 330);

    // CRT vignette
    this._drawVignette(ctx);
    this.screenTexture.needsUpdate = true;
  }

  drawGenerating() {
    this.state = 'generating';
    this._animateLoading();
  }

  _animateLoading() {
    if (this.state !== 'generating') return;

    const ctx = this.screenCtx;
    const t = Date.now() / 1000;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 800, 600);

    // Scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < 600; y += 3) {
      ctx.fillRect(0, y, 800, 1);
    }

    // Animated dots
    const dots = '.'.repeat(Math.floor(t % 4));
    ctx.fillStyle = '#4fc3f7';
    ctx.font = '32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`GENERATING${dots}`, 400, 260);

    // Progress bar
    const barWidth = 300;
    const progress = (Math.sin(t * 2) + 1) / 2;
    ctx.fillStyle = '#333';
    ctx.fillRect(250, 310, barWidth, 20);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(250, 310, barWidth * progress, 20);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(250, 310, barWidth, 20);

    ctx.fillStyle = '#888';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('AI is coding your game...', 400, 380);

    this._drawVignette(ctx);
    this.screenTexture.needsUpdate = true;
    requestAnimationFrame(() => this._animateLoading());
  }

  drawReady() {
    this.state = 'ready';
    const ctx = this.screenCtx;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 800, 600);

    // Scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < 600; y += 3) {
      ctx.fillRect(0, y, 800, 1);
    }

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.gameTitle || 'MINI GAME', 400, 200);

    // Separator line
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 230);
    ctx.lineTo(600, 230);
    ctx.stroke();

    // Play prompt
    ctx.fillStyle = '#4caf50';
    ctx.font = '26px Arial, sans-serif';
    ctx.fillText('PRESS TO PLAY', 400, 340);

    // Blinking arrow
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillText('\u25B6', 400, 380);
    }

    // High score
    if (this.highScore > 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(`HIGH SCORE: ${this.highScore}`, 400, 450);
    }

    // Credits
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('INSERT COIN', 400, 550);

    this._drawVignette(ctx);
    this.screenTexture.needsUpdate = true;
  }

  _drawVignette(ctx) {
    // CRT-style vignette (darker corners)
    const gradient = ctx.createRadialGradient(400, 300, 150, 400, 300, 450);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
  }

  setGame(gameCode, title, description) {
    this.gameCode = gameCode;
    this.gameTitle = title;
    this.drawReady();
  }

  // Iso view: strong CRT glow for atmosphere
  setCrtMode() {
    if (this.screenMat) {
      this.screenMat.emissive.setHex(0xffffff);
      this.screenMat.emissiveIntensity = 1.5;
    }
  }

  // Zoomed view: clear screen, no glow washout
  setClearMode() {
    if (this.screenMat) {
      this.screenMat.emissive.setHex(0x000000);
      this.screenMat.emissiveIntensity = 0;
    }
  }

  drawBroken() {
    this.state = 'broken';
    const ctx = this.screenCtx;
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(0, 0, 800, 600);

    // Static noise
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 800;
      const y = Math.random() * 600;
      const c = Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${c},${c},${c})`;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ OUT OF ORDER', 400, 260);
    ctx.fillStyle = '#888';
    ctx.font = '18px Courier New';
    ctx.fillText('This game is broken', 400, 310);
    ctx.fillText('Click NEW GAME to replace', 400, 340);
    this.screenTexture.needsUpdate = true;
  }

  updateScreenTexture() {
    this.screenTexture.needsUpdate = true;
  }

  highlight() {
    if (this.highlighted) return;
    this.highlighted = true;
    this._savedMaterials = new Map();
    this.group.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        const mat = child.material;
        if (!this._savedMaterials.has(mat)) {
          this._savedMaterials.set(mat, {
            emissive: mat.emissive.getHex(),
            emissiveIntensity: mat.emissiveIntensity,
          });
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = 0.18;
        }
      }
    });
    this.group.position.y += 0.08;
  }

  unhighlight() {
    if (!this.highlighted) return;
    this.highlighted = false;
    if (this._savedMaterials) {
      for (const [mat, orig] of this._savedMaterials) {
        mat.emissive.setHex(orig.emissive);
        mat.emissiveIntensity = orig.emissiveIntensity;
      }
      this._savedMaterials = null;
    }
    this.group.position.y -= 0.08;
  }
}
