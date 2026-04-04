import * as THREE from 'three';
import { PinballEngine } from './pinball-engine.js';

export class PinballTable {
  constructor(position) {
    this.state = 'empty'; // empty | generating | ready | playing | occupied_npc
    this.npcOccupant = null;
    this.config = null;
    this.engine = null;
    this.gameTitle = '';
    this.highScore = 0;
    this.highlighted = false;
    this._savedMaterials = null;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    this._previewMeshes = [];
    this._buildPreviewModel();
  }

  _buildPreviewModel() {
    // Table body — dark wood, pinball machine shape
    // Sits at y=0, table top surface at about y=0.9
    const legMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 });
    const surfaceMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xaaddee, transparent: true, opacity: 0.12, roughness: 0.1
    });

    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const legPositions = [
      [-0.3, 0.35, -0.6], [0.3, 0.35, -0.6],
      [-0.3, 0.35, 0.6], [0.3, 0.35, 0.6]
    ];
    for (const lp of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(...lp);
      this.group.add(leg);
      this._previewMeshes.push(leg);
    }

    // Table body (cabinet)
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.15, 1.4);
    const body = new THREE.Mesh(bodyGeo, woodMat);
    body.position.set(0, 0.77, 0);
    body.castShadow = true;
    this.group.add(body);
    this._previewMeshes.push(body);

    // Side rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
    const railGeoSide = new THREE.BoxGeometry(0.03, 0.08, 1.4);
    const railL = new THREE.Mesh(railGeoSide, railMat);
    railL.position.set(-0.35, 0.89, 0);
    this.group.add(railL);
    this._previewMeshes.push(railL);
    const railR = new THREE.Mesh(railGeoSide, railMat);
    railR.position.set(0.35, 0.89, 0);
    this.group.add(railR);
    this._previewMeshes.push(railR);
    const railGeoBack = new THREE.BoxGeometry(0.7, 0.08, 0.03);
    const railBack = new THREE.Mesh(railGeoBack, railMat);
    railBack.position.set(0, 0.89, -0.7);
    this.group.add(railBack);
    this._previewMeshes.push(railBack);

    // Playfield surface (green felt)
    const surfaceGeo = new THREE.PlaneGeometry(0.66, 1.36);
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(0, 0.85, 0);
    this.group.add(surface);
    this._previewMeshes.push(surface);

    // Glass top
    const glassGeo = new THREE.PlaneGeometry(0.66, 1.36);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.rotation.x = -Math.PI / 2;
    glass.position.set(0, 0.93, 0);
    this.group.add(glass);
    this._previewMeshes.push(glass);

    // Backbox (sign area on back of pinball)
    const backboxGeo = new THREE.BoxGeometry(0.6, 0.4, 0.08);
    const backboxMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 });
    const backbox = new THREE.Mesh(backboxGeo, backboxMat);
    backbox.position.set(0, 1.15, -0.68);
    this.group.add(backbox);
    this._previewMeshes.push(backbox);

    // "PINBALL" label on backbox
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 128;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PINBALL', 128, 64);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelGeo = new THREE.PlaneGeometry(0.5, 0.25);
    this._labelCanvas = labelCanvas;
    this._labelCtx = ctx;
    this._labelTex = labelTex;
    const labelMesh = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({
      map: labelTex, emissive: 0xffffff, emissiveMap: labelTex, emissiveIntensity: 0.3
    }));
    labelMesh.position.set(0, 1.15, -0.64);
    this.group.add(labelMesh);
    this._previewMeshes.push(labelMesh);
    this._labelMesh = labelMesh;

    // Scale up to real-world pinball size (about 2x)
    this.group.scale.set(2, 2, 2);
    // Tilt the whole table slightly (front higher than back, like real pinball)
    this.group.rotation.x = -0.05;
  }

  buildFromConfig(config) {
    this.config = config;
    this.gameTitle = config.tableName || 'PINBALL';
    this.state = 'ready';
    // Update backbox label with table name
    this._updateLabel(this.gameTitle);
  }

  _updateLabel(text) {
    const ctx = this._labelCtx;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    this._labelTex.needsUpdate = true;
  }

  startGame(onScore, onGameOver) {
    if (!this.config) return;
    this.state = 'playing';

    // Hide preview meshes
    for (const m of this._previewMeshes) m.visible = false;

    // Create engine
    this.engine = new PinballEngine(this.group, this.config);
    this.engine.onScore = (pts) => { if (onScore) onScore(pts); };
    this.engine.onGameOver = (score) => {
      this.stopGame();
      if (onGameOver) onGameOver(score);
    };
  }

  stopGame() {
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
    this.state = this.config ? 'ready' : 'empty';
    // Show preview meshes again
    for (const m of this._previewMeshes) m.visible = true;
  }

  update(dt) {
    if (this.engine) this.engine.update(dt);
    // Generating animation on backbox
    if (this.state === 'generating') {
      const dots = '.'.repeat(Math.floor(Date.now() / 400) % 4);
      const ctx = this._labelCtx;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#4fc3f7';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GENERATING' + dots, 128, 50);
      ctx.fillStyle = '#888';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('AI builds your table', 128, 85);
      this._labelTex.needsUpdate = true;
    }
  }

  handleInput(key, isDown) {
    if (this.engine) this.engine.handleInput(key, isDown);
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

  dispose() {
    this.stopGame();
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
}
