import * as THREE from 'three';
import { ArcadeRoom } from './arcade-room.js';
import { CameraController } from './camera.js';
import { CardUI } from './card-ui.js';
import { GameManager } from './game-manager.js';
import { HUD } from './hud.js';
import { Reputation } from './reputation.js';
import { NpcManager } from './npc-manager.js';
import { loadState, saveState, getApiKey } from './storage.js';
import { getStarterPack, getCardById, CARDS } from './card-system.js';
import { Exterior } from './exterior.js';
import { PinballTable } from './pinball-table.js';

// --- Prompt Panel ---
let pendingRecipe = null;

const GENRE_DESC = {
  platformer: 'side-scrolling platformer — jump between platforms, avoid hazards',
  shooter: 'top-down or side shooter — fire at enemies in waves',
  puzzle: 'puzzle game — matching, sorting, or pattern logic',
  runner: 'endless runner — auto-move forward, dodge obstacles',
  dodge: 'dodge game — avoid falling/flying obstacles, survive',
  'pinball-classic': 'classic pinball — 3 balls, bumpers, ramps, standard scoring',
  'pinball-roguelike': 'roguelike pinball — layout randomizes on ball loss, difficulty scales',
  'pinball-hyper': 'hyper pinball — 2x gravity, 3x scoring, extremely fast ball',
  'pinball-multiball': 'multiball pinball — starts with 2 balls, new ball every 30s, max 5',
};
const THEME_DESC = {
  neon: 'neon cyberpunk — glowing outlines, dark bg, cyan/magenta/yellow',
  space: 'deep space — starfield, planets, asteroids',
  retro: '8-bit retro pixel — chunky shapes, limited palette',
  ocean: 'underwater ocean — blue-green, bubbles, fish, coral',
  forest: 'enchanted forest — greens, browns, magical sparkles',
};
const MODIFIER_DESC = {
  'speed-up': 'gets faster over time',
  'gravity-flip': 'press key to reverse gravity',
  'time-limit': '60-second countdown',
  boss: 'boss enemy appears after 30s',
  powerups: 'random power-ups spawn',
};

function showPromptPanel(recipe) {
  const genre = getCardById(recipe.genre.cardId);
  const theme = getCardById(recipe.theme.cardId);
  const modifier = recipe.modifier ? getCardById(recipe.modifier.cardId) : null;

  const summaryEl = document.getElementById('prompt-summary');
  summaryEl.textContent = '';

  const addLine = (label, tag, cls, desc) => {
    const p = document.createElement('p');
    p.style.margin = '6px 0';
    const b = document.createElement('span');
    b.textContent = label + ': ';
    b.style.color = '#888';
    const t = document.createElement('span');
    t.className = 'tag ' + cls;
    t.textContent = tag;
    const d = document.createElement('span');
    d.textContent = ' — ' + desc;
    d.style.color = '#999';
    p.appendChild(b);
    p.appendChild(t);
    p.appendChild(d);
    summaryEl.appendChild(p);
  };

  addLine('Genre', genre.icon + ' ' + genre.name, 'tag-genre', GENRE_DESC[genre.id] || genre.id);
  addLine('Theme', theme.icon + ' ' + theme.name, 'tag-theme', THEME_DESC[theme.id] || theme.id);
  if (modifier) {
    addLine('Modifier', modifier.icon + ' ' + modifier.name, 'tag-modifier', MODIFIER_DESC[modifier.id] || modifier.id);
  }

  const starsNote = document.createElement('p');
  starsNote.style.cssText = 'margin-top:12px;color:#666;font-size:12px;';
  starsNote.textContent = `Card levels: genre ★${recipe.genre.stars} | theme ★${recipe.theme.stars}${recipe.modifier ? ` | modifier ★${recipe.modifier.stars}` : ''}`;
  summaryEl.appendChild(starsNote);

  document.getElementById('prompt-extra').value = '';
  document.getElementById('prompt-panel').classList.remove('hidden');
}

