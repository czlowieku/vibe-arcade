import * as THREE from 'three';
import { NPC, STATES } from './npc.js';
import { NpcGameRunner } from './npc-game-runner.js';
import { getApiKey } from './storage.js';

const COMMENTARY_GOOD = [
  'NAKURWIAM!!!',
  'SUPER GIERKA!',
  'EZ GG',
  'JESTEM BOGIEM',
  'O KURDE JAK JADE!',
];

const COMMENTARY_BAD = [
  'ee nudne...',
  'znowu to samo',
  'nie kumam',
  'meh...',
  'kiedy koniec?',
];

const COMMENTARY_NEUTRAL = [
  'hmm...',
  'no no no',
  'ciekawe',
  'ok ok',
];

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

        // Update game runner if active
        if (npc.gameRunner && npc.gameRunner.running) {
          npc.gameRunner.update(dt, npc.targetMachine);
        } else if (npc.targetMachine) {
          // Fallback animated screen if runner crashed or missing
          npc._simScoreTimer = (npc._simScoreTimer || 0) + dt;
          if (npc._simScoreTimer > 0.5) {
            npc._simScoreTimer = 0;
            const skill = npc._simSkill || 5;
            const baseGain = skill * 8;
            const gain = Math.floor(baseGain + (Math.random() - 0.3) * baseGain);
            npc._simScore = (npc._simScore || 0) + Math.max(0, gain);
            npc._scoreRate = gain;
          }
          this._drawNpcPlayingAnimated(npc, npc.targetMachine);
        }

        // Check if game ended on its own
        if (npc.gameRunner && npc.gameRunner.gameOver) {
          this._finishPlaying(npc);
          break;
        }

        // Commentary thought bubbles every 4-8 seconds
        if (!npc._commentaryTimer) npc._commentaryTimer = 4 + Math.random() * 4;
        npc._commentaryTimer -= dt;
        if (npc._commentaryTimer <= 0) {
          npc._commentaryTimer = 4 + Math.random() * 4;
          this._showCommentary(npc);
        }

        // Time's up — force finish
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
    npc._commentaryTimer = 4 + Math.random() * 4;
    npc._lastScore = 0;
    npc._scoreRate = 0;
    machine.npcOccupant = npc;
    machine.state = 'occupied_npc';

    const dir = new THREE.Vector3().subVectors(machine.group.position, npc.group.position);
    dir.y = 0;
    if (dir.length() > 0.01) {
      npc.group.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Run the actual game via iframe-isolated runner
    const saved = this.gameState.machines[machine.index];
    const genre = saved?.genre || 'platformer';
    const skillLevel = npc.getSkillForGenre(genre);
    npc._simScore = 0;
    npc._simSkill = skillLevel;
    npc._simScoreTimer = 0;

    if (machine.gameCode) {
      const runner = new NpcGameRunner();
      npc.gameRunner = runner;
      const skillNorm = npc.getSkillNormalized(genre);
      runner.start(
        machine.gameCode,
        skillNorm,
        (points, totalScore) => {
          npc._simScore = totalScore;
          npc._scoreRate = totalScore - (npc._lastScore || 0);
          npc._lastScore = totalScore;
        },
        (finalScore) => {
          npc._simScore = finalScore;
        }
      );
    } else {
      npc.gameRunner = null;
    }
  }

  _finishPlaying(npc) {
    const machine = npc.targetMachine;
    if (!machine) { this._startLeaving(npc); return; }

    // Use runner score if available, else simulated
    let gameScore = npc._simScore || 0;
    if (npc.gameRunner) {
      gameScore = npc.gameRunner.score || gameScore;
      npc.gameRunner.stop();
      npc.gameRunner = null;
    }

    machine.npcOccupant = null;
    machine.state = 'ready';
    machine.drawReady();

    const saved = this.gameState.machines[machine.index];
    const rating = this._scoreToRating(gameScore, npc.personality.standards);
    npc.rating = rating;

    this.reputation.addRating(machine.index, rating);

    const coins = this.reputation.calculatePayment(npc.personality.generosity, rating);
    this.gameState.coins += coins;
    this.gameState.totalNpcCoinsEarned = (this.gameState.totalNpcCoinsEarned || 0) + coins;
    this.save();

    // Record to history
    const genre = saved?.genre || 'platformer';
    const historyEntry = {
      npcName: npc.name || 'NPC',
      gameTitle: machine.gameTitle || 'Unknown',
      machineType: 'arcade',
      machineIndex: machine.index,
      score: gameScore,
      rating: rating,
      skill: npc.getSkillForGenre ? npc.getSkillForGenre(genre) : 5,
      timestamp: Date.now(),
    };
    if (!this.gameState.npcHistory) this.gameState.npcHistory = [];
    this.gameState.npcHistory.push(historyEntry);
    if (this.gameState.npcHistory.length > 50) {
      this.gameState.npcHistory = this.gameState.npcHistory.slice(-50);
    }
    this.save();

    // Fire-and-forget async AI review
    console.log(`[review] _finishPlaying done for machine ${machine.index}, gameCode: ${!!machine.gameCode}, apiKey: ${!!getApiKey()}`);
    if (machine.gameCode) {
      this._callReview(machine, gameScore, npc._crashCount || 0).then(review => {
        if (!review) return;

        // Blend rating: 40% score, 60% AI
        const blended = Math.round(0.4 * rating + 0.6 * review.rating);
        const finalRating = Math.max(1, Math.min(5, blended));

        // Update reputation with blended (replaces the immediate one)
        this.reputation.addRating(machine.index, finalRating);

        // Store suggestions
        if (review.suggestions && review.suggestions.length > 0) {
          if (!machine.suggestions) machine.suggestions = [];
          for (const s of review.suggestions) {
            if (!machine.suggestions.includes(s)) machine.suggestions.push(s);
          }
          if (machine.suggestions.length > 5) machine.suggestions = machine.suggestions.slice(-5);
          const saved = this.gameState.machines[machine.index];
          if (saved) {
            saved.suggestions = machine.suggestions;
            this.save();
          }
        }

        // Track broken games
        if (review.isBroken || (npc._crashCount || 0) > 0) {
          machine.brokenCount = (machine.brokenCount || 0) + 1;
          machine.regenAttempts = machine.regenAttempts || 0;
          const saved = this.gameState.machines[machine.index];
          if (saved) {
            saved.brokenCount = machine.brokenCount;
            saved.regenAttempts = machine.regenAttempts;
          }
          this.save();

          if (machine.brokenCount >= 2 && saved?.recipe) {
            if (machine.regenAttempts < 2) {
              // Try to regenerate
              machine.regenAttempts++;
              machine.brokenCount = 0;
              if (saved) {
                saved.brokenCount = 0;
                saved.regenAttempts = machine.regenAttempts;
              }
              this.save();
              console.log(`Auto-regenerating broken game on machine ${machine.index} (attempt ${machine.regenAttempts}/2)`);
              this._autoRegenerate(machine, saved.recipe, review.feedback);
            } else {
              // Give up — mark machine as broken, NPCs skip it
              console.log(`Machine ${machine.index} permanently broken after 2 regen attempts`);
              machine.state = 'broken';
              if (saved) saved.broken = true;
              this.save();
              machine.drawBroken();
            }
          }
        }

        // Update history with AI feedback
        if (this.gameState.npcHistory) {
          const lastEntry = [...this.gameState.npcHistory].reverse().find(
            e => e.machineIndex === machine.index
          );
          if (lastEntry) {
            lastEntry.rating = finalRating;
            lastEntry.aiFeedback = review.feedback;
            this.save();
          }
        }
      });
    }

    if (rating >= 5) npc.showEmoticon('🤩');
    else if (rating >= 4) npc.showEmoticon('⭐');
    else if (rating >= 3) npc.showEmoticon('👍');
    else if (rating >= 2) npc.showEmoticon('😐');
    else npc.showEmoticon('😡');

    npc.state = STATES.RATING;
    npc.stateTimer = 2.5;
  }

  _scoreToRating(score, standards) {
    // Map game score to base star rating
    let baseRating;
    if (score >= 500) {
      baseRating = 4 + Math.random();        // 4-5
    } else if (score >= 200) {
      baseRating = 3 + Math.random();        // 3-4
    } else if (score >= 50) {
      baseRating = 2 + Math.random();        // 2-3
    } else {
      baseRating = 1 + Math.random();        // 1-2
    }

    // Modulate by NPC standards (high standards = slightly harsher)
    const standardsModifier = (standards - 0.5) * 0.8;
    const finalRating = baseRating - standardsModifier;
    return Math.max(1, Math.min(5, Math.round(finalRating)));
  }

  async _callReview(machine, gameScore, crashCount) {
    const apiKey = getApiKey();
    if (!apiKey) { console.warn('[review] No API key set — skipping review'); return null; }
    if (!machine.gameCode) { console.warn('[review] No game code — skipping review'); return null; }
    console.log(`[review] Reviewing machine ${machine.index}, score: ${gameScore}`);

    const saved = this.gameState.machines[machine.index];
    try {
      const resp = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          gameCode: machine.gameCode,
          genre: saved?.recipe?.genre || 'unknown',
          theme: saved?.recipe?.theme || 'unknown',
          modifier: saved?.recipe?.modifier || null,
          npcScore: gameScore,
        }),
      });
      if (!resp.ok) { console.warn('[review] API returned', resp.status); return null; }
      const result = await resp.json();
      console.log('[review] Result:', result);
      return result;
    } catch (e) {
      console.error('Review API error:', e);
      return null;
    }
  }

  _autoRegenerate(machine, recipe, feedback) {
    const apiKey = getApiKey();
    if (!apiKey) return;

    const extraInstructions = `CRITICAL: The previous version of this game was broken/unplayable. Issue: ${feedback || 'game crashes or freezes'}. Generate a WORKING version. Test your logic carefully.`;

    machine.state = 'generating';
    machine.streamedCode = '';

    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        genre: recipe.genre,
        theme: recipe.theme,
        modifier: recipe.modifier,
        cardLevels: recipe.cardLevels || { genre: 1, theme: 1, modifier: 0 },
        extraInstructions,
        apiKey,
      }),
    }).then(async response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === 'done') {
            machine.setGame(data.gameCode, data.title, data.description);
            const saved = this.gameState.machines[machine.index];
            if (saved) {
              saved.gameCode = data.gameCode;
              saved.title = data.title;
              saved.description = data.description;
              saved.brokenCount = 0;
              saved.suggestions = [];
            }
            machine.suggestions = [];
            machine.brokenCount = 0;
            this.save();
          }
        }
      }
    }).catch(err => {
      console.error('Auto-regen failed:', err);
      machine.state = 'ready';
      machine.drawReady();
    });
  }

  _showCommentary(npc) {
    const score = npc.gameRunner ? npc.gameRunner.score : 0;
    const scoreRate = npc._scoreRate || 0;

    let pool;
    if (score > 100 || scoreRate > 20) {
      pool = COMMENTARY_GOOD;
    } else if (score < 20 && npc.stateTimer < npc.playDuration * 0.5) {
      pool = COMMENTARY_BAD;
    } else {
      pool = COMMENTARY_NEUTRAL;
    }

    const line = pool[Math.floor(Math.random() * pool.length)];
    npc.showEmoticon(line);
    // Reset score rate tracking after commentary
    npc._scoreRate = 0;
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
    this._drawNpcPlayingAnimated(null, machine);
  }

  _drawNpcPlayingAnimated(npc, machine) {
    const ctx = machine.screenCtx;
    const t = Date.now() / 1000;
    const score = npc ? (npc._simScore || 0) : 0;
    const skill = npc ? (npc._simSkill || 5) : 5;
    const name = npc ? (npc.name || 'NPC') : 'NPC';

    // Dark background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, 800, 600);

    // Scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    for (let y = 0; y < 600; y += 3) ctx.fillRect(0, y, 800, 1);

    // Game title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(machine.gameTitle || 'MINI GAME', 400, 50);

    // Animated "game" visualization — bouncing dots representing gameplay
    ctx.save();
    for (let i = 0; i < 6 + skill; i++) {
      const x = 100 + ((i * 137 + t * (80 + skill * 15)) % 600);
      const y = 150 + Math.sin(t * (2 + i * 0.5) + i * 1.7) * 100 + Math.cos(t * 1.3 + i) * 50;
      const r = 4 + Math.sin(t * 3 + i) * 2;
      const hue = (i * 40 + t * 30) % 360;
      ctx.fillStyle = 'hsl(' + hue + ', 80%, 60%)';
      ctx.beginPath();
      ctx.arc(x, Math.max(120, Math.min(420, y)), r, 0, Math.PI * 2);
      ctx.fill();
    }
    // "Player" cursor controlled by NPC
    const px = 400 + Math.sin(t * (1 + skill * 0.3)) * (150 + skill * 15);
    const py = 350 + Math.cos(t * (0.8 + skill * 0.2)) * 60;
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(79,195,247,0.3)';
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Score display
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(score.toLocaleString(), 760, 50);

    // Player name and skill
    ctx.fillStyle = '#888';
    ctx.font = '16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name + ' (skill ' + skill + '/10)', 40, 580);

    // NOW PLAYING badge
    ctx.fillStyle = 'rgba(79,195,247,0.15)';
    ctx.fillRect(300, 460, 200, 36);
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOW PLAYING', 400, 483);

    machine.screenTexture.needsUpdate = true;
  }

  _removeNpc(npc) {
    this.scene.remove(npc.group);
    // Clean up game runner if still active
    if (npc.gameRunner) {
      npc.gameRunner.stop();
      npc.gameRunner = null;
    }
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
