# NPC Visitors & Arcade Exterior — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add NPC visitors that walk in from the street, play arcade games, rate them, and pay coins — plus build the arcade exterior (street, buildings, door).

**Architecture:** Two parallel streams. Stream A builds the exterior environment (front wall, street, buildings, props). Stream B builds the NPC system (voxel models, AI state machine, spawner, economy). Both merge into main.js at the end. No test framework — verify visually via `npm run dev`.

**Tech Stack:** Three.js (geometry-based 3D), vanilla JS ES modules, Express dev server

**Spec:** `docs/superpowers/specs/2026-04-04-npc-visitors-design.md`

---

## Stream A — Arcade Exterior (independent)

### Task A1: Front Wall with Door and Windows

**Files:**
- Modify: `vibe-arcade/src/arcade-room.js`

Currently the front side (z=8) is completely open. Add a front wall with a door opening and glass window panels.

- [ ] **Step 1: Add front wall sections and door opening to `_buildRoom()`**

Add this at the end of `_buildRoom()`, after the lighting section:

```js
    // === FRONT WALL with door opening ===
    const frontWallMat = new THREE.MeshStandardMaterial({
      color: 0xddd5c0,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Left section of front wall (x: -8 to -1.5)
    const fwLeft = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6), frontWallMat);
    fwLeft.position.set(-4.75, 3, 8);
    fwLeft.rotation.y = Math.PI;
    this.scene.add(fwLeft);

    // Right section of front wall (x: 1.5 to 8)
    const fwRight = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6), frontWallMat);
    fwRight.position.set(4.75, 3, 8);
    fwRight.rotation.y = Math.PI;
    this.scene.add(fwRight);

    // Above door section (x: -1.5 to 1.5, y: 2.5 to 6)
    const fwAbove = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.5), frontWallMat);
    fwAbove.position.set(0, 4.25, 8);
    fwAbove.rotation.y = Math.PI;
    this.scene.add(fwAbove);

    // Door frame (dark wood)
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
    // Left frame
    this.scene.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.15), doorFrameMat), { position: new THREE.Vector3(-1.5, 1.25, 8) }));
    // Right frame
    this.scene.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.15), doorFrameMat), { position: new THREE.Vector3(1.5, 1.25, 8) }));
    // Top frame
    this.scene.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 0.15), doorFrameMat), { position: new THREE.Vector3(0, 2.55, 8) }));

    // Glass door panels (semi-transparent)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88ccee,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.3,
    });
    // Left door
    const doorL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), glassMat);
    doorL.position.set(-0.75, 1.25, 8);
    doorL.rotation.y = Math.PI;
    this.scene.add(doorL);
    // Right door
    const doorR = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), glassMat);
    doorR.position.set(0.75, 1.25, 8);
    doorR.rotation.y = Math.PI;
    this.scene.add(doorR);

    // Window vitrines on front wall (left and right of door)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x99ccdd,
      transparent: true,
      opacity: 0.2,
      roughness: 0.1,
      metalness: 0.2,
    });
    // Left window
    const winL = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.5), windowMat);
    winL.position.set(-5, 2.5, 7.99);
    winL.rotation.y = Math.PI;
    this.scene.add(winL);
    // Right window
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

    // Front baseboard
    const bbFrontL = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 0.08), baseboardMat);
    bbFrontL.position.set(-4.75, 0.1, 7.96);
    this.scene.add(bbFrontL);
    const bbFrontR = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 0.08), baseboardMat);
    bbFrontR.position.set(4.75, 0.1, 7.96);
    this.scene.add(bbFrontR);
```

- [ ] **Step 2: Verify visually**

Run: `cd vibe-arcade && npm run dev`
Open browser. You should see:
- Front wall with cream-colored sections flanking a door opening
- Semi-transparent glass door panels
- Glass windows on left and right
- Green "OPEN" sign above door
- Door frame in dark wood

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/arcade-room.js
git commit -m "feat: add front wall with door, windows, and OPEN sign"
```

---

### Task A2: Exterior Environment (Street, Buildings, Props)

**Files:**
- Create: `vibe-arcade/src/exterior.js`

Build the entire exterior: sidewalk, road, curb, neighboring buildings, street lamps, trees, bench, parked car.

- [ ] **Step 1: Create `vibe-arcade/src/exterior.js`**

```js
import * as THREE from 'three';

export class Exterior {
  constructor(scene) {
    this.scene = scene;
    this._buildSidewalk();
    this._buildRoad();
    this._buildBuildings();
    this._buildStreetProps();
  }

  _buildSidewalk() {
    // Sidewalk: gray concrete, z = 8 to 12
    const sidewalkCanvas = document.createElement('canvas');
    sidewalkCanvas.width = 256;
    sidewalkCanvas.height = 256;
    const ctx = sidewalkCanvas.getContext('2d');
    ctx.fillStyle = '#b0b0a8';
    ctx.fillRect(0, 0, 256, 256);
    // Concrete tile lines
    ctx.strokeStyle = '#9a9a92';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    // Speckle
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
    }

    const sidewalkTex = new THREE.CanvasTexture(sidewalkCanvas);
    sidewalkTex.wrapS = THREE.RepeatWrapping;
    sidewalkTex.wrapT = THREE.RepeatWrapping;
    sidewalkTex.repeat.set(5, 1);