document.getElementById('btn-start-coding').addEventListener('click', () => {
  if (!activeMachine || !pendingRecipe) return;
  const extra = document.getElementById('prompt-extra').value.trim();
  document.getElementById('prompt-panel').classList.add('hidden');

  const genreCard = getCardById(pendingRecipe.genre.cardId);
  const isPinball = genreCard && genreCard.id.startsWith('pinball-');

  if (isPinball && activeMachine && activeMachine.buildFromConfig) {
    // Pinball generation flow
    activeMachine.state = 'generating';

    const themeCard = getCardById(pendingRecipe.theme.cardId);
    const modifierCard = pendingRecipe.modifier ? getCardById(pendingRecipe.modifier.cardId) : null;

    fetch('/api/generate-pinball', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        genre: genreCard.id,
        theme: themeCard.id,
        modifier: modifierCard ? modifierCard.id : null,
        cardLevels: {
          genre: pendingRecipe.genre.stars,
          theme: pendingRecipe.theme.stars,
          modifier: pendingRecipe.modifier ? pendingRecipe.modifier.stars : 0,
        },
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
            activeMachine.buildFromConfig(data.config);
          }
        }
      }
    }).catch(err => {
      console.error('Pinball generation failed:', err);
      activeMachine.state = 'empty';
    });

    cameraCtrl.zoomTo(activeMachine);
    hud.showBackButton();
    pendingRecipe = null;
    return;
  }

  gameManager.generateGame(activeMachine, pendingRecipe, extra);
  cameraCtrl.zoomTo(activeMachine);
  hud.showBackButton();
  pendingRecipe = null;
});

document.getElementById('btn-prompt-back').addEventListener('click', () => {
  document.getElementById('prompt-panel').classList.add('hidden');
  cardUI.show(); // go back to card selection
});

// --- State ---
const gameState = loadState();

// First time? Give starter pack
if (gameState.cards.length === 0) {
  gameState.cards = getStarterPack();
  gameState.coins = 50; // Starting coins
  saveState(gameState);
}

function save() {
  saveState(gameState);
}

// --- Three.js Setup ---
const canvas = document.getElementById('arcade-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
// Sky blue background

// Perspective camera — better for raycasting and more immersive
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);

// --- Controllers ---
const cameraCtrl = new CameraController(camera);
const arcadeRoom = new ArcadeRoom(scene);
const exterior = new Exterior(scene);

// --- Game Manager ---
const gameManager = new GameManager(gameState, save);

// --- Reputation & NPC System ---
const reputation = new Reputation(gameState, save);
const npcManager = new NpcManager(scene, arcadeRoom.machines, reputation, gameState, save);

// --- Restore saved machines ---
for (let i = 0; i < gameState.machines.length; i++) {
  const saved = gameState.machines[i];
  if (saved && saved.gameCode) {
    const machine = arcadeRoom.machines[i];
    machine.gameCode = saved.gameCode;
    machine.gameTitle = saved.title;
    machine.highScore = saved.highScore || 0;
    machine.drawReady();
  }
}

// --- UI ---
const cardUI = new CardUI(
  gameState,
  (recipe) => {
    // On generate — show prompt preview first
    if (activeMachine) {
      pendingRecipe = recipe;
      showPromptPanel(recipe);
    }
  },
  () => {
    // On cancel — return to arcade view
    cameraCtrl.zoomOut();
    cardUI.showCardBar();
    hud.hideBackButton();
    activeMachine = null;
  }
);

const hud = new HUD(gameState, save);

hud.onPlayAgain = () => {
  if (activeMachine && activeMachine.gameCode) {
    startPlaying(activeMachine);
  }
};

hud.onBackToArcade = () => {
  if (activeMachine && activeMachine.engine) {
    activeMachine.stopGame();
  }
  gameManager.stopGame();
  cameraCtrl.zoomOut();
  activeMachine = null;
  hud.hideBackButton();
  cardUI.showCardBar();
  hud.updateDisplay();
};

hud.onBack = () => {
  if (activeMachine && activeMachine.engine) {
    activeMachine.stopGame();
  }
  if (gameManager.currentMachine?.state === 'playing') {
    gameManager.stopGame();
  }
  cameraCtrl.zoomOut();
  activeMachine = null;
  hud.hideBackButton();
  hud.hideKickButton();
  cardUI.showCardBar();
};

hud.onNewGame = () => {
  // Reset current machine slot and open card panel
  if (gameManager.currentMachine?.state === 'playing') {
    gameManager.stopGame();
  }
  const machine = activeMachine || cameraCtrl.zoomedMachine;
  if (machine) {
    machine.state = 'empty';
    machine.gameCode = null;
    machine.gameTitle = '';
    machine._drawEmptyScreen();
    gameState.machines[machine.index] = null;
    save();

    // Zoom out, then open card panel for this machine
    cameraCtrl.zoomOut();
    hud.hideBackButton();
    hud.hideGameOver();

    // Slight delay so camera starts zooming, then open panel
    setTimeout(() => {
      activeMachine = machine;
      cardUI.hideCardBar();
      cardUI.show();
    }, 100);
  }
};

