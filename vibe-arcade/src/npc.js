import * as THREE from 'three';
import { getRandomName } from './npc-names.js';

const SKIN_TONES = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
const SHIRT_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf39c12, 0x1abc9c, 0xe67e22, 0x2c3e50, 0xd35400, 0x7f8c8d];
const PANTS_COLORS = [0x2c3e50, 0x34495e, 0x1a1a2e, 0x3d3d3d];
const HAT_TYPES = ['none', 'none', 'none', 'cap', 'flatHair', 'tallHair'];

const WALK_SPEED = 1.8;

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

export { STATES };

export class NPC {
  constructor(id, spawnPos, personality, partnerId = null) {
    this.id = id;
    this.state = STATES.SPAWNING;
    this.personality = personality; // { patience, generosity, standards }
    this.partnerId = partnerId;
    this.name = getRandomName();
    this.skills = this._generateSkills(); // per-genre skills 1-10
    this.targetMachine = null;
    this.walkQueue = [];
    this.stateTimer = 0;
    this.playDuration = 15 + Math.random() * 15; // 15–30s
    this.browseCount = 0;
    this.rating = null;
    this.dead = false;
    this.gameRunner = null; // NpcGameRunner instance while playing

    this.emoticonSprite = null;
    this.emoticonTimer = 0;

    this._animTime = 0;

    this.group = new THREE.Group();
    this.group.position.copy(spawnPos);
    this.group.scale.setScalar(1.5);

    this.parts = {};
    this._buildModel();
  }

  _generateSkills() {
    const genres = ['platformer', 'shooter', 'puzzle', 'runner', 'dodge'];
    const skills = {};
    for (const g of genres) {
      // Gaussian-ish: center 5, most 3-7, rare 1-2 or 9-10
      const raw = 5 + (Math.random() + Math.random() + Math.random() - 1.5) * 2.7;
      skills[g] = Math.max(1, Math.min(10, Math.round(raw)));
    }
    return skills;
  }

  getSkillForGenre(genre) {
    return this.skills[genre] || 5;
  }

  getSkillNormalized(genre) {
    return this.getSkillForGenre(genre) / 10;
  }