    const sidewalkGeo = new THREE.PlaneGeometry(20, 4);
    const sidewalk = new THREE.Mesh(sidewalkGeo, new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.9,
    }));
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0, 0.0, 10);
    this.scene.add(sidewalk);

    // Curb between sidewalk and road
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.8 });
    const curb = new THREE.Mesh(new THREE.BoxGeometry(20, 0.15, 0.2), curbMat);
    curb.position.set(0, 0.075, 12);
    this.scene.add(curb);
  }

  _buildRoad() {
    // Road: dark asphalt with lane markings
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 256;
    const ctx = roadCanvas.getContext('2d');
    // Asphalt
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, 512, 256);
    // Asphalt texture noise
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 60 : 30},${Math.random() > 0.5 ? 60 : 30},${Math.random() > 0.5 ? 60 : 30},0.3)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 256, 2, 2);
    }
    // Center dashed line
    ctx.fillStyle = '#ddd';
    for (let x = 20; x < 512; x += 80) {
      ctx.fillRect(x, 120, 40, 6);
    }

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.repeat.set(2, 1);

    const roadGeo = new THREE.PlaneGeometry(20, 6);
    const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.85,
    }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.01, 15);
    this.scene.add(road);

    // Far curb
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.8 });
    const farCurb = new THREE.Mesh(new THREE.BoxGeometry(20, 0.15, 0.2), curbMat);
    farCurb.position.set(0, 0.075, 18);
    this.scene.add(farCurb);

    // Far sidewalk (just a strip)
    const farSidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 2),
      new THREE.MeshStandardMaterial({ color: 0xb0b0a8, roughness: 0.9 })
    );
    farSidewalk.rotation.x = -Math.PI / 2;
    farSidewalk.position.set(0, 0.0, 19);
    this.scene.add(farSidewalk);
  }

  _buildBuildings() {
    // Buildings flanking the arcade
    const buildingConfigs = [
      // Left side
      { x: -12, z: 3, w: 6, h: 5, d: 16, color: 0xc4b8a0 },
      { x: -12, z: 14, w: 6, h: 7, d: 6, color: 0xa89880 },
      // Right side
      { x: 12, z: 3, w: 6, h: 4, d: 16, color: 0xb8a890 },
      { x: 12, z: 14, w: 6, h: 6, d: 6, color: 0xc0b098 },
      // Across street
      { x: -5, z: 21, w: 8, h: 5.5, d: 4, color: 0xbbb0a0 },
      { x: 5, z: 21, w: 8, h: 7, d: 4, color: 0xa8a090 },
    ];

    for (const cfg of buildingConfigs) {
      this._addBuilding(cfg.x, cfg.z, cfg.w, cfg.h, cfg.d, cfg.color);
    }
  }

  _addBuilding(x, z, w, h, d, color) {
    // Main body
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.set(x, h / 2, z);
    body.castShadow = true;
    this.scene.add(body);

    // Windows on the side facing the street (z - d/2 face)
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 256;
    winCanvas.height = 256;
    const ctx = winCanvas.getContext('2d');
    // Base wall color
    const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 256, 256);
    // Window grid
    const cols = Math.max(2, Math.floor(w / 1.5));
    const rows = Math.max(1, Math.floor(h / 1.5));
    const winW = 180 / cols;
    const winH = 180 / rows;
    for (let wy = 0; wy < rows; wy++) {
      for (let wx = 0; wx < cols; wx++) {
        const px = 30 + wx * (256 - 60) / cols;
        const py = 30 + wy * (256 - 60) / rows;
        // Window pane (dark blue = reflection)
        ctx.fillStyle = '#3a5570';
        ctx.fillRect(px, py, winW * 0.7, winH * 0.7);
        // Window frame
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, winW * 0.7, winH * 0.7);
      }
    }

    const winTex = new THREE.CanvasTexture(winCanvas);
    // Apply window texture to the front face (z-facing side nearest to arcade)
    const faceMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.85 });
    const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
    facePlane.position.set(x, h / 2, z - d / 2 - 0.01);
    this.scene.add(facePlane);
  }

  _buildStreetProps() {
    // === STREET LAMPS ===
    this._addStreetLamp(-4, 10.5);
    this._addStreetLamp(4, 10.5);

    // === TREES ===
    this._addTree(-7, 10);
    this._addTree(7, 10);

    // === BENCH ===
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.3 });
    // Seat
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.4), benchMat);
    benchSeat.position.set(3, 0.55, 9);
    this.scene.add(benchSeat);
    // Backrest
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), benchMat);
    benchBack.position.set(3, 0.85, 8.8);
    this.scene.add(benchBack);
    // Legs
    for (const lx of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.4), metalMat);
      leg.position.set(3 + lx, 0.275, 9);
      this.scene.add(leg);
    }

    // === PARKED CAR ===
    this._addCar(5, 15, 0xc0392b);
  }

  _addStreetLamp(x, z) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.3 });
    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.5, 8), poleMat);
    pole.position.set(x, 1.75, z);
    this.scene.add(pole);
    // Arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.04), poleMat);
    arm.position.set(x - 0.3, 3.5, z);
    this.scene.add(arm);
    // Lamp housing
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffee,
      emissive: 0xfff5d0,
      emissiveIntensity: 0.5,
    });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.2), lampMat);
    lamp.position.set(x - 0.6, 3.45, z);
    this.scene.add(lamp);
    // Actual light
    const light = new THREE.PointLight(0xfff0d0, 0.6, 10);
    light.position.set(x - 0.6, 3.3, z);
    this.scene.add(light);
  }

  _addTree(x, z) {
    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8), trunkMat);
    trunk.position.set(x, 0.6, z);
    this.scene.add(trunk);
    // Canopy (sphere)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8 });
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), canopyMat);
    canopy.position.set(x, 1.6, z);
    this.scene.add(canopy);
    // Second smaller canopy blob for natural look
    const canopy2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), canopyMat);
    canopy2.position.set(x + 0.2, 1.9, z - 0.15);
    this.scene.add(canopy2);
  }

  _addCar(x, z, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.9), bodyMat);
    body.position.set(x, 0.45, z);
    this.scene.add(body);
    // Cabin (top part)
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.2 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.8), cabinMat);
    cabin.position.set(x, 0.9, z);
    this.scene.add(cabin);
    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
    const wheelPositions = [
      [x - 0.6, 0.15, z + 0.45],
      [x + 0.6, 0.15, z + 0.45],
      [x - 0.6, 0.15, z - 0.45],
      [x + 0.6, 0.15, z - 0.45],
    ];
    for (const wp of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(...wp);
      wheel.rotation.x = Math.PI / 2;
      this.scene.add(wheel);
    }
    // Windshield (front/back glass)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88bbdd,
      transparent: true,
      opacity: 0.4,
    });
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.35), glassMat);
    windshield.position.set(x + 0.51, 0.85, z);
    windshield.rotation.y = Math.PI / 2;
    this.scene.add(windshield);
  }
}
```

- [ ] **Step 2: Verify visually**

Don't integrate yet — Task A3 will wire it into main.js.

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/exterior.js
git commit -m "feat: add exterior environment — street, buildings, lamps, trees, car"
```