hud.onModifyGame = () => {
  // Modify existing game — show modify panel
  if (gameManager.currentMachine?.state === 'playing') {
    gameManager.stopGame();
  }
  const machine = activeMachine || cameraCtrl.zoomedMachine;
  if (machine && machine.gameCode) {
    document.getElementById('modify-current-title').textContent =
      'Current game: ' + (machine.gameTitle || 'Mini Game');
    document.getElementById('modify-instructions').value = '';
    document.getElementById('modify-panel').classList.remove('hidden');
  }
};

hud.onKickNpc = () => {
  if (!activeMachine) return;
  const machine = activeMachine;
  if (machine.npcOccupant) {
    const npc = machine.npcOccupant;
    npc.showEmoticon('😤');
    machine.npcOccupant = null;
    machine.state = 'ready';
    machine.drawReady();
    if (npc.gameRunner) {
      npc.gameRunner.stop();
      npc.gameRunner = null;
    }
    npc.state = 'leaving';
    npc.targetMachine = null;
    npc.walkQueue = [
      new THREE.Vector3(npc.group.position.x, 0, 6),
      new THREE.Vector3(0, 0, 8),
    ];
    hud.hideKickButton();
    hud.updateDisplay();
  }
};

document.getElementById('btn-do-modify').addEventListener('click', () => {
  const machine = activeMachine || cameraCtrl.zoomedMachine;
  const instructions = document.getElementById('modify-instructions').value.trim();
  if (!machine || !instructions) return;

  document.getElementById('modify-panel').classList.add('hidden');
  hud.hideGameOver();

  // Get saved machine data to know the original recipe
  const saved = gameState.machines[machine.index];
  const extraContext = `The existing game code is:\n${machine.gameCode}\n\nPlayer wants these modifications: ${instructions}\n\nRewrite the entire game with these changes applied. Keep the same startGame(canvas, onScore, onGameOver) API.`;

  // Regenerate with the existing game as context
  machine.state = 'generating';
  machine.streamedCode = '';

  fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      genre: 'custom',
      theme: 'custom',
      modifier: null,
      cardLevels: { genre: 1, theme: 1, modifier: 0 },
      extraInstructions: extraContext,
      apiKey: getApiKey(),
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
        if (data.type === 'chunk') {
          machine.streamedCode += data.text;
          gameManager._drawStreamingScreen(machine, machine.streamedCode);
        } else if (data.type === 'done') {
          machine.setGame(data.gameCode, data.title, data.description);
          gameState.machines[machine.index] = {
            gameCode: data.gameCode,
            title: data.title,
            description: data.description,
            highScore: machine.highScore || 0,
          };
          save();
        }
      }
    }
  }).catch(err => {
    console.error('Modify failed:', err);
    machine.drawReady();
  });

  cameraCtrl.zoomTo(machine);
  hud.showBackButton();
});

document.getElementById('btn-modify-cancel').addEventListener('click', () => {
  document.getElementById('modify-panel').classList.add('hidden');
});

// Show card bar on start
cardUI.showCardBar();

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let activeMachine = null;
let hoveredMachine = null;

const clickableMeshes = arcadeRoom.getClickableMeshes();

// Hover detection — highlight machine under cursor
canvas.addEventListener('mousemove', (event) => {
  if (cameraCtrl.mode !== 'iso') return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes);

  let newHovered = null;
  if (intersects.length > 0) {
    newHovered = intersects[0].object.userData.machine || null;
    // Also check for pinball table
    if (!newHovered && intersects[0].object.userData.pinball) {
      newHovered = intersects[0].object.userData.pinball;
    }
  }

  if (newHovered !== hoveredMachine) {
    if (hoveredMachine) hoveredMachine.unhighlight();
    if (newHovered) newHovered.highlight();
    hoveredMachine = newHovered;
    canvas.style.cursor = newHovered ? 'pointer' : 'default';
  }
});

// Clear highlight when mouse leaves canvas
canvas.addEventListener('mouseleave', () => {
  if (hoveredMachine) {
    hoveredMachine.unhighlight();
    hoveredMachine = null;
    canvas.style.cursor = 'default';
  }
});

