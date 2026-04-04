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

// --- Prompt Panel ---
let pendingRecipe = null;

const GENRE_DESC = {
  platformer: 'side-scrolling platformer — jump between platforms, avoid hazards',
  shooter: 'top-down or side shooter — fire at enemies in waves',
  puzzle: 'puzzle game — matching, sorting, or pattern logic',
  runner: 'endless runner — auto-move forward, dodge obstacles',
  dodge: 'dodge game — avoid falling/flying obstacles, survive',
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
    machine.suggestions = saved.suggestions || [];
    machine.brokenCount = saved.brokenCount || 0;
    machine.recipe = saved.recipe || null;
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
  hud.hideReviewsButton();
  document.getElementById('btn-suggestions').classList.add('hidden');
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
  hud.hideReviewsButton();
  hud.hideKickButton();
  document.getElementById('btn-suggestions').classList.add('hidden');
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
    machine.suggestions = [];
    machine.brokenCount = 0;
    machine.recipe = null;
    machine._drawEmptyScreen();
    gameState.machines[machine.index] = null;
    save();

    // Zoom out, then open card panel for this machine
    cameraCtrl.zoomOut();
    hud.hideBackButton();
    hud.hideGameOver();
    document.getElementById('btn-suggestions').classList.add('hidden');

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

hud.onShowReviews = () => {
  if (!activeMachine) return;
  const machine = activeMachine;
  hud.showMachineReviews(machine.index, machine.gameTitle || 'Machine #' + machine.index);
};

hud.onKickNpc = () => {
  if (!activeMachine) return;
  const machine = activeMachine;
  if (machine.npcOccupant) {
    const npc = machine.npcOccupant;
    npc.showEmoticon('😤');
    machine.npcOccupant = null;
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

    // Start playing immediately after kicking NPC
    if (machine.gameCode) {
      machine.state = 'ready';
      machine.drawReady();
      startPlaying(machine);
    } else {
      machine.state = 'ready';
      machine.drawReady();
    }
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
            ...gameState.machines[machine.index],
            gameCode: data.gameCode,
            title: data.title,
            description: data.description,
            brokenCount: 0,
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

// Suggestions panel
document.getElementById('btn-suggestions').addEventListener('click', () => {
  const machine = activeMachine || cameraCtrl.zoomedMachine;
  if (!machine || !machine.suggestions || machine.suggestions.length === 0) return;

  const listEl = document.getElementById('suggestions-list');
  listEl.replaceChildren();

  for (const suggestion of machine.suggestions) {
    const item = document.createElement('div');
    item.className = 'suggestion-item';

    const text = document.createElement('div');
    text.className = 'suggestion-text';
    text.textContent = suggestion;

    const btn = document.createElement('button');
    btn.className = 'suggestion-apply';
    btn.textContent = 'APPLY';
    btn.addEventListener('click', () => {
      document.getElementById('suggestions-panel').classList.add('hidden');
      document.getElementById('modify-instructions').value = suggestion;
      document.getElementById('btn-do-modify').click();
    });

    item.appendChild(text);
    item.appendChild(btn);
    listEl.appendChild(item);
  }

  document.getElementById('suggestions-panel').classList.remove('hidden');
});

document.getElementById('btn-close-suggestions').addEventListener('click', () => {
  document.getElementById('suggestions-panel').classList.add('hidden');
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
        hud.showReviewsButton();
        if (machine.suggestions && machine.suggestions.length > 0) {
          document.getElementById('btn-suggestions').classList.remove('hidden');
          document.getElementById('btn-suggestions').textContent = `💡 SUGGESTIONS (${machine.suggestions.length})`;
        }
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
        hud.showReviewsButton();
        hud.showKickButton();
      }
    } else if (cameraCtrl.isZoomed() && machine === activeMachine) {
      if (machine.state === 'ready') {
        startPlaying(machine);
      }
    }
  }
});

// Card drag & drop onto machines
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes);

  let dropTarget = null;
  if (intersects.length > 0) {
    dropTarget = intersects[0].object.userData.machine || null;
  }

  for (const m of arcadeRoom.machines) {
    if (m === dropTarget && m.gameCode) m.highlight();
    else m.unhighlight();
  }
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging-card');

  for (const m of arcadeRoom.machines) m.unhighlight();

  const data = e.dataTransfer.getData('text/plain');
  if (!data) return;

  let cardData;
  try { cardData = JSON.parse(data); } catch { return; }
  const card = getCardById(cardData.cardId);
  if (!card) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes);
  if (intersects.length === 0) return;

  const machine = intersects[0].object.userData.machine;
  if (!machine || !machine.gameCode) return;

  let instruction;
  if (card.category === 'modifier') {
    instruction = `Add this modifier to the game: ${card.name} — ${card.desc}. Integrate it naturally into the existing gameplay. Make the change VERY visible and impactful.`;
  } else if (card.category === 'theme') {
    instruction = `COMPLETELY retheme this game with: ${card.name} — ${card.desc}. Change ALL colors, ALL visual elements, background, particles, text — everything must match the new theme. The gameplay stays the same but it should LOOK totally different.`;
  } else if (card.category === 'genre') {
    instruction = `Blend in elements of this genre: ${card.name} — ${card.desc}. Add genre-specific mechanics while keeping the core game working. Make the change VERY noticeable.`;
  }

  // Use saved recipe for proper genre/theme context
  const saved = gameState.machines[machine.index];
  const recipeGenre = saved?.recipe?.genre || 'custom';
  const recipeTheme = saved?.recipe?.theme || 'custom';
  const recipeModifier = saved?.recipe?.modifier || null;

  const extraContext = `The existing game code is:\n${machine.gameCode}\n\nIMPORTANT MODIFICATION REQUEST: ${instruction}\n\nRewrite the ENTIRE game with these changes applied. The changes must be DRAMATIC and OBVIOUS. Keep the same startGame(canvas, onScore, onGameOver) API.`;

  activeMachine = machine;
  machine.state = 'generating';
  machine.streamedCode = '';

  fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      genre: recipeGenre,
      theme: recipeTheme,
      modifier: recipeModifier,
      cardLevels: saved?.recipe?.cardLevels || { genre: 1, theme: 1, modifier: 0 },
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
            ...gameState.machines[machine.index],
            gameCode: data.gameCode,
            title: data.title,
            description: data.description,
            brokenCount: 0,
          };
          save();
        }
      }
    }
  }).catch(err => {
    console.error('Card drop modify failed:', err);
    machine.state = 'ready';
    machine.drawReady();
  });

  cameraCtrl.zoomTo(machine);
  hud.showBackButton();
});

canvas.addEventListener('dragleave', () => {
  for (const m of arcadeRoom.machines) m.unhighlight();
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
      hud.hideReviewsButton();
      hud.hideGameOver();
      document.getElementById('btn-suggestions').classList.add('hidden');
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
  hud.updateNpcDisplay(reputation.getReputation(), npcManager.getNpcCount());

  renderer.render(scene, camera);
}

animate();
