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
    this.machines = machines;
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
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      if (this.npcs[i].dead) {
        this._removeNpc(this.npcs[i]);
        this.npcs.splice(i, 1);
      }
    }
  }

  _updateSpawner(dt) {
    if (!this.reputation.hasActiveGames(this.machines)) return;
    if (this.npcs.length >= this.reputation.getMaxNpcs()) return;
    this.spawnTimer += dt;
    this.pairCooldown -= dt;
    const interval = this.reputation.getSpawnInterval();
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      const isPair = this.pairCooldown <= 0 && Math.random() < 0.2 &&
        this.npcs.length + 2 <= this.reputation.getMaxNpcs();
      if (isPair) {
        this._spawnPair();
        this.pairCooldown = 15;
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
    npc.walkQueue = [new THREE.Vector3(spawnX, 0, 13), WAYPOINTS.DOOR.clone(), WAYPOINTS.ENTRY.clone()];
    this.npcs.push(npc);
    this.scene.add(npc.group);
  }

  _spawnPair() {
    const baseX = -1 + Math.random() * 2;
    const id1 = nextNpcId++;
    const id2 = nextNpcId++;
    const pos1 = new THREE.Vector3(baseX - 0.4, 0, 13);
    const pos2 = new THREE.Vector3(baseX + 0.4, 0, 13);
    const npc1 = new NPC(id1, pos1, this._randomPersonality(), id2);
    const npc2 = new NPC(id2, pos2, this._randomPersonality(), id1);
    npc1.walkQueue = [pos1.clone(), WAYPOINTS.DOOR.clone().add(new THREE.Vector3(-0.4, 0, 0)), WAYPOINTS.ENTRY.clone().add(new THREE.Vector3(-0.4, 0, 0))];
    npc2.walkQueue = [pos2.clone(), WAYPOINTS.DOOR.clone().add(new THREE.Vector3(0.4, 0, 0)), WAYPOINTS.ENTRY.clone().add(new THREE.Vector3(0.4, 0, 0))];
    this.npcs.push(npc1, npc2);
    this.scene.add(npc1.group);
    this.scene.add(npc2.group);
  }

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
          if (machine.npcOccupant && machine.npcOccupant !== npc) {
            if (Math.random() < 0.5) {
              npc.state = STATES.WATCHING;
              npc.stateTimer = 8 + Math.random() * 10;
            } else {
              npc.state = STATES.WAITING;
              npc.stateTimer = npc.personality.patience * 10;
            }
          } else if (machine.state === 'playing') {
            npc.state = STATES.WATCHING;
            npc.stateTimer = 8 + Math.random() * 10;
          } else {
            this._startPlaying(npc, machine);
          }
        }
        break;

      case STATES.WAITING:
        npc.stateTimer -= dt;
        if (npc.stateTimer <= 0) {
          npc.targetMachine = null;
          if (Math.random() < 0.4) {
            npc.state = STATES.CHOOSING;
          } else {
            this._startLeaving(npc);
          }
        } else {
          const machine = npc.targetMachine;
          if (machine && !machine.npcOccupant && machine.state === 'ready') {
            this._startPlaying(npc, machine);
          }
        }
        break;

      case STATES.WATCHING:
        npc.stateTimer -= dt;
        if (Math.random() < dt * 0.3) {
          npc.showEmoticon(['!', '!!', '😮', '👀'][Math.floor(Math.random() * 4)]);
        }
        if (npc.stateTimer <= 0) {
          const machine = npc.targetMachine;
          if (machine && !machine.npcOccupant && machine.state === 'ready') {
            this._startPlaying(npc, machine);
          } else if (npc.partnerId) {
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
          if (npc.partnerId) {
            const partner = this.npcs.find(n => n.id === npc.partnerId);
            if (partner && partner.state === STATES.WATCHING && npc.targetMachine) {
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

    const totalWeight = candidates.reduce((sum, c) => sum + c.rating, 0);
    let roll = Math.random() * totalWeight;
    let chosen = candidates[0];
    for (const c of candidates) {
      roll -= c.rating;
      if (roll <= 0) { chosen = c; break; }
    }

    npc.targetMachine = chosen.machine;
    npc.state = STATES.WALKING_TO_MACHINE;

    const machinePos = chosen.machine.group.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(chosen.machine.group.quaternion);

    if (chosen.occupied) {
      const watchPos = machinePos.clone()
        .add(forward.clone().multiplyScalar(1.8))
        .add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, 0));
      npc.walkQueue = [watchPos];
    } else {
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
    this._drawNpcPlayingScreen(machine);

    const dir = new THREE.Vector3().subVectors(machine.group.position, npc.group.position);
    dir.y = 0;
    if (dir.length() > 0.01) {
      npc.group.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  _finishPlaying(npc) {
    const machine = npc.targetMachine;
    if (!machine) { this._startLeaving(npc); return; }

    machine.npcOccupant = null;
    machine.state = 'ready';
    machine.drawReady();

    const saved = this.gameState.machines[machine.index];
    const avgStars = saved ? ((saved.cardStars?.genre || 1) + (saved.cardStars?.theme || 1)) / 2 : 1;
    const rating = this.reputation.calculateRating(npc.personality.standards, avgStars);
    npc.rating = rating;

    this.reputation.addRating(machine.index, rating);

    const coins = this.reputation.calculatePayment(npc.personality.generosity, rating);
    this.gameState.coins += coins;
    this.gameState.totalNpcCoinsEarned = (this.gameState.totalNpcCoinsEarned || 0) + coins;
    this.save();

    if (rating >= 5) npc.showEmoticon('🤩');
    else if (rating >= 4) npc.showEmoticon('⭐');
    else if (rating >= 3) npc.showEmoticon('👍');
    else if (rating >= 2) npc.showEmoticon('😐');
    else npc.showEmoticon('😡');

    npc.state = STATES.RATING;
    npc.stateTimer = 2.5;
  }

  _startLeaving(npc) {
    npc.state = STATES.LEAVING;
    npc.targetMachine = null;
    npc.walkQueue = [WAYPOINTS.ENTRY.clone(), WAYPOINTS.DOOR.clone()];

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
    ctx.font = '48px Arial';
    ctx.fillText('🎮', 400, 400);
    machine.screenTexture.needsUpdate = true;
  }

  _removeNpc(npc) {
    this.scene.remove(npc.group);
    if (npc.targetMachine && npc.targetMachine.npcOccupant === npc) {
      npc.targetMachine.npcOccupant = null;
      if (npc.targetMachine.state === 'occupied_npc') {
        npc.targetMachine.state = 'ready';
        npc.targetMachine.drawReady();
      }
    }
    npc.dispose();
  }

  getNpcCount() {
    return this.npcs.length;
  }
}