  _buildModel() {
    const skinColor = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const shirtColor = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    const pantsColor = PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)];
    const hatType = HAT_TYPES[Math.floor(Math.random() * HAT_TYPES.length)];

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, transparent: true });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7, transparent: true });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8, transparent: true });
    this._allMats = [skinMat, shirtMat, pantsMat];

    // === HEAD (0.2 x 0.2 x 0.2) ===
    const headGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const head = new THREE.Mesh(headGeo, skinMat);
    // Body top is at y=0.35/2 = 0.175, then head sits at 0.175 + 0.2/2 = 0.275 above body pivot
    // We'll root everything at feet level (y=0)
    // Body center: y = 0.35/2 = 0.175
    // Head center: y = 0.35 + 0.2/2 = 0.45
    head.position.set(0, 0.8, 0);
    head.castShadow = true;
    this.group.add(head);
    this.parts.head = head;

    // === BODY (0.3 x 0.35 x 0.18) ===
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.35, 0.18);
    const body = new THREE.Mesh(bodyGeo, shirtMat);
    // Body pivot at center, center y = 0.175
    body.position.set(0, 0.525, 0);
    body.castShadow = true;
    this.group.add(body);
    this.parts.body = body;

    // === LEGS (0.1 x 0.35 x 0.1 each) ===
    // Legs hang from body bottom. Body bottom = 0. Leg pivot at their top so rotation works naturally.
    // We'll use a pivot group for each leg to allow hip rotation.
    const legGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);

    // Left leg pivot at hip (body bottom = 0, shifted left)
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.08, 0.35, 0);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(0, -0.175, 0); // hang down from pivot
    leftLeg.castShadow = true;
    leftLegPivot.add(leftLeg);
    this.group.add(leftLegPivot);
    this.parts.leftLegPivot = leftLegPivot;

    // Right leg pivot
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.08, 0.35, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0, -0.175, 0);
    rightLeg.castShadow = true;
    rightLegPivot.add(rightLeg);
    this.group.add(rightLegPivot);
    this.parts.rightLegPivot = rightLegPivot;

    // === ARMS (0.08 x 0.3 x 0.08 each) ===
    // Arms hang from shoulder level (body top = 0.35, center y = 0.35 - 0.3/2 = 0.2)
    const armGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);

    // Left arm pivot at shoulder
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.19, 0.7, 0);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(0, -0.15, 0);
    leftArm.castShadow = true;
    leftArmPivot.add(leftArm);
    this.group.add(leftArmPivot);
    this.parts.leftArmPivot = leftArmPivot;

    // Right arm pivot at shoulder
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.19, 0.7, 0);
    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0, -0.15, 0);
    rightArm.castShadow = true;
    rightArmPivot.add(rightArm);
    this.group.add(rightArmPivot);
    this.parts.rightArmPivot = rightArmPivot;

    // === HAT / HAIR ===
    if (hatType === 'cap') {
      const capColor = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
      const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.6 });
      // Brim
      const brimGeo = new THREE.BoxGeometry(0.24, 0.03, 0.26);
      const brim = new THREE.Mesh(brimGeo, capMat);
      brim.position.set(0, 0.905, 0.02);
      this.group.add(brim);
      // Crown
      const crownGeo = new THREE.BoxGeometry(0.2, 0.1, 0.2);
      const crown = new THREE.Mesh(crownGeo, capMat);
      crown.position.set(0, 0.955, -0.01);
      this.group.add(crown);
      this.parts.hat = crown;
    } else if (hatType === 'flatHair') {
      const hairColor = [0x2c1810, 0x4a2c11, 0xf4c842, 0xe8432d, 0x1a1a1a][Math.floor(Math.random() * 5)];
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
      const hairGeo = new THREE.BoxGeometry(0.22, 0.05, 0.22);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.915, 0);
      this.group.add(hair);
      this.parts.hat = hair;
    } else if (hatType === 'tallHair') {
      const hairColor = [0x2c1810, 0x4a2c11, 0xf4c842, 0xe8432d, 0x1a1a1a][Math.floor(Math.random() * 5)];
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
      const hairGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.975, 0);
      this.group.add(hair);
      this.parts.hat = hair;
    }
  }

  animate(dt) {
    this._animTime += dt;
    const t = this._animTime;

    const isWalking =
      this.state === STATES.SPAWNING ||
      this.state === STATES.ENTERING ||
      this.state === STATES.WALKING_TO_MACHINE ||
      this.state === STATES.BROWSING ||
      this.state === STATES.LEAVING ||
      this.state === STATES.DESPAWNING;

    // Reset transforms each frame (we set absolute values)
    this.parts.leftLegPivot.rotation.x = 0;
    this.parts.rightLegPivot.rotation.x = 0;
    this.parts.leftArmPivot.rotation.x = 0;
    this.parts.rightArmPivot.rotation.x = 0;
    this.parts.leftArmPivot.rotation.z = 0;
    this.parts.rightArmPivot.rotation.z = 0;
    this.parts.head.rotation.y = 0;
    this.parts.head.rotation.x = 0;
    this.parts.body.rotation.z = 0;
    this.parts.body.position.y = 0.525;

    // Track actual movement to detect being stuck
    const px = this.group.position.x;
    const pz = this.group.position.z;
    if (!this._lastPos) this._lastPos = { x: px, z: pz };
    const moved = Math.abs(px - this._lastPos.x) + Math.abs(pz - this._lastPos.z);
    this._lastPos.x = px;
    this._lastPos.z = pz;
    const actuallyMoving = moved > 0.001;

    if (isWalking && this.walkQueue.length > 0 && actuallyMoving) {
      // Leg swing
      const swing = Math.sin(t * 8) * 0.45;
      this.parts.leftLegPivot.rotation.x = swing;
      this.parts.rightLegPivot.rotation.x = -swing;
      // Arm swing (opposite to legs)
      this.parts.leftArmPivot.rotation.x = -swing * 0.6;
      this.parts.rightArmPivot.rotation.x = swing * 0.6;
      // Body bob
      const bob = Math.abs(Math.sin(t * 8)) * 0.015;
      this.parts.body.position.y = 0.525 + bob;
      this.parts.head.position.y = 0.8 + bob;
    } else if (this.state === STATES.PLAYING) {
      // Arms forward (holding joystick/buttons)
      this.parts.leftArmPivot.rotation.x = -0.8;
      this.parts.rightArmPivot.rotation.x = -0.8;
      // Slight arm spread
      this.parts.leftArmPivot.rotation.z = 0.15;
      this.parts.rightArmPivot.rotation.z = -0.15;
      // Head bobs with excitement
      const headBob = Math.sin(t * 5) * 0.04;
      this.parts.head.position.y = 0.8 + headBob;
      this.parts.body.position.y = 0.525 + Math.abs(Math.sin(t * 5)) * 0.01;
    } else if (this.state === STATES.WATCHING) {
      // Head turns left/right, slight lean
      this.parts.head.rotation.y = Math.sin(t * 1.5) * 0.3;
      this.parts.head.rotation.x = -0.05 + Math.sin(t * 0.8) * 0.05;
      this.parts.body.rotation.z = Math.sin(t * 0.7) * 0.03;
    } else {
      // Idle: minimal head sway
      this.parts.head.rotation.y = Math.sin(t * 0.8) * 0.08;
      this.parts.body.rotation.z = Math.sin(t * 0.6) * 0.015;
    }

    // Emoticon: float up and fade out
    if (this.emoticonSprite && this.emoticonTimer > 0) {
      this.emoticonTimer -= dt;
      const progress = this.emoticonTimer / 2.5; // 0 = expired, 1 = fresh
      // Float upward as it fades
      this.emoticonSprite.position.y = 1.15 + (1 - progress) * 0.3;
      this.emoticonSprite.material.opacity = Math.max(0, progress);
      if (this.emoticonTimer <= 0) {
        this.group.remove(this.emoticonSprite);
        this.emoticonSprite.material.dispose();
        this.emoticonSprite.material.map.dispose();
        this.emoticonSprite = null;
      }
    }
  }

  updateGhosting(allNpcs) {
    // When close to another NPC, become semi-transparent (ghost through)
    let minDist = Infinity;
    const pos = this.group.position;
    for (const other of allNpcs) {
      if (other === this) continue;
      const dx = pos.x - other.group.position.x;
      const dz = pos.z - other.group.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) minDist = d;
    }

    // Fade to 0.4 opacity when overlapping, full opacity when > 1.5 apart
    const ghostDist = 1.5;
    const targetOpacity = minDist < ghostDist ? 0.4 + 0.6 * (minDist / ghostDist) : 1.0;

    // Smooth transition
    this._opacity = this._opacity || 1.0;
    this._opacity += (targetOpacity - this._opacity) * 0.1;

    if (this._allMats) {
      for (const mat of this._allMats) {
        mat.opacity = this._opacity;
      }
    }
  }

  moveToward(dt) {
    if (this.walkQueue.length === 0) return true;

    const target = this.walkQueue[0];
    const pos = this.group.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.15) {
      this.group.position.x = target.x;
      this.group.position.z = target.z;
      if (target.y !== undefined) this.group.position.y = target.y;
      this.walkQueue.shift();
      return this.walkQueue.length === 0;
    }

    // Face movement direction
    this.group.rotation.y = Math.atan2(dx, dz);

    // Step toward target
    const step = Math.min(WALK_SPEED * dt, dist);
    this.group.position.x += (dx / dist) * step;
    this.group.position.z += (dz / dist) * step;

    return false;
  }

  showEmoticon(text) {
    // Remove any existing emoticon
    if (this.emoticonSprite) {
      this.group.remove(this.emoticonSprite);
      this.emoticonSprite.material.dispose();
      this.emoticonSprite.material.map.dispose();
      this.emoticonSprite = null;
    }

    // Determine if this is a short emoji or longer text
    const isLongText = text.length > 3;

    const canvasW = isLongText ? 256 : 64;
    const canvasH = isLongText ? 64 : 64;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Background bubble
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    if (isLongText) {
      ctx.roundRect(4, 4, canvasW - 8, canvasH - 16, 10);
    } else {
      ctx.roundRect(4, 4, 56, 48, 8);
    }
    ctx.fill();

    // Text
    if (isLongText) {
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#222';
      ctx.fillText(text, canvasW / 2, canvasH / 2 - 4);
    } else {
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 28);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 1.15, 0);
    if (isLongText) {
      sprite.scale.set(0.6, 0.2, 1);
    } else {
      sprite.scale.set(0.3, 0.3, 0.3);
    }

    this.group.add(sprite);
    this.emoticonSprite = sprite;
    this.emoticonTimer = 2.5;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    if (this.emoticonSprite) {
      if (this.emoticonSprite.material.map) this.emoticonSprite.material.map.dispose();
      this.emoticonSprite.material.dispose();
      this.emoticonSprite = null;
    }
  }
}
