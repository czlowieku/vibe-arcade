import * as THREE from 'three';
import { ArcadeMachine } from './machine.js';

export class ArcadeRoom {
  constructor(scene) {
    this.scene = scene;
    this.machines = [];
    this._buildRoom();
    this._addDecorations();
    this._placeMachines();
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
      color: 0xddd5c0,
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

    // === LIGHTING — warm and bright like real arcade ===
    // Warm ambient — moderate
    const ambient = new THREE.AmbientLight(0xfff5e6, 1.0);
    this.scene.add(ambient);

    // Overhead lights (warm white, toned down)
    const overheadPositions = [
      [0, 5.5, -3], [0, 5.5, 3], [-4, 5.5, 0], [4, 5.5, 0]
    ];
    for (const pos of overheadPositions) {
      const light = new THREE.PointLight(0xfff8e8, 1.2, 16);
      light.position.set(...pos);
      this.scene.add(light);
    }

    // Central overhead light
    const mainLight = new THREE.PointLight(0xfff5e0, 1.0, 25);
    mainLight.position.set(0, 5.8, 0);
    this.scene.add(mainLight);

    // Directional fill light
    const fillLight = new THREE.DirectionalLight(0xfffbe8, 0.3);
    fillLight.position.set(5, 8, 10);
    this.scene.add(fillLight);
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

    // === POSTER FRAMES on walls ===
    this._addPoster(-6, 3.5, -7.94, 0, '#e74c3c', 'PLAY!');
    this._addPoster(5.5, 3.5, -7.94, 0, '#3498db', 'HIGH\nSCORE');
    this._addPoster(-7.94, 3.5, -5, Math.PI / 2, '#2ecc71', 'INSERT\nCOIN');
    this._addPoster(7.94, 3.5, -5, -Math.PI / 2, '#f39c12', 'GAME\nON!');

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
    this._addGumballMachine(-6.5, 5);

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

    // === COIN CHANGE MACHINE ===
    const changeMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.3 });
    const changeMachine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.6), changeMat);
    changeMachine.position.set(-7.2, 0.9, 3);
    changeMachine.castShadow = true;
    this.scene.add(changeMachine);
    // Coin slot
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), slotMat);
    coinSlot.position.set(-7.2, 1.3, 2.7);
    this.scene.add(coinSlot);
    // Dollar bill slot
    const billSlot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.02), slotMat);
    billSlot.position.set(-7.2, 1.5, 2.7);
    this.scene.add(billSlot);
    // "CHANGE" label
    const changeCanvas = document.createElement('canvas');
    changeCanvas.width = 128;
    changeCanvas.height = 64;
    const chCtx = changeCanvas.getContext('2d');
    chCtx.fillStyle = '#f1c40f';
    chCtx.fillRect(0, 0, 128, 64);
    chCtx.fillStyle = '#2c3e50';
    chCtx.font = 'bold 24px Arial';
    chCtx.textAlign = 'center';
    chCtx.textBaseline = 'middle';
    chCtx.fillText('CHANGE', 64, 32);
    const changeTexture = new THREE.CanvasTexture(changeCanvas);
    const changeLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.25),
      new THREE.MeshStandardMaterial({ map: changeTexture })
    );
    changeLabel.position.set(-7.2, 1.7, 2.7);
    this.scene.add(changeLabel);

    // === FLOOR MAT at entrance ===
    const matGeo = new THREE.PlaneGeometry(3, 1.5);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 1.0 });
    const floorMat = new THREE.Mesh(matGeo, matMat);
    floorMat.rotation.x = -Math.PI / 2;
    floorMat.position.set(0, 0.005, 7.5);
    this.scene.add(floorMat);
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
    // 6 machines: 3 along back wall, 3 along sides
    const placements = [
      // Back wall - 3 machines facing forward
      { pos: new THREE.Vector3(-3.5, 0, -6.5), rot: 0 },
      { pos: new THREE.Vector3(0, 0, -6.5), rot: 0 },
      { pos: new THREE.Vector3(3.5, 0, -6.5), rot: 0 },
      // Left wall - 1 machine facing right
      { pos: new THREE.Vector3(-6.5, 0, -2), rot: Math.PI / 2 },
      // Right wall - 1 machine facing left
      { pos: new THREE.Vector3(6.5, 0, -2), rot: -Math.PI / 2 },
      // Center area - 1 machine facing forward
      { pos: new THREE.Vector3(0, 0, -2), rot: 0 },
    ];

    for (let i = 0; i < placements.length; i++) {
      const { pos, rot } = placements[i];
      const machine = new ArcadeMachine(i, pos, rot);
      this.machines.push(machine);
      this.scene.add(machine.group);
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
}