canvas.addEventListener('click', (event) => {
  // Skip if user was dragging the camera
  if (cameraCtrl.isDragging()) return;

  // Skip if any overlay panel is open
  if (!document.getElementById('create-panel').classList.contains('hidden')) return;
  if (!document.getElementById('game-over').classList.contains('hidden')) return;
  if (!document.getElementById('card-pack').classList.contains('hidden')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes);

  if (intersects.length > 0) {
    // Check for pinball table click
    const pinball = intersects[0].object.userData.pinball;
    if (pinball && cameraCtrl.isIso()) {
      // Unhighlight
      if (hoveredMachine) hoveredMachine.unhighlight();
      hoveredMachine = null;
      canvas.style.cursor = 'default';

      if (pinball.state === 'empty') {
        // Open card panel for pinball
        activeMachine = pinball;
        cardUI.hideCardBar();
        cardUI.show();
      } else if (pinball.state === 'ready') {
        // Start playing pinball
        activeMachine = pinball;
        cameraCtrl.zoomTo(pinball);
        cardUI.hideCardBar();
        hud.showBackButton();
        pinball.startGame(
          (pts) => { /* live score */ },
          (score) => {
            const coinsEarned = Math.floor(score / 10);
            gameState.coins += coinsEarned;
            save();
            hud.showGameOver(score, coinsEarned);
          }
        );
      } else if (pinball.state === 'occupied_npc') {
        activeMachine = pinball;
        cameraCtrl.zoomTo(pinball);
        cardUI.hideCardBar();
        hud.showBackButton();
        hud.showKickButton();
      }
      return; // Don't process as arcade machine
    }

    const machine = intersects[0].object.userData.machine;
    if (!machine) return;

    if (cameraCtrl.isIso()) {
      // Only act on highlighted (hovered) machine
      if (machine !== hoveredMachine) return;

      // Unhighlight before zooming/opening panel
      machine.unhighlight();
      hoveredMachine = null;
      canvas.style.cursor = 'default';

      if (machine.state === 'empty') {
        activeMachine = machine;
        cardUI.hideCardBar();
        cardUI.show();
      } else if (machine.state === 'ready') {
        activeMachine = machine;
        cameraCtrl.zoomTo(machine);
        cardUI.hideCardBar();
        hud.showBackButton();
      } else if (machine.state === 'generating') {
        activeMachine = machine;
        cameraCtrl.zoomTo(machine);
        cardUI.hideCardBar();
        hud.showBackButton();
      } else if (machine.state === 'occupied_npc') {
        activeMachine = machine;
        cameraCtrl.zoomTo(machine);
        cardUI.hideCardBar();
        hud.showBackButton();
        hud.showKickButton();
      }
    } else if (cameraCtrl.isZoomed() && machine === activeMachine) {
      if (machine.state === 'ready') {
        startPlaying(machine);
      }
    }
  }
});

function startPlaying(machine) {
  gameManager.playGame(
    machine,
    (score) => {
      // Score update — could show live score
    },
    (score, coinsEarned) => {
      hud.showGameOver(score, coinsEarned);
    }
  );
}

// Keyboard input forwarding
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (activeMachine && activeMachine.engine) {
      activeMachine.stopGame();
    }
    if (gameManager.currentMachine?.state === 'playing') {
      gameManager.stopGame();
    }
    if (cameraCtrl.mode === 'zoom') {
      cameraCtrl.zoomOut();
      activeMachine = null;
      hud.hideBackButton();
      hud.hideGameOver();
      cardUI.showCardBar();
    }
    return;
  }

  // Pinball input
  if (activeMachine && activeMachine.engine) {
    activeMachine.handleInput(e.key, true);
  }

  if (gameManager.currentMachine?.state === 'playing') {
    gameManager.forwardInput('keydown', e.key, e.code);
  }
});

document.addEventListener('keyup', (e) => {
  if (activeMachine && activeMachine.engine) {
    activeMachine.handleInput(e.key, false);
  }

  if (gameManager.currentMachine?.state === 'playing') {
    gameManager.forwardInput('keyup', e.key, e.code);
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render Loop ---
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - (animate.lastTime || now)) / 1000, 0.1);
  animate.lastTime = now;

  cameraCtrl.update();
  gameManager.updateMachineTexture();
  npcManager.update(dt);
  if (arcadeRoom.pinballTable) arcadeRoom.pinballTable.update(dt);
  hud.updateNpcDisplay(reputation.getReputation(), npcManager.getNpcCount());

  renderer.render(scene, camera);
}

animate();
