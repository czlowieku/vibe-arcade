import * as THREE from 'three';
import { ArcadeMachine } from './machine.js';
import { placeModel } from './asset-loader.js';

const M = 'assets/models/';
const K = 'assets/models/kenney/';

export class ArcadeRoom {
  constructor(scene) {
    this.scene = scene;
    this.machines = [];
    this._buildRoom();
    this._addDecorations();
    this._placeMachines();
    this._placeModels();
    this._addScreenGlows();
  }

  _buildRoom() {
    // === FLOOR — classic arcade carpet ===
    const carpetCanvas = document.createElement('canvas');
    carpetCanvas.width = 512;
    carpetCanvas.height = 512;
    const cCtx = carpetCanvas.getContext('2d');
    // Dark base
    cCtx.fillStyle = '#1a1a2e';
    cCtx.fillRect(0, 0, 512, 512);
    // Classic arcade carpet pattern — geometric shapes
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e67e22'];
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = 4 + Math.random() * 12;
      cCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      const shape = Math.floor(Math.random() * 4);
      cCtx.save();
      cCtx.translate(x, y);
      cCtx.rotate(Math.random() * Math.PI * 2);
      if (shape === 0) {
        // Diamond
        cCtx.beginPath();
        cCtx.moveTo(0, -size);
        cCtx.lineTo(size * 0.6, 0);
        cCtx.lineTo(0, size);
        cCtx.lineTo(-size * 0.6, 0);
        cCtx.closePath();
        cCtx.fill();
      } else if (shape === 1) {
        // Triangle
        cCtx.beginPath();
        cCtx.moveTo(0, -size);
        cCtx.lineTo(size, size);
        cCtx.lineTo(-size, size);
        cCtx.closePath();
        cCtx.fill();
      } else if (shape === 2) {
        // Small circle
        cCtx.beginPath();
        cCtx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        cCtx.fill();
      } else {
        // Zigzag line
        cCtx.strokeStyle = cCtx.fillStyle;
        cCtx.lineWidth = 2;
        cCtx.beginPath();
        cCtx.moveTo(-size, -size * 0.5);
        cCtx.lineTo(-size * 0.3, size * 0.5);
        cCtx.lineTo(size * 0.3, -size * 0.5);
        cCtx.lineTo(size, size * 0.5);
        cCtx.stroke();
      }
      cCtx.restore();
    }
    // Add some star/sparkle patterns
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      cCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      cCtx.globalAlpha = 0.6;
      this._drawStar(cCtx, x, y, 3 + Math.random() * 5, 5);
      cCtx.globalAlpha = 1;
    }

    const carpetTexture = new THREE.CanvasTexture(carpetCanvas);
    carpetTexture.wrapS = THREE.RepeatWrapping;
    carpetTexture.wrapT = THREE.RepeatWrapping;
    carpetTexture.repeat.set(3, 3);

    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      map: carpetTexture,
      roughness: 0.9,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // === WALLS — cream/beige ===
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x8a8070,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
    backWall.position.set(0, 3, -8);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
    leftWall.position.set(-8, 3, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
    rightWall.position.set(8, 3, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // === BASEBOARDS — dark wood trim ===
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });
    const bbGeo = new THREE.BoxGeometry(16, 0.2, 0.08);
    // Back
    const bbBack = new THREE.Mesh(bbGeo, baseboardMat);
    bbBack.position.set(0, 0.1, -7.96);
    this.scene.add(bbBack);
    // Left
    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 16), baseboardMat);
    bbLeft.position.set(-7.96, 0.1, 0);
    this.scene.add(bbLeft);
    // Right
    const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 16), baseboardMat);
    bbRight.position.set(7.96, 0.1, 0);
    this.scene.add(bbRight);

    // === LIGHTING — bright arcade with warm tones ===
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.9);
    this.scene.add(ambient);

    // Grid of overhead lights — 3x3 coverage
    const overheadPositions = [
      [-4, 5.5, -5], [0, 5.5, -5], [4, 5.5, -5],
      [-4, 5.5, 0],  [0, 5.5, 0],  [4, 5.5, 0],
      [-4, 5.5, 5],  [0, 5.5, 5],  [4, 5.5, 5],
    ];
    for (const pos of overheadPositions) {
      const light = new THREE.PointLight(0xfff8e8, 0.8, 14);
      light.position.set(...pos);
      this.scene.add(light);
    }

    // Two strong directional fills from different angles
    const fillLight1 = new THREE.DirectionalLight(0xfffbe8, 0.6);
    fillLight1.position.set(5, 8, 10);
    this.scene.add(fillLight1);
    const fillLight2 = new THREE.DirectionalLight(0xfff5e0, 0.4);
    fillLight2.position.set(-5, 8, -5);
    this.scene.add(fillLight2);

    // Hemisphere light — sky/ground fill
    const hemiLight = new THREE.HemisphereLight(0xfff8e8, 0x444422, 0.3);
    this.scene.add(hemiLight);

    // === FRONT WALL with door opening ===
    // Left section of front wall (x: -8 to -1.5)
    const fwLeft = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6), wallMat);
    fwLeft.position.set(-4.75, 3, 8);
    fwLeft.rotation.y = Math.PI;
    this.scene.add(fwLeft);

    // Right section of front wall (x: 1.5 to 8)
    const fwRight = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6), wallMat);
    fwRight.position.set(4.75, 3, 8);
    fwRight.rotation.y = Math.PI;
    this.scene.add(fwRight);

    // Above door section (x: -1.5 to 1.5, y: 2.5 to 6)
    const fwAbove = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.5), wallMat);
    fwAbove.position.set(0, 4.25, 8);
    fwAbove.rotation.y = Math.PI;
    this.scene.add(fwAbove);

    // Door frame (dark wood)
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
    const dfLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.15), doorFrameMat);
    dfLeft.position.set(-1.5, 1.25, 8);
    this.scene.add(dfLeft);
    const dfRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.15), doorFrameMat);
    dfRight.position.set(1.5, 1.25, 8);
    this.scene.add(dfRight);
    const dfTop = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 0.15), doorFrameMat);
    dfTop.position.set(0, 2.55, 8);
    this.scene.add(dfTop);

    // Glass door panels (semi-transparent)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88ccee, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.3,
    });
    const doorL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), glassMat);
    doorL.position.set(-0.75, 1.25, 8);
    doorL.rotation.y = Math.PI;
    this.scene.add(doorL);
    const doorR = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), glassMat);
    doorR.position.set(0.75, 1.25, 8);
    doorR.rotation.y = Math.PI;
    this.scene.add(doorR);

    // Window vitrines on front wall
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x99ccdd, transparent: true, opacity: 0.2, roughness: 0.1, metalness: 0.2,
    });
    const winL = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.5), windowMat);
    winL.position.set(-5, 2.5, 7.99);
    winL.rotation.y = Math.PI;
    this.scene.add(winL);
    const winR = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.5), windowMat);
    winR.position.set(5, 2.5, 7.99);
    winR.rotation.y = Math.PI;
    this.scene.add(winR);

    // "OPEN" sign above door
    const openCanvas = document.createElement('canvas');
    openCanvas.width = 128;
    openCanvas.height = 48;
    const oCtx = openCanvas.getContext('2d');
    oCtx.fillStyle = '#27ae60';
    oCtx.fillRect(0, 0, 128, 48);
    oCtx.fillStyle = '#fff';
    oCtx.font = 'bold 28px Arial';
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    oCtx.fillText('OPEN', 64, 24);
    const openTexture = new THREE.CanvasTexture(openCanvas);
    const openSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.22),
      new THREE.MeshStandardMaterial({ map: openTexture, emissive: 0xffffff, emissiveMap: openTexture, emissiveIntensity: 0.4 })
    );
    openSign.position.set(0, 2.75, 8.01);
    openSign.rotation.y = Math.PI;
    this.scene.add(openSign);

    // Entrance light above door
    const entranceLight = new THREE.PointLight(0xfff5e0, 0.8, 8);
    entranceLight.position.set(0, 3.5, 8.5);
    this.scene.add(entranceLight);

    // Front baseboards
    const bbFrontL = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 0.08), baseboardMat);
    bbFrontL.position.set(-4.75, 0.1, 7.96);
    this.scene.add(bbFrontL);
    const bbFrontR = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 0.08), baseboardMat);
    bbFrontR.position.set(4.75, 0.1, 7.96);
    this.scene.add(bbFrontR);
  }

  _drawStar(ctx, cx, cy, radius, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.4;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  _addFluorescentLight(x, y, z, length) {
    // Housing (metal box)
    const housingGeo = new THREE.BoxGeometry(length, 0.08, 0.4);
    const housingMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.5, roughness: 0.3 });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(x, y, z);
    this.scene.add(housing);

    // Light tube (glowing)
    const tubeGeo = new THREE.BoxGeometry(length - 0.3, 0.04, 0.12);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff8e0,
      emissiveIntensity: 1.2,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.position.set(x, y - 0.05, z);
    this.scene.add(tube);
  }

  _addDecorations() {
    // === "ARCADE" SIGN on back wall ===
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    // Red background with rounded corners
    sCtx.fillStyle = '#c0392b';
    sCtx.beginPath();
    sCtx.roundRect(4, 4, 504, 120, 12);
    sCtx.fill();
    // Border
    sCtx.strokeStyle = '#fff';
    sCtx.lineWidth = 4;
    sCtx.beginPath();
    sCtx.roundRect(8, 8, 496, 112, 10);
    sCtx.stroke();
    // Text
    sCtx.fillStyle = '#fff';
    sCtx.font = 'bold 72px Impact, Arial Black, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('ARCADE', 256, 68);
    // Yellow dot accents
    sCtx.fillStyle = '#f1c40f';
    sCtx.beginPath(); sCtx.arc(40, 64, 8, 0, Math.PI * 2); sCtx.fill();
    sCtx.beginPath(); sCtx.arc(472, 64, 8, 0, Math.PI * 2); sCtx.fill();

    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.PlaneGeometry(4, 1);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTexture,
      emissive: 0xffffff,
      emissiveMap: signTexture,
      emissiveIntensity: 0.3,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 5.0, -7.95);
    this.scene.add(sign);
    this._arcadeSign = sign;
    this._arcadeSignMat = signMat;

    // === POSTER FRAMES on walls ===
    this._addPoster(-6, 3.8, -7.94, 0, '#e74c3c', 'PLAY!');
    this._addPoster(6, 3.8, -7.94, 0, '#3498db', 'HIGH\nSCORE');
    this._addPoster(-7.94, 3.8, -5, Math.PI / 2, '#2ecc71', 'INSERT\nCOIN');
    this._addPoster(7.94, 3.8, -5, -Math.PI / 2, '#f39c12', 'GAME\nON!');

    // === COUNTER / RECEPTION DESK near entrance ===
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 });
    // Main counter body
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 1), counterMat);
    counterBody.position.set(5.5, 0.55, 6);
    counterBody.castShadow = true;
    this.scene.add(counterBody);
    // Counter top (slightly lighter)
    const counterTopMat = new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.4 });
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.2), counterTopMat);
    counterTop.position.set(5.5, 1.14, 6);
    this.scene.add(counterTop);

    // === CASH REGISTER on counter ===
    const regMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
    const register = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), regMat);
    register.position.set(5.5, 1.35, 6);
    this.scene.add(register);
    // Register screen
    const regScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x88cc88, emissive: 0x88cc88, emissiveIntensity: 0.3 })
    );
    regScreen.position.set(5.5, 1.45, 5.8);
    regScreen.rotation.x = -0.3;
    this.scene.add(regScreen);

    // === GUMBALL MACHINE ===
    // === TRASH CAN ===
    const trashMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
    const trashCan = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.7, 12), trashMat);
    trashCan.position.set(7, 0.35, 5);
    this.scene.add(trashCan);
    // Trash rim
    const trashRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.03, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x555555 })
    );
    trashRim.position.set(7, 0.7, 5);
    trashRim.rotation.x = Math.PI / 2;
    this.scene.add(trashRim);

    // === STOOLS near some machines ===
    this._addStool(-3.5, -4.5);
    this._addStool(0, -4.5);
    this._addStool(3.5, -4.5);


    // === FLOOR MAT at entrance ===
    const matGeo = new THREE.PlaneGeometry(3, 1.5);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 1.0 });
    const floorMat = new THREE.Mesh(matGeo, matMat);
    floorMat.rotation.x = -Math.PI / 2;
    floorMat.position.set(0, 0.005, 7.5);
    this.scene.add(floorMat);

    // === NEON LED STRIPS along baseboards ===
    const neonColors = [0xff00ff, 0x00fff5, 0xff00ff, 0x00fff5];
    const neonPositions = [
      // Back wall
      { start: [-7.5, 0.22, -7.95], end: [7.5, 0.22, -7.95] },
      // Left wall
      { start: [-7.95, 0.22, -7.5], end: [-7.95, 0.22, 7.5] },
      // Right wall
      { start: [7.95, 0.22, -7.5], end: [7.95, 0.22, 7.5] },
    ];
    neonPositions.forEach((strip, i) => {
      const dx = strip.end[0] - strip.start[0];
      const dz = strip.end[2] - strip.start[2];
      const length = Math.sqrt(dx * dx + dz * dz);
      const cx = (strip.start[0] + strip.end[0]) / 2;
      const cz = (strip.start[2] + strip.end[2]) / 2;
      const angle = Math.atan2(dx, dz);

      const stripGeo = new THREE.BoxGeometry(0.08, 0.04, length);
      const stripMat = new THREE.MeshStandardMaterial({
        color: neonColors[i % neonColors.length],
        emissive: neonColors[i % neonColors.length],
        emissiveIntensity: 2.0,
      });
      const neonStrip = new THREE.Mesh(stripGeo, stripMat);
      neonStrip.position.set(cx, strip.start[1], cz);
      neonStrip.rotation.y = angle;
      this.scene.add(neonStrip);

      // Colored point light from each strip
      const neonLight = new THREE.PointLight(neonColors[i % neonColors.length], 0.3, 6);
      neonLight.position.set(cx, 0.5, cz);
      this.scene.add(neonLight);
    });

    // === HIGH SCORES board ===
    const hsCanvas = document.createElement('canvas');
    hsCanvas.width = 256;
    hsCanvas.height = 384;
    const hsCtx = hsCanvas.getContext('2d');
    hsCtx.fillStyle = '#111';
    hsCtx.fillRect(0, 0, 256, 384);
    hsCtx.strokeStyle = '#f1c40f';
    hsCtx.lineWidth = 3;
    hsCtx.strokeRect(4, 4, 248, 376);
    hsCtx.fillStyle = '#f1c40f';
    hsCtx.font = 'bold 24px Courier New';
    hsCtx.textAlign = 'center';
    hsCtx.fillText('HIGH SCORES', 128, 36);
    hsCtx.strokeStyle = '#f1c40f';
    hsCtx.beginPath(); hsCtx.moveTo(20, 48); hsCtx.lineTo(236, 48); hsCtx.stroke();

    const fakeScores = [
      ['AAA', '999,999'], ['BOB', '888,420'], ['ACE', '777,777'],
      ['ZIP', '654,321'], ['MAX', '500,000'], ['PRO', '420,069'],
      ['NPC', '333,333'], ['???', '123,456'], ['LOL', '100,000'],
      ['NEW', '050,000'],
    ];
    hsCtx.font = '16px Courier New';
    fakeScores.forEach((entry, i) => {
      const y = 72 + i * 30;
      hsCtx.fillStyle = i === 0 ? '#f1c40f' : i < 3 ? '#e67e22' : '#888';
      hsCtx.textAlign = 'left';
      hsCtx.fillText(`${(i + 1).toString().padStart(2, ' ')}.`, 20, y);
      hsCtx.fillText(entry[0], 60, y);
      hsCtx.textAlign = 'right';
      hsCtx.fillText(entry[1], 236, y);
    });

    const hsTexture = new THREE.CanvasTexture(hsCanvas);
    const hsBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.8),
      new THREE.MeshStandardMaterial({ map: hsTexture, emissive: 0xffffff, emissiveMap: hsTexture, emissiveIntensity: 0.2 })
    );
    hsBoard.position.set(7.94, 3.5, -3);
    hsBoard.rotation.y = -Math.PI / 2;
    this.scene.add(hsBoard);

    // More retro posters
    this._addPoster(-7.94, 3.8, 2, Math.PI / 2, '#9b59b6', 'PRESS\nSTART');
    this._addPoster(7.94, 3.8, 2, -Math.PI / 2, '#1abc9c', 'LEVEL\nUP!');
    this._addPoster(-3, 3.8, -7.94, 0, '#e67e22', '1UP');
    this._addPoster(3, 3.8, -7.94, 0, '#27ae60', 'READY?');

    // === FLOOR CABLES from machines ===
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    for (const machine of this.machines) {
      const pos = machine.group.position;
      // Cable running from machine to nearest wall
      const cableLength = 8 - Math.abs(pos.z);
      if (cableLength > 1) {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, cableLength, 4),
          cableMat
        );
        cable.position.set(pos.x + 0.3, 0.01, pos.z - cableLength / 2);
        cable.rotation.x = Math.PI / 2;
        this.scene.add(cable);
      }
    }
  }

  _addPoster(x, y, z, rotY, color, text) {
    // Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.06), frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    this.scene.add(frame);

    // Poster canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    // Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 320);
    // Stars/dots pattern
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 320, 2 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    const lineHeight = 56;
    const startY = 160 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, 128, startY + i * lineHeight);
    });

    const posterTexture = new THREE.CanvasTexture(canvas);
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.6),
      new THREE.MeshStandardMaterial({ map: posterTexture })
    );
    // Offset slightly in front of frame
    const offset = 0.04;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    poster.position.set(x + sin * offset, y, z + cos * offset);
    poster.rotation.y = rotY;
    this.scene.add(poster);
  }

  _addGumballMachine(x, z) {
    // Stand (metal tube)
    const standMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 12), standMat);
    stand.position.set(x, 0.4, z);
    this.scene.add(stand);

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.15, 16), standMat);
    base.position.set(x, 0.075, z);
    this.scene.add(base);

    // Globe (red-tinted transparent)
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), globeMat);
    globe.position.set(x, 1.15, z);
    this.scene.add(globe);

    // Lid (metal cap)
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 0.1, 16), standMat);
    lid.position.set(x, 1.5, z);
    this.scene.add(lid);

    // Gumballs inside (small colored spheres)
    const gumColors = [0xff0000, 0x0088ff, 0x00cc00, 0xffff00, 0xff6600, 0xff00ff];
    for (let i = 0; i < 12; i++) {
      const gum = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshStandardMaterial({ color: gumColors[i % gumColors.length] })
      );
      gum.position.set(
        x + (Math.random() - 0.5) * 0.3,
        0.9 + Math.random() * 0.35,
        z + (Math.random() - 0.5) * 0.3
      );
      this.scene.add(gum);
    }
  }

  _addStool(x, z) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
    // Leg
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), metalMat);
    leg.position.set(x, 0.3, z);
    this.scene.add(leg);
    // Base ring
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 16), metalMat);
    baseRing.position.set(x, 0.02, z);
    baseRing.rotation.x = Math.PI / 2;
    this.scene.add(baseRing);
    // Seat (padded, red vinyl)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.7 });
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), seatMat);
    seat.position.set(x, 0.64, z);
    this.scene.add(seat);
  }

  _placeMachines() {
    // 6 machines: wall ones flush, center one stays
    const placements = [
      // Back wall - 3 machines flush
      { pos: new THREE.Vector3(-3.5, 0, -7.4), rot: 0 },
      { pos: new THREE.Vector3(0, 0, -7.4), rot: 0 },
      { pos: new THREE.Vector3(3.5, 0, -7.4), rot: 0 },
      // Left wall - flush
      { pos: new THREE.Vector3(-7.4, 0, -2), rot: Math.PI / 2 },
      // Right wall - flush
      { pos: new THREE.Vector3(7.4, 0, -2), rot: -Math.PI / 2 },
      // Center area - 3 machines in a row
      { pos: new THREE.Vector3(-3.5, 0, -2), rot: 0 },
      { pos: new THREE.Vector3(0, 0, -2), rot: 0 },
      { pos: new THREE.Vector3(3.5, 0, -2), rot: 0 },
    ];

    for (let i = 0; i < placements.length; i++) {
      const { pos, rot } = placements[i];
      const machine = new ArcadeMachine(i, pos, rot);
      this.machines.push(machine);
      this.scene.add(machine.group);
    }
  }

  update(dt) {
    this._animTime = (this._animTime || 0) + dt;
    const t = this._animTime;

    // Pulsing ARCADE sign
    if (this._arcadeSignMat) {
      this._arcadeSignMat.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.15;
    }

    // Animate ceiling fan if loaded
    if (this._ceilingFan) {
      this._ceilingFan.rotation.y += dt * 1.5;
    }
  }

  getMachineFromIntersect(intersect) {
    let obj = intersect.object;
    while (obj) {
      if (obj.userData && obj.userData.machine) {
        return obj.userData.machine;
      }
      obj = obj.parent;
    }
    // Check if clicked on any part of a machine group
    for (const machine of this.machines) {
      if (machine.group === intersect.object.parent) {
        return machine;
      }
    }
    return null;
  }

  getClickableMeshes() {
    const meshes = [];
    for (const machine of this.machines) {
      machine.group.traverse((child) => {
        if (child.isMesh) {
          child.userData.machine = machine;
          meshes.push(child);
        }
      });
    }

    return meshes;
  }

  async _placeModels() {
    const s = this.scene;

    // === VENDING MACHINE — left wall ===
    placeModel(s, M + 'vending-machine.glb', {
      position: [-7.5, 0, 5], rotation: [0, Math.PI / 2, 0], scale: 0.7,
    });
    // Vending machine glow
    const vendLight = new THREE.PointLight(0x44aaff, 0.8, 5);
    vendLight.position.set(-6.5, 1.5, 5);
    this.scene.add(vendLight);

    // === TROPHY on counter ===
    placeModel(s, M + 'trophy.glb', {
      position: [4.5, 1.2, 6], scale: 0.4,
    });

    // === PLANTS — corners ===
    placeModel(s, K + 'pottedPlant.glb', {
      position: [-7.2, 0, -7], scale: 2.5,
    });
    placeModel(s, K + 'pottedPlant.glb', {
      position: [7.2, 0, -7], scale: 2.5,
    });

    // === KENNEY FURNITURE ===


    // Potted plant near entrance
    placeModel(s, K + 'pottedPlant.glb', {
      position: [7.2, 0, 7], scale: 2.5,
    });

    // Small plants on windowsills
    placeModel(s, K + 'plantSmall1.glb', {
      position: [-5, 1.5, 7.8], scale: 2.0,
    });
    placeModel(s, K + 'plantSmall2.glb', {
      position: [5, 1.5, 7.8], scale: 2.0,
    });

    // Speakers — music in the arcade
    placeModel(s, K + 'speaker.glb', {
      position: [-7.5, 2.5, -7.5], rotation: [0, Math.PI / 4, 0], scale: 3.0,
    });
    placeModel(s, K + 'speaker.glb', {
      position: [7.5, 2.5, -7.5], rotation: [0, -Math.PI / 4, 0], scale: 3.0,
    });


    // Bookcase with games/stuff — left wall
    placeModel(s, K + 'bookcaseOpen.glb', {
      position: [-7.3, 0, -5], rotation: [0, Math.PI / 2, 0], scale: 2.5,
    });

    // Books on bookcase
    placeModel(s, K + 'books.glb', {
      position: [-7.3, 1.2, -5], rotation: [0, Math.PI / 2, 0], scale: 2.5,
    });

    // Bar stools at counter
    placeModel(s, K + 'stoolBar.glb', {
      position: [5.5, 0, 5], scale: 2.0,
    });
    placeModel(s, K + 'stoolBar.glb', {
      position: [4.5, 0, 5], scale: 2.0,
    });


    // Ceiling fan
    placeModel(s, K + 'ceilingFan.glb', {
      position: [0, 5.8, 0], scale: 3.0,
    }).then(model => { if (model) this._ceilingFan = model; });

    // Radio on counter
    placeModel(s, K + 'radio.glb', {
      position: [6.2, 1.2, 6], scale: 2.0,
    });

    // Trashcan near door (replaces procedural one? or second one)
    placeModel(s, K + 'trashcan.glb', {
      position: [-1.8, 0, 7.5], scale: 2.5,
    });


    // Second plant — right wall corner
    placeModel(s, K + 'plantSmall3.glb', {
      position: [7.2, 0, -3], scale: 2.5,
    });

    console.log('[arcade] Loading 3D models...');
  }

  _addScreenGlows() {
    const screenColors = [0x00fff5, 0xff00ff, 0x00ff88, 0xffff00, 0xff4444, 0x4488ff, 0x00fff5, 0xff00ff];
    for (let i = 0; i < this.machines.length; i++) {
      const machine = this.machines[i];
      const pos = machine.group.position;
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), machine.group.rotation.y);
      const color = screenColors[i % screenColors.length];

      // Main screen glow — bright, medium range
      const glowLight = new THREE.PointLight(color, 1.2, 5);
      glowLight.position.set(
        pos.x + forward.x * 0.8,
        1.6,
        pos.z + forward.z * 0.8
      );
      this.scene.add(glowLight);

      // Floor reflection — colored light hitting the floor
      const floorGlow = new THREE.PointLight(color, 0.6, 3);
      floorGlow.position.set(
        pos.x + forward.x * 0.6,
        0.1,
        pos.z + forward.z * 0.6
      );
      this.scene.add(floorGlow);
    }
  }
}