---

### Task A3: Wire Exterior into Main and Update Sky

**Files:**
- Modify: `vibe-arcade/src/main.js`

- [ ] **Step 1: Import and instantiate Exterior, change background to sky**

In `vibe-arcade/src/main.js`, add import at top:

```js
import { Exterior } from './exterior.js';
```

Change the scene background line from:
```js
scene.background = new THREE.Color(0xe8e0d0);
// Warm, bright arcade atmosphere
```
To:
```js
scene.background = new THREE.Color(0x87CEEB);
// Sky blue background
```

After `const arcadeRoom = new ArcadeRoom(scene);` add:
```js
const exterior = new Exterior(scene);
```

- [ ] **Step 2: Verify visually**

Run dev server. You should see:
- Sky blue background
- Front wall with door visible from inside
- Sidewalk, road, curb visible through the door
- Buildings flanking the arcade
- Street lamps, trees, bench, parked car

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/main.js
git commit -m "feat: integrate exterior, sky blue background"
```

---

## Stream B — NPC System (independent)

### Task B1: Reputation System

**Files:**
- Create: `vibe-arcade/src/reputation.js`
- Modify: `vibe-arcade/src/storage.js`

Build the rating/reputation module first since other NPC code depends on it.

- [ ] **Step 1: Update storage to include reputation data**

In `vibe-arcade/src/storage.js`, change `defaultState`:

```js
const defaultState = {
  coins: 0,
  level: 1,
  cards: [],
  machines: Array(6).fill(null),
  totalGamesPlayed: 0,
  machineRatings: Array(6).fill(null), // { totalStars, count } per machine
  totalNpcCoinsEarned: 0,
};
```

- [ ] **Step 2: Create `vibe-arcade/src/reputation.js`**

```js
export class Reputation {
  constructor(gameState, saveCallback) {
    this.gameState = gameState;
    this.save = saveCallback;

    // Initialize ratings if missing
    if (!this.gameState.machineRatings) {
      this.gameState.machineRatings = Array(6).fill(null);
    }
    if (!this.gameState.totalNpcCoinsEarned) {
      this.gameState.totalNpcCoinsEarned = 0;
    }
  }

  /** Add a rating (1-5) to a machine */
  addRating(machineIndex, stars) {
    stars = Math.max(1, Math.min(5, Math.round(stars)));
    if (!this.gameState.machineRatings[machineIndex]) {
      this.gameState.machineRatings[machineIndex] = { totalStars: 0, count: 0 };
    }
    const r = this.gameState.machineRatings[machineIndex];
    r.totalStars += stars;
    r.count += 1;
    this.save();
    return stars;
  }

  /** Get average rating for a machine (0 if no ratings) */
  getMachineRating(machineIndex) {
    const r = this.gameState.machineRatings?.[machineIndex];
    if (!r || r.count === 0) return 0;
    return r.totalStars / r.count;
  }

