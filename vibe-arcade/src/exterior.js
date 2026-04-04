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
    const sidewalkCanvas = document.createElement('canvas');
    sidewalkCanvas.width = 256;
    sidewalkCanvas.height = 256;
    const ctx = sidewalkCanvas.getContext('2d');
    ctx.fillStyle = '#b0b0a8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#9a9a92';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
    }

    const sidewalkTex = new THREE.CanvasTexture(sidewalkCanvas);
    sidewalkTex.wrapS = THREE.RepeatWrapping;
    sidewalkTex.wrapT = THREE.RepeatWrapping;
    sidewalkTex.repeat.set(5, 1);

    const sidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 4),
      new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.9 })
    );
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0, 0.0, 10);
    this.scene.add(sidewalk);

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.8 });
    const curb = new THREE.Mesh(new THREE.BoxGeometry(20, 0.15, 0.2), curbMat);
    curb.position.set(0, 0.075, 12);
    this.scene.add(curb);
  }

  _buildRoad() {
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 256;
    const ctx = roadCanvas.getContext('2d');
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 60 : 30},${Math.random() > 0.5 ? 60 : 30},${Math.random() > 0.5 ? 60 : 30},0.3)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 256, 2, 2);
    }
    ctx.fillStyle = '#ddd';
    for (let x = 20; x < 512; x += 80) {
      ctx.fillRect(x, 120, 40, 6);
    }

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.repeat.set(2, 1);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 6),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.01, 15);
    this.scene.add(road);

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.8 });
    const farCurb = new THREE.Mesh(new THREE.BoxGeometry(20, 0.15, 0.2), curbMat);
    farCurb.position.set(0, 0.075, 18);
    this.scene.add(farCurb);

    const farSidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 2),
      new THREE.MeshStandardMaterial({ color: 0xb0b0a8, roughness: 0.9 })
    );
    farSidewalk.rotation.x = -Math.PI / 2;
    farSidewalk.position.set(0, 0.0, 19);
    this.scene.add(farSidewalk);
  }

  _buildBuildings() {
    const configs = [
      { x: -12, z: 3, w: 6, h: 5, d: 16, color: 0xc4b8a0 },
      { x: -12, z: 14, w: 6, h: 7, d: 6, color: 0xa89880 },
      { x: 12, z: 3, w: 6, h: 4, d: 16, color: 0xb8a890 },
      { x: 12, z: 14, w: 6, h: 6, d: 6, color: 0xc0b098 },
      { x: -5, z: 21, w: 8, h: 5.5, d: 4, color: 0xbbb0a0 },
      { x: 5, z: 21, w: 8, h: 7, d: 4, color: 0xa8a090 },
    ];
    for (const cfg of configs) {
      this._addBuilding(cfg.x, cfg.z, cfg.w, cfg.h, cfg.d, cfg.color);
    }
  }

  _addBuilding(x, z, w, h, d, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.set(x, h / 2, z);
    body.castShadow = true;
    this.scene.add(body);

    const winCanvas = document.createElement('canvas');
    winCanvas.width = 256;
    winCanvas.height = 256;
    const ctx = winCanvas.getContext('2d');
    const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 256, 256);
    const cols = Math.max(2, Math.floor(w / 1.5));
    const rows = Math.max(1, Math.floor(h / 1.5));
    const winW = 180 / cols;
    const winH = 180 / rows;
    for (let wy = 0; wy < rows; wy++) {
      for (let wx = 0; wx < cols; wx++) {
        const px = 30 + wx * (256 - 60) / cols;
        const py = 30 + wy * (256 - 60) / rows;
        ctx.fillStyle = '#3a5570';
        ctx.fillRect(px, py, winW * 0.7, winH * 0.7);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, winW * 0.7, winH * 0.7);
      }
    }
    const winTex = new THREE.CanvasTexture(winCanvas);
    const faceMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.85 });
    const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
    facePlane.position.set(x, h / 2, z - d / 2 - 0.01);
    this.scene.add(facePlane);
  }

  _buildStreetProps() {
    this._addStreetLamp(-4, 10.5);
    this._addStreetLamp(4, 10.5);
    this._addTree(-7, 10);
    this._addTree(7, 10);

    // Bench
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.3 });
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.4), benchMat);
    benchSeat.position.set(3, 0.55, 9);
    this.scene.add(benchSeat);
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), benchMat);
    benchBack.position.set(3, 0.85, 8.8);
    this.scene.add(benchBack);
    for (const lx of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.4), metalMat);
      leg.position.set(3 + lx, 0.275, 9);
      this.scene.add(leg);
    }

    this._addCar(5, 15, 0xc0392b);
  }

  _addStreetLamp(x, z) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.5, 8), poleMat);
    pole.position.set(x, 1.75, z);
    this.scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.04), poleMat);
    arm.position.set(x - 0.3, 3.5, z);
    this.scene.add(arm);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffee, emissive: 0xfff5d0, emissiveIntensity: 0.5,
    });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.2), lampMat);
    lamp.position.set(x - 0.6, 3.45, z);
    this.scene.add(lamp);
    const light = new THREE.PointLight(0xfff0d0, 0.6, 10);
    light.position.set(x - 0.6, 3.3, z);
    this.scene.add(light);
  }

  _addTree(x, z) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8), trunkMat);
    trunk.position.set(x, 0.6, z);
    this.scene.add(trunk);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8 });
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), canopyMat);
    canopy.position.set(x, 1.6, z);
    this.scene.add(canopy);
    const canopy2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), canopyMat);
    canopy2.position.set(x + 0.2, 1.9, z - 0.15);
    this.scene.add(canopy2);
  }

  _addCar(x, z, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.9), bodyMat);
    body.position.set(x, 0.45, z);
    this.scene.add(body);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.2 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.8), cabinMat);
    cabin.position.set(x, 0.9, z);
    this.scene.add(cabin);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
    for (const wp of [[x - 0.6, 0.15, z + 0.45], [x + 0.6, 0.15, z + 0.45], [x - 0.6, 0.15, z - 0.45], [x + 0.6, 0.15, z - 0.45]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(...wp);
      wheel.rotation.x = Math.PI / 2;
      this.scene.add(wheel);
    }
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.4 });
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.35), glassMat);
    windshield.position.set(x + 0.51, 0.85, z);
    windshield.rotation.y = Math.PI / 2;
    this.scene.add(windshield);
  }
}