  /** Get arcade-wide reputation (average of all rated machines) */
  getReputation() {
    let total = 0;
    let count = 0;
    for (const r of this.gameState.machineRatings || []) {
      if (r && r.count > 0) {
        total += r.totalStars / r.count;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  /** Calculate rating from NPC personality and card levels */
  calculateRating(npcStandards, avgCardStars) {
    const baseRating = 2 + Math.random() * 2; // 2-4
    const cardBonus = (avgCardStars - 1) * 0.5;
    const standardsPenalty = (npcStandards - 0.5) * 1.5;
    return Math.max(1, Math.min(5, Math.round(baseRating + cardBonus - standardsPenalty)));
  }

  /** Calculate coins NPC pays (base 5 * generosity + tip based on rating) */
  calculatePayment(npcGenerosity, rating) {
    const basePay = Math.floor(5 * npcGenerosity);
    let tip = 0;
    if (rating >= 5) {
      tip = 5 + Math.floor(Math.random() * 6); // 5-10
    } else if (rating >= 4) {
      tip = 2 + Math.floor(Math.random() * 4); // 2-5
    }
    return basePay + tip;
  }

  /** Get player level (from totalGamesPlayed) */
  getLevel() {
    return Math.floor(this.gameState.totalGamesPlayed / 5) + 1;
  }

  /** Get NPC spawn interval in seconds */
  getSpawnInterval() {
    const level = this.getLevel();
    const rep = this.getReputation();
    const baseRate = 0.1; // per second
    const rate = baseRate * (1 + level * 0.15) * (0.5 + rep / 5);
    return rate > 0 ? 1 / rate : 999;
  }

  /** Get max concurrent NPCs */
  getMaxNpcs() {
    const level = this.getLevel();
    return Math.min(12, 4 + level);
  }

  /** Are there any machines with games? */
  hasActiveGames(machines) {
    return machines.some(m => m && m.state === 'ready');
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/reputation.js vibe-arcade/src/storage.js
git commit -m "feat: add reputation system and rating storage"
```

---

### Task B2: NPC Voxel Model

**Files:**
- Create: `vibe-arcade/src/npc.js`

Build the NPC class with voxel model, procedural animation, and state machine.

- [ ] **Step 1: Create `vibe-arcade/src/npc.js`**

```js
import * as THREE from 'three';

const SKIN_TONES = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
const SHIRT_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf39c12, 0x1abc9c, 0xe67e22, 0x2c3e50, 0xd35400, 0x7f8c8d];
const PANTS_COLORS = [0x2c3e50, 0x34495e, 0x1a1a2e, 0x3d3d3d];
const HAT_TYPES = ['none', 'none', 'none', 'cap', 'flatHair', 'tallHair']; // weighted toward none

const STATES = {
  SPAWNING: 'spawning',
  ENTERING: 'entering',
  BROWSING: 'browsing',
  CHOOSING: 'choosing',
  WALKING_TO_MACHINE: 'walking_to_machine',
  WAITING: 'waiting',
  PLAYING: 'playing',
  WATCHING: 'watching',
  RATING: 'rating',
  LEAVING: 'leaving',
  DESPAWNING: 'despawning',
};

const WALK_SPEED = 1.8; // units per second

export { STATES };

export class NPC {
  constructor(id, spawnPos, personality, partnerId = null) {
    this.id = id;
    this.state = STATES.SPAWNING;
    this.personality = personality; // { patience, generosity, standards }
    this.partnerId = partnerId; // if spawned as pair
    this.targetMachine = null;
    this.targetPos = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3().copy(spawnPos);
    this.walkQueue = []; // array of Vector3 waypoints
    this.stateTimer = 0;
    this.playDuration = 15 + Math.random() * 15; // 15-30s
    this.browseCount = 0;
    this.rating = 0;
    this.dead = false; // flagged for removal

    // Emoticon sprite (shown above head after rating)
    this.emoticonSprite = null;
    this.emoticonTimer = 0;

    // 3D group
    this.group = new THREE.Group();
    this.group.position.copy(spawnPos);

    // Body part references for animation
    this.parts = {};
    this._buildModel();
  }

  _buildModel() {
    const skinTone = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const shirtColor = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    const pantsColor = PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)];
    const hatType = HAT_TYPES[Math.floor(Math.random() * HAT_TYPES.length)];

    const skinMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), skinMat);
    head.position.y = 0.8;
    this.group.add(head);
    this.parts.head = head;

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.18), shirtMat);
    body.position.y = 0.525;
    this.group.add(body);
    this.parts.body = body;

    // Left leg
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), pantsMat);
    leftLeg.position.set(-0.08, 0.175, 0);
    this.group.add(leftLeg);
    this.parts.leftLeg = leftLeg;

    // Right leg
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), pantsMat);
    rightLeg.position.set(0.08, 0.175, 0);
    this.group.add(rightLeg);
    this.parts.rightLeg = rightLeg;

    // Left arm
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), skinMat);
    leftArm.position.set(-0.22, 0.55, 0);
    this.group.add(leftArm);
    this.parts.leftArm = leftArm;

    // Right arm
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), skinMat);
    rightArm.position.set(0.22, 0.55, 0);
    this.group.add(rightArm);
    this.parts.rightArm = rightArm;

    // Hat / Hair
    if (hatType === 'cap') {
      const capMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 });
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.22), capMat);
      cap.position.set(0, 0.92, 0);
      this.group.add(cap);
      // Brim
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), capMat);
      brim.position.set(0, 0.9, 0.12);
      this.group.add(brim);
    } else if (hatType === 'flatHair') {
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.22), hairMat);
      hair.position.set(0, 0.92, 0);
      this.group.add(hair);
    } else if (hatType === 'tallHair') {
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.2), hairMat);
      hair.position.set(0, 0.96, 0);
      this.group.add(hair);
    }
  }

  /** Animate based on current state */
  animate(dt) {
    const t = performance.now() / 1000;
    const isWalking = this.state === STATES.SPAWNING || this.state === STATES.ENTERING ||
      this.state === STATES.BROWSING || this.state === STATES.WALKING_TO_MACHINE ||
      this.state === STATES.LEAVING || this.state === STATES.DESPAWNING;

    if (isWalking && this.walkQueue.length > 0) {
      // Walk animation
      const swing = Math.sin(t * 8) * 0.4;
      this.parts.leftLeg.rotation.x = swing;
      this.parts.rightLeg.rotation.x = -swing;
      this.parts.leftArm.rotation.x = -swing * 0.6;
      this.parts.rightArm.rotation.x = swing * 0.6;
      this.parts.body.position.y = 0.525 + Math.abs(Math.sin(t * 8)) * 0.02;
    } else if (this.state === STATES.PLAYING) {
      // Playing animation — arms forward, slight head bob
      this.parts.leftArm.rotation.x = -0.8;
      this.parts.rightArm.rotation.x = -0.8;
      this.parts.head.rotation.y = Math.sin(t * 2) * 0.15;
      this.parts.leftLeg.rotation.x = 0;
      this.parts.rightLeg.rotation.x = 0;
    } else if (this.state === STATES.WATCHING) {
      // Watching — occasional lean
      this.parts.leftArm.rotation.x = 0;
      this.parts.rightArm.rotation.x = 0;
      this.parts.head.rotation.y = Math.sin(t * 1.5) * 0.2;
      this.parts.body.rotation.x = Math.sin(t * 0.8) * 0.05;
      this.parts.leftLeg.rotation.x = 0;
      this.parts.rightLeg.rotation.x = 0;
    } else {
      // Idle — minimal sway
      this.parts.leftLeg.rotation.x = 0;
      this.parts.rightLeg.rotation.x = 0;
      this.parts.leftArm.rotation.x = 0;
      this.parts.rightArm.rotation.x = 0;
      this.parts.body.position.y = 0.525;
      this.parts.body.rotation.x = 0;
      this.parts.head.rotation.y = Math.sin(t * 0.5) * 0.1;
    }

    // Emoticon fade
    if (this.emoticonSprite) {
      this.emoticonTimer -= dt;
      this.emoticonSprite.position.y += dt * 0.5; // float up
      this.emoticonSprite.material.opacity = Math.max(0, this.emoticonTimer / 2);
      if (this.emoticonTimer <= 0) {
        this.group.remove(this.emoticonSprite);
        this.emoticonSprite.material.dispose();
        this.emoticonSprite.geometry.dispose();
        this.emoticonSprite = null;
      }
    }
  }

  /** Move toward next waypoint. Returns true if reached current target. */
  moveToward(dt) {
    if (this.walkQueue.length === 0) return true;

    const target = this.walkQueue[0];
    const dir = new THREE.Vector3().subVectors(target, this.group.position);
    dir.y = 0; // stay on ground
    const dist = dir.length();

    if (dist < 0.15) {
      this.group.position.x = target.x;
      this.group.position.z = target.z;
      this.walkQueue.shift();
      return this.walkQueue.length === 0;
    }

    dir.normalize();
    const step = WALK_SPEED * dt;
    this.group.position.x += dir.x * Math.min(step, dist);
    this.group.position.z += dir.z * Math.min(step, dist);

    // Face movement direction
    this.group.rotation.y = Math.atan2(dir.x, dir.z);

    return false;
  }

  /** Show emoticon above head */
  showEmoticon(text) {
    if (this.emoticonSprite) {
      this.group.remove(this.emoticonSprite);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(0, 1.15, 0);
    sprite.scale.set(0.3, 0.3, 0.3);
    this.group.add(sprite);

    this.emoticonSprite = sprite;
    this.emoticonTimer = 2.5; // seconds to display
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    if (this.emoticonSprite) {
      this.emoticonSprite.material.map.dispose();
      this.emoticonSprite.material.dispose();
      this.emoticonSprite.geometry.dispose();
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add vibe-arcade/src/npc.js
git commit -m "feat: add NPC voxel model with animations and state enum"
```

---

### Task B3: NPC Manager (AI + Spawner + Economy)

**Files:**
- Create: `vibe-arcade/src/npc-manager.js`

Combines spawner, AI state machine updates, collision avoidance, and machine interaction in one file. Keeps it simple — no need for separate spawner file since the logic is tightly coupled.

- [ ] **Step 1: Create `vibe-arcade/src/npc-manager.js`**

```js
import * as THREE from 'three';
import { NPC, STATES } from './npc.js';

const WAYPOINTS = {
  DOOR: new THREE.Vector3(0, 0, 8),
  ENTRY: new THREE.Vector3(0, 0, 6),
  BROWSE: [
    new THREE.Vector3(-3, 0, 2),
    new THREE.Vector3(3, 0, 2),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-2, 0, 4),
    new THREE.Vector3(2, 0, 4),
  ],
};

let nextNpcId = 1;

export class NpcManager {
  constructor(scene, machines, reputation, gameState, saveCallback) {
    this.scene = scene;
    this.machines = machines; // array of ArcadeMachine
    this.reputation = reputation;
    this.gameState = gameState;
    this.save = saveCallback;
    this.npcs = [];
    this.spawnTimer = 0;
    this.pairCooldown = 0;
  }

  update(dt) {
    this._updateSpawner(dt);

    for (const npc of this.npcs) {
      this._updateNpc(npc, dt);
      npc.animate(dt);
    }

    // Remove dead NPCs
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      if (this.npcs[i].dead) {
        this._removeNpc(this.npcs[i]);
        this.npcs.splice(i, 1);
      }
    }
  }

  // --- Spawner ---

  _updateSpawner(dt) {
    // Don't spawn if no games
    if (!this.reputation.hasActiveGames(this.machines)) return;
    if (this.npcs.length >= this.reputation.getMaxNpcs()) return;

    this.spawnTimer += dt;
    this.pairCooldown -= dt;
    const interval = this.reputation.getSpawnInterval();

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;

      // 20% chance of pair spawn
      const isPair = this.pairCooldown <= 0 && Math.random() < 0.2 &&
        this.npcs.length + 2 <= this.reputation.getMaxNpcs();

      if (isPair) {
        this._spawnPair();
        this.pairCooldown = 15; // cooldown before next pair
      } else {
        this._spawnSingle();
      }
    }
  }

  _randomPersonality() {
    return {
      patience: 0.3 + Math.random() * 0.7,
      generosity: 0.5 + Math.random() * 1.0,
      standards: 0.3 + Math.random() * 0.7,
    };
  }

  _spawnSingle() {
    const spawnX = -2 + Math.random() * 4;
    const pos = new THREE.Vector3(spawnX, 0, 13);
    const npc = new NPC(nextNpcId++, pos, this._randomPersonality());
    npc.walkQueue = [
      new THREE.Vector3(spawnX, 0, 13),
      WAYPOINTS.DOOR.clone(),
      WAYPOINTS.ENTRY.clone(),
    ];
    this.npcs.push(npc);
    this.scene.add(npc.group);
  }

  _spawnPair() {
    const baseX = -1 + Math.random() * 2;
    const id1 = nextNpcId++;
    const id2 = nextNpcId++;

    const pos1 = new THREE.Vector3(baseX - 0.4, 0, 13);
    const pos2 = new THREE.Vector3(baseX + 0.4, 0, 13);

    const personality = this._randomPersonality();
    const npc1 = new NPC(id1, pos1, { ...personality }, id2);
    const npc2 = new NPC(id2, pos2, { ...this._randomPersonality() }, id1);

    npc1.walkQueue = [pos1.clone(), WAYPOINTS.DOOR.clone().add(new THREE.Vector3(-0.4, 0, 0)), WAYPOINTS.ENTRY.clone().add(new THREE.Vector3(-0.4, 0, 0))];
    npc2.walkQueue = [pos2.clone(), WAYPOINTS.DOOR.clone().add(new THREE.Vector3(0.4, 0, 0)), WAYPOINTS.ENTRY.clone().add(new THREE.Vector3(0.4, 0, 0))];

    this.npcs.push(npc1, npc2);
    this.scene.add(npc1.group);
    this.scene.add(npc2.group);
  }

  // --- State Machine ---

  _updateNpc(npc, dt) {
    switch (npc.state) {
      case STATES.SPAWNING:
      case STATES.ENTERING:
        if (npc.moveToward(dt)) {
          npc.state = STATES.BROWSING;
          npc.browseCount = 0;
          this._addBrowseTarget(npc);
        }
        break;

      case STATES.BROWSING:
        if (npc.moveToward(dt)) {
          npc.browseCount++;
          if (npc.browseCount >= 1 + Math.floor(Math.random() * 2)) {
            npc.state = STATES.CHOOSING;
          } else {
            this._addBrowseTarget(npc);
          }
        }
        break;

      case STATES.CHOOSING:
        this._chooseAction(npc);
        break;

      case STATES.WALKING_TO_MACHINE:
        if (npc.moveToward(dt)) {
          const machine = npc.targetMachine;
          if (!machine) { this._startLeaving(npc); break; }

          // Check if machine is occupied by another NPC
          if (machine.npcOccupant && machine.npcOccupant !== npc) {
            // Watch or wait
            if (Math.random() < 0.5) {
              npc.state = STATES.WATCHING;
              npc.stateTimer = 8 + Math.random() * 10;
            } else {
              npc.state = STATES.WAITING;
              npc.stateTimer = npc.personality.patience * 10; // 3-10s
            }
          } else if (machine.state === 'playing') {
            // Real player is playing — watch
            npc.state = STATES.WATCHING;
            npc.stateTimer = 8 + Math.random() * 10;
          } else {
            // Play!
            this._startPlaying(npc, machine);
          }
        }
        break;

      case STATES.WAITING:
        npc.stateTimer -= dt;
        if (npc.stateTimer <= 0) {
          // Impatient — leave or try another
          npc.targetMachine = null;
          if (Math.random() < 0.4) {
            npc.state = STATES.CHOOSING;
          } else {
            this._startLeaving(npc);
          }
        } else {
          // Check if machine freed up
          const machine = npc.targetMachine;
          if (machine && !machine.npcOccupant && machine.state === 'ready') {
            this._startPlaying(npc, machine);
          }
        }
        break;

      case STATES.WATCHING:
        npc.stateTimer -= dt;
        // React occasionally
        if (Math.random() < dt * 0.3) {
          npc.showEmoticon(['!', '!!', '😮', '👀'][Math.floor(Math.random() * 4)]);
        }
        if (npc.stateTimer <= 0) {
          const machine = npc.targetMachine;
          // Try to play if machine free
          if (machine && !machine.npcOccupant && machine.state === 'ready') {
            this._startPlaying(npc, machine);
          } else if (npc.partnerId) {
            // Wait for partner
            npc.state = STATES.WAITING;
            npc.stateTimer = 5;
          } else {
            npc.state = STATES.CHOOSING;
          }
        }
        break;

      case STATES.PLAYING:
        npc.stateTimer -= dt;
        if (npc.stateTimer <= 0) {
          this._finishPlaying(npc);
        }
        break;

      case STATES.RATING:
        npc.stateTimer -= dt;
        if (npc.stateTimer <= 0) {
          // Pair partner takes turn?
          if (npc.partnerId) {
            const partner = this.npcs.find(n => n.id === npc.partnerId);
            if (partner && partner.state === STATES.WATCHING && npc.targetMachine) {
              // Partner plays next
              const machine = npc.targetMachine;
              if (!machine.npcOccupant && machine.state === 'ready') {
                this._startPlaying(partner, machine);
              }
            }
          }
          this._startLeaving(npc);
        }
        break;

      case STATES.LEAVING:
        if (npc.moveToward(dt)) {
          npc.state = STATES.DESPAWNING;
          npc.walkQueue = [new THREE.Vector3(npc.group.position.x, 0, 16)];
        }
        break;

      case STATES.DESPAWNING:
        if (npc.moveToward(dt)) {
          npc.dead = true;
        }
        break;
    }
  }

  _addBrowseTarget(npc) {
    const bp = WAYPOINTS.BROWSE[Math.floor(Math.random() * WAYPOINTS.BROWSE.length)];
    const offset = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
    npc.walkQueue = [bp.clone().add(offset)];
  }

  _chooseAction(npc) {
    // Find machines with games, prefer higher rated
    const candidates = this.machines
      .filter(m => m.state === 'ready' || (m.npcOccupant && m.state === 'occupied_npc'))
      .map(m => ({
        machine: m,
        rating: this.reputation.getMachineRating(m.index) || 3,
        occupied: !!m.npcOccupant || m.state === 'playing',
      }));

    if (candidates.length === 0) {
      this._startLeaving(npc);
      return;
    }

    // Weighted random by rating
    const totalWeight = candidates.reduce((sum, c) => sum + c.rating, 0);
    let roll = Math.random() * totalWeight;
    let chosen = candidates[0];
    for (const c of candidates) {
      roll -= c.rating;
      if (roll <= 0) { chosen = c; break; }
    }

    npc.targetMachine = chosen.machine;
    npc.state = STATES.WALKING_TO_MACHINE;

    // Calculate play position (in front of machine)
    const machinePos = chosen.machine.group.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(chosen.machine.group.quaternion);

    if (chosen.occupied) {
      // Watch position — behind and to the side
      const watchPos = machinePos.clone()
        .add(forward.clone().multiplyScalar(1.8))
        .add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, 0));
      npc.walkQueue = [watchPos];
    } else {
      // Play position — directly in front
      const playPos = machinePos.clone().add(forward.clone().multiplyScalar(1.2));
      npc.walkQueue = [playPos];
    }
  }

  _startPlaying(npc, machine) {
    npc.state = STATES.PLAYING;
    npc.stateTimer = npc.playDuration;
    npc.targetMachine = machine;
    machine.npcOccupant = npc;
    machine.state = 'occupied_npc';

    // Draw NPC playing screen
    this._drawNpcPlayingScreen(machine);

    // Face the machine
    const dir = new THREE.Vector3().subVectors(machine.group.position, npc.group.position);
    dir.y = 0;
    if (dir.length() > 0.01) {
      npc.group.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  _finishPlaying(npc) {
    const machine = npc.targetMachine;
    if (!machine) { this._startLeaving(npc); return; }

    // Release machine
    machine.npcOccupant = null;
    machine.state = 'ready';
    machine.drawReady();

    // Calculate rating
    const saved = this.gameState.machines[machine.index];
    const avgStars = saved ? ((saved.cardStars?.genre || 1) + (saved.cardStars?.theme || 1)) / 2 : 1;
    const rating = this.reputation.calculateRating(npc.personality.standards, avgStars);
    npc.rating = rating;

    // Store rating
    this.reputation.addRating(machine.index, rating);

    // Calculate payment
    const coins = this.reputation.calculatePayment(npc.personality.generosity, rating);
    this.gameState.coins += coins;
    this.gameState.totalNpcCoinsEarned = (this.gameState.totalNpcCoinsEarned || 0) + coins;
    this.save();

    // Show emoticon
    if (rating >= 5) {
      npc.showEmoticon('🤩');
    } else if (rating >= 4) {
      npc.showEmoticon('⭐');
    } else if (rating >= 3) {
      npc.showEmoticon('👍');
    } else if (rating >= 2) {
      npc.showEmoticon('😐');
    } else {
      npc.showEmoticon('😡');
    }

    npc.state = STATES.RATING;
    npc.stateTimer = 2.5; // show rating for a moment
  }

  _startLeaving(npc) {
    npc.state = STATES.LEAVING;
    npc.targetMachine = null;
    npc.walkQueue = [WAYPOINTS.ENTRY.clone(), WAYPOINTS.DOOR.clone()];

    // If has partner, signal them too
    if (npc.partnerId) {
      const partner = this.npcs.find(n => n.id === npc.partnerId);
      if (partner && partner.state !== STATES.LEAVING && partner.state !== STATES.DESPAWNING && partner.state !== STATES.PLAYING) {
        partner.state = STATES.LEAVING;
        partner.targetMachine = null;
        partner.walkQueue = [WAYPOINTS.ENTRY.clone().add(new THREE.Vector3(0.4, 0, 0)), WAYPOINTS.DOOR.clone().add(new THREE.Vector3(0.4, 0, 0))];
      }
    }
  }

  _drawNpcPlayingScreen(machine) {
    const ctx = machine.screenCtx;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 800, 600);

    // Scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < 600; y += 3) {
      ctx.fillRect(0, y, 800, 1);
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(machine.gameTitle || 'MINI GAME', 400, 180);

    ctx.fillStyle = '#4fc3f7';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('NOW PLAYING', 400, 300);

    // Animated player icon
    ctx.font = '48px Arial';
    ctx.fillText('🎮', 400, 400);

    machine.screenTexture.needsUpdate = true;
  }

  _removeNpc(npc) {
    this.scene.remove(npc.group);
    // Release machine if still occupied
    if (npc.targetMachine && npc.targetMachine.npcOccupant === npc) {
      npc.targetMachine.npcOccupant = null;
      if (npc.targetMachine.state === 'occupied_npc') {
        npc.targetMachine.state = 'ready';
        npc.targetMachine.drawReady();
      }
    }
    npc.dispose();
  }

  /** Get current NPC count for HUD */
  getNpcCount() {
    return this.npcs.length;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add vibe-arcade/src/npc-manager.js
git commit -m "feat: add NPC manager with AI state machine, spawner, and economy"
```

---

### Task B4: Machine Modifications for NPC

**Files:**
- Modify: `vibe-arcade/src/machine.js`

Add `occupied_npc` state and NPC-related properties.

- [ ] **Step 1: Add NPC occupant property to ArcadeMachine constructor**

In `vibe-arcade/src/machine.js`, in the constructor after `this.highScore = 0;`:

```js
    this.npcOccupant = null; // NPC currently playing
```

- [ ] **Step 2: Update state comment**

Change:
```js
    this.state = 'empty'; // empty | generating | ready | playing
```
To:
```js
    this.state = 'empty'; // empty | generating | ready | playing | occupied_npc
```

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/machine.js
git commit -m "feat: add NPC occupant support to arcade machines"
```

---

### Task B5: HUD Updates (Reputation & Visitor Count)

**Files:**
- Modify: `vibe-arcade/src/hud.js`
- Modify: `vibe-arcade/index.html`

- [ ] **Step 1: Add reputation and visitor count to HUD in `index.html`**

In `vibe-arcade/index.html`, inside the `#hud-right` div, after the level display span, add:

```html
        <span id="reputation-display">⭐ <span id="reputation-value">-</span></span>
        <span id="visitors-display">👥 <span id="visitors-value">0</span></span>
```

- [ ] **Step 2: Update HUD class to show reputation and visitors**

In `vibe-arcade/src/hud.js`, add to constructor after `this.backButtonEl`:

```js
    this.reputationEl = document.getElementById('reputation-value');
    this.visitorsEl = document.getElementById('visitors-value');
```

Add new method:

```js
  updateNpcDisplay(reputation, visitorCount) {
    if (this.reputationEl) {
      this.reputationEl.textContent = reputation > 0 ? reputation.toFixed(1) : '-';
    }
    if (this.visitorsEl) {
      this.visitorsEl.textContent = visitorCount;
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/hud.js vibe-arcade/index.html
git commit -m "feat: add reputation and visitor count to HUD"
```

---

## Merge — Integration

### Task C1: Wire Everything into Main.js

**Files:**
- Modify: `vibe-arcade/src/main.js`

- [ ] **Step 1: Import new modules**

Add imports at top of `vibe-arcade/src/main.js`:

```js
import { Reputation } from './reputation.js';
import { NpcManager } from './npc-manager.js';
```

(If Task A3 was done, `Exterior` import is already there.)

- [ ] **Step 2: Initialize reputation and NPC manager after game manager**

After `const gameManager = new GameManager(gameState, save);` add:

```js
// --- Reputation & NPC System ---
const reputation = new Reputation(gameState, save);
const npcManager = new NpcManager(scene, arcadeRoom.machines, reputation, gameState, save);
```

- [ ] **Step 3: Add NPC update to render loop**

Change the `animate` function:

```js
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - (animate.lastTime || now)) / 1000, 0.1); // cap at 100ms
  animate.lastTime = now;

  cameraCtrl.update();
  gameManager.updateMachineTexture();
  npcManager.update(dt);
  hud.updateNpcDisplay(reputation.getReputation(), npcManager.getNpcCount());

  renderer.render(scene, camera);
}
```

- [ ] **Step 4: Verify visually**

Run: `cd vibe-arcade && npm run dev`

Expected:
- Create at least one game on a machine
- After a few seconds, NPC should spawn on the sidewalk
- NPC walks through door into arcade
- Browses around, then walks to the machine
- Plays for 15-30 seconds
- Shows emoticon rating, machine goes back to ready
- NPC walks out
- HUD shows reputation and visitor count
- Coins increase from NPC payments

- [ ] **Step 5: Commit**

```bash
git add vibe-arcade/src/main.js
git commit -m "feat: integrate NPC system and reputation into main loop"
```

---

### Task C2: Final Polish and Push

- [ ] **Step 1: Run full visual test**

Start server, create 2-3 games on machines, wait for NPCs to flow through. Check:
- NPCs walk naturally (no jittering, smooth animation)
- Pairs walk together
- NPCs don't get stuck on machines
- Ratings show in HUD
- Coins accumulate
- Exterior looks correct from isometric and zoomed views

- [ ] **Step 2: Push to GitHub**

```bash
git push origin master
```
