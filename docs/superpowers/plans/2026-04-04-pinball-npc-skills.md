# Pinball Table + NPC Skills v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3D pinball table with cannon-es physics to the arcade, plus upgrade NPC skill system to per-genre skills (1-10) with Polish names and gameplay history.

**Architecture:** Three parallel streams: (A) Pinball engine + 3D table, (B) Pinball AI generation + cards, (C) NPC skills v2 + history + KICK. Merge at the end in main.js/arcade-room.js.

**Tech Stack:** Three.js, cannon-es (physics), Claude API, vanilla JS ES modules

**Spec:** `docs/superpowers/specs/2026-04-04-pinball-and-npc-skills-design.md`

---

## Stream A — Pinball Engine + Table

### Task A1: Install cannon-es and Create Pinball Engine

**Files:**
- Modify: `vibe-arcade/package.json`
- Modify: `vibe-arcade/index.html` (importmap)
- Create: `vibe-arcade/src/pinball-engine.js`

The core physics + rendering engine for pinball. Takes an AI-generated config and builds a playable 3D pinball table. This is the biggest single file (~400-500 lines).

- [ ] **Step 1: Install cannon-es**

```bash
cd vibe-arcade && npm install cannon-es
```

Add to importmap in `vibe-arcade/index.html`:
```json
{
  "imports": {
    "three": "./node_modules/three/build/three.module.js",
    "cannon-es": "./node_modules/cannon-es/dist/cannon-es.js"
  }
}
```

- [ ] **Step 2: Create `vibe-arcade/src/pinball-engine.js`**

**Class: `PinballEngine`** — constructor takes `(parentGroup, config)`.

**Physics (cannon-es):**
- CANNON.World with gravity (0, -15, 0) — slightly stronger for pinball feel
- Table is in the XZ plane, tilted 6 degrees around X axis so ball rolls toward +Z (drain)
- Ball: CANNON.Body with CANNON.Sphere shape, mass 0.1, radius 0.015
- Flippers: two kinematic CANNON.Body objects at z=0.55. Left at x=-0.12, right at x=0.12. Each has a CANNON.Box shape (0.12 x 0.01 x 0.03). Controlled by rotating their quaternion. Rest angle: +30deg (pointing down-outward). Active angle: -30deg (pointing up-inward). Lerp at 0.15 rad/frame up, 0.1 rad/frame down.
- Bumpers: static CANNON.Body with CANNON.Sphere, positioned per config. On world 'beginContact' event: if ball touches bumper, apply impulse outward * 1.3 and add score.
- Walls: static CANNON.Body with CANNON.Box for table edges (left at x=-0.3, right at x=0.3, top at z=-0.65). No bottom wall — that's the drain.
- Ramps: static CANNON.Body with CANNON.Box at an angle per config.
- Drain zone: at z=0.65, detect ball.position.z > 0.65 each frame.
- Launch: ball starts at (0.28, tableY, 0.55). Space charges power (0 to 1 over 1.5s hold). Release applies velocity.z = -8 * power (negative = toward top of table).

**Three.js rendering:**
- Table base: BoxGeometry(0.7, 0.05, 1.4), wood material (0x5d4037)
- Table walls: BoxGeometry strips on 3 sides, metal material
- Glass top: PlaneGeometry(0.66, 1.36), transparent (opacity 0.12)
- 4 legs: CylinderGeometry(0.03, 0.03, 0.9)
- Playfield: PlaneGeometry(0.66, 1.36), CanvasTexture colored by config.visualStyle.playfieldColor
- Ball: SphereGeometry(0.015, 16, 16), metallic (color 0xdddddd, metalness 0.8)
- Flippers: BoxGeometry(0.12, 0.01, 0.03), chrome material
- Bumpers: CylinderGeometry(radius, radius, 0.04), emissive material per config.visualStyle
- Point light per bumper (low intensity 0.3, range 0.3)

**Key methods:**
- `constructor(parentGroup, config)` — builds physics world + meshes, adds to parentGroup
- `update(dt)` — step physics, sync meshes, check drain, update effects, handle launch charge
- `handleInput(key, isDown)` — Left/Right = flippers, Space = launch
- `getScore()` — returns current score
- `isGameOver()` — returns true when ballsLeft === 0 and no ball in play
- `dispose()` — remove from parent, dispose geometries/materials, null the physics world

On bumper contact (detected in the physics step callback), apply outward impulse and call `this.onScore(bumper.score)`.

On drain detection, decrement ballsLeft. If genre is roguelike and config.genreRules.onBallLost === 'randomizeLayout', shuffle bumper positions. If ballsLeft > 0, reset ball to launch position. If 0, set gameOver = true and call this.onGameOver(score).

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/package.json vibe-arcade/package-lock.json vibe-arcade/index.html vibe-arcade/src/pinball-engine.js
git commit -m "feat: add pinball physics engine with cannon-es"
```

---

### Task A2: Pinball Table 3D Object

**Files:**
- Create: `vibe-arcade/src/pinball-table.js`

The 3D object that sits in the arcade room. Manages state, interacts like arcade machines.

- [ ] **Step 1: Create `vibe-arcade/src/pinball-table.js`**

**Class: `PinballTable`** — constructor takes `(position)`.

Properties: state ('empty'|'generating'|'ready'|'playing'|'occupied_npc'), npcOccupant, config, engine (PinballEngine), gameTitle, highScore, highlighted, group (THREE.Group).

`_buildPreviewModel()` — static table when not playing:
- Table body: BoxGeometry(0.7, 0.85, 1.4), dark material (0x3a2a1a)
- 4 legs: CylinderGeometry(0.03, 0.03, 0.15), under corners at y=-0.075
- Top surface: BoxGeometry(0.68, 0.02, 1.38) at y=0.44, playfield green (0x1a4a1a)
- "PINBALL" text on front using CanvasTexture on a PlaneGeometry
- Set main body y so table top is at ~1.0 unit height (comfortable play)

`buildFromConfig(config)` — stores config, updates title, sets state to 'ready', changes top surface color to match config.visualStyle.playfieldColor.

`startGame(parentGroup, onScore, onGameOver)` — creates PinballEngine from config, wires callbacks. Hides preview model, shows engine meshes. Sets state to 'playing'.

`stopGame()` — disposes engine, shows preview model again, state = 'ready'.

`update(dt)` — delegates to engine.update(dt).

`handleInput(key, isDown)` — delegates to engine.handleInput(key, isDown).

`highlight()` / `unhighlight()` — same Map-based pattern as ArcadeMachine (save emissive per material, set white glow, lift 0.08).

`dispose()` — cleanup everything.

- [ ] **Step 2: Commit**

```bash
git add vibe-arcade/src/pinball-table.js
git commit -m "feat: add pinball table 3D object with state management"
```

---

## Stream B — Pinball AI Generation + Cards

### Task B1: Pinball Genre Cards

**Files:**
- Modify: `vibe-arcade/src/card-system.js`
- Modify: `vibe-arcade/src/main.js`

- [ ] **Step 1: Replace single pinball card with 4 variants in card-system.js**

Replace the existing `{ id: 'pinball', ... }` entry with:
```js
{ id: 'pinball-classic', name: 'Classic Pinball', icon: '🎯', category: 'genre', desc: 'Traditional 3-ball pinball' },
{ id: 'pinball-roguelike', name: 'Roguelike Pinball', icon: '🎲', category: 'genre', desc: 'Table changes on ball loss' },
{ id: 'pinball-hyper', name: 'Hyper Pinball', icon: '⚡', category: 'genre', desc: '2x gravity, 3x scoring, chaos' },
{ id: 'pinball-multiball', name: 'Multiball', icon: '🔴', category: 'genre', desc: 'Multiple balls, pure madness' },
```

- [ ] **Step 2: Update GENRE_DESC in main.js**

Replace existing `pinball:` entry with:
```js
'pinball-classic': 'classic pinball — 3 balls, bumpers, ramps, standard scoring',
'pinball-roguelike': 'roguelike pinball — layout randomizes on ball loss, difficulty scales',
'pinball-hyper': 'hyper pinball — 2x gravity, 3x scoring, extremely fast ball',
'pinball-multiball': 'multiball pinball — starts with 2 balls, new ball every 30s, max 5',
```

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/card-system.js vibe-arcade/src/main.js
git commit -m "feat: add 4 pinball genre card variants"
```

---

### Task B2: Pinball Config Generation Endpoint

**Files:**
- Create: `vibe-arcade/server/generate-pinball.js`
- Modify: `vibe-arcade/server/index.js`

- [ ] **Step 1: Create `vibe-arcade/server/generate-pinball.js`**

SSE endpoint that asks Claude to generate a pinball table config JSON. The prompt must describe the JSON schema, coordinate ranges (x: -0.28 to 0.28, z: -0.65 to 0.6), genre-specific rules, theme-specific colors, modifier effects. Claude returns ONLY valid JSON — no markdown.

Use `claude-sonnet-4-20250514` model, max_tokens 4096. Stream chunks via SSE. Extract JSON from response with regex `/{[\s\S]*}/`. Send `{ type: 'done', config, tableName }` at end.

Export function `generatePinballConfig(genre, theme, modifier, cardLevels, extraInstructions, res)`.

- [ ] **Step 2: Add route to server/index.js**

Import `generatePinballConfig` and add POST `/api/generate-pinball` route with same error handling pattern as `/api/generate`.

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/server/generate-pinball.js vibe-arcade/server/index.js
git commit -m "feat: add pinball config AI generation endpoint"
```

---

## Stream C — NPC Skills v2 + Names + History + KICK

### Task C1: NPC Names and Per-Genre Skills

**Files:**
- Create: `vibe-arcade/src/npc-names.js`
- Modify: `vibe-arcade/src/npc.js`

- [ ] **Step 1: Create npc-names.js with 30 Polish names**

```js
const NPC_NAMES = [
  'Janusz', 'Grażyna', 'Seba', 'Brajan', 'Karyna', 'Mirek',
  'Ziomek', 'Bożena', 'Andrzej', 'Wiesław', 'Halina', 'Dariusz',
  'Patryk', 'Kuba', 'Marta', 'Ola', 'Tomek', 'Basia', 'Marek', 'Ewa',
  'Zbyszek', 'Jolanta', 'Krzysztof', 'Magda', 'Piotrek', 'Asia',
  'Bartek', 'Karolina', 'Dawid', 'Zuzia',
];
export function getRandomName() {
  return NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
}
```

- [ ] **Step 2: Update NPC class**

Import `getRandomName`. In constructor, replace `this.skill = ...` with:
```js
this.name = getRandomName();
this.skills = this._generateSkills();
```

Add methods:
```js
_generateSkills() {
  const genres = ['platformer','shooter','puzzle','runner','dodge',
    'pinball-classic','pinball-roguelike','pinball-hyper','pinball-multiball'];
  const skills = {};
  for (const g of genres) {
    const raw = 5 + (Math.random() + Math.random() + Math.random() - 1.5) * 2.7;
    skills[g] = Math.max(1, Math.min(10, Math.round(raw)));
  }
  return skills;
}
getSkillForGenre(genre) { return this.skills[genre] || 5; }
getSkillNormalized(genre) { return this.getSkillForGenre(genre) / 10; }
```

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/npc-names.js vibe-arcade/src/npc.js
git commit -m "feat: add NPC Polish names and per-genre skill system (1-10)"
```

---

### Task C2: Update NPC Input Quality by Skill Tier

**Files:**
- Modify: `vibe-arcade/src/npc-game-runner.js`
- Modify: `vibe-arcade/src/npc-manager.js`

- [ ] **Step 1: Skill-tiered input in npc-game-runner.js**

In `_simulateInput`, replace the linear interval formula with skill tiers:
- Skill 9-10: interval 60-120ms, accuracy 95%
- Skill 7-8: interval 120-200ms, accuracy 80%
- Skill 5-6: interval 200-300ms, accuracy 65%
- Skill 3-4: interval 300-400ms, accuracy 50%
- Skill 1-2: interval 400-500ms, accuracy 30%

The `skill` value passed to `start()` is still 0-1 normalized. Map: `if (skill >= 0.9)` = god tier, etc.

- [ ] **Step 2: Use genre-specific skill in npc-manager.js**

In `_startPlaying`, determine genre from `gameState.machines[machine.index]?.genre || 'platformer'`. Pass `npc.getSkillNormalized(genre)` to `gameRunner.start()` instead of the old `npc.skill`.

Also need to ensure genre is saved — when a game is generated/saved in main.js, include `genre: recipe.genre.cardId` in the machine data object.

- [ ] **Step 3: Commit**

```bash
git add vibe-arcade/src/npc-game-runner.js vibe-arcade/src/npc-manager.js
git commit -m "feat: NPC input quality scales with per-genre skill tier"
```

---

### Task C3: Gameplay History + KICK NPC

**Files:**
- Modify: `vibe-arcade/src/storage.js`
- Modify: `vibe-arcade/src/npc-manager.js`
- Modify: `vibe-arcade/index.html`
- Modify: `vibe-arcade/style.css`
- Modify: `vibe-arcade/src/hud.js`
- Modify: `vibe-arcade/src/main.js`

- [ ] **Step 1: Add npcHistory to storage**

Add `npcHistory: []` to defaultState in storage.js.

- [ ] **Step 2: Record history in npc-manager.js _finishPlaying**

After calculating rating/coins, push entry: `{ npcName: npc.name, gameTitle, machineType: 'arcade', machineIndex, score, rating, skill: npc.getSkillForGenre(genre), timestamp: Date.now() }`. Keep max 50 entries.

- [ ] **Step 3: Add History panel HTML + KICK button to index.html**

History panel with table (thead: Gracz/Gra/Typ/Wynik/Ocena/Skill/Kiedy). History button in buy-pack div. KICK button (hidden by default) in back-button div.

- [ ] **Step 4: Style history panel + KICK button in style.css**

Panel similar to collection-panel style. Table with hover highlight. KICK button in red.

- [ ] **Step 5: Add showHistory() method and KICK handler to hud.js**

`showHistory()` reads `gameState.npcHistory`, builds table rows with DOM methods (createElement, textContent — no innerHTML with user data). Shows time-ago format.

Add `onKickNpc` callback property. Bind KICK button click to call it.
Add `showKickButton()` / `hideKickButton()` methods.

- [ ] **Step 6: Wire KICK logic in main.js**

`hud.onKickNpc` handler: get NPC occupant from activeMachine, show emoticon "😤", release machine, NPC starts leaving, -0.1 reputation effect, hide KICK button.

When zooming to `occupied_npc` machine, call `hud.showKickButton()`. When zooming out, call `hud.hideKickButton()`.

- [ ] **Step 7: Commit**

```bash
git add vibe-arcade/src/storage.js vibe-arcade/src/npc-manager.js vibe-arcade/index.html vibe-arcade/style.css vibe-arcade/src/hud.js vibe-arcade/src/main.js
git commit -m "feat: gameplay history panel, KICK NPC, Polish names in UI"
```

---

## Merge — Integration

### Task D1: Place Pinball in Arcade + Full Wiring

**Files:**
- Modify: `vibe-arcade/src/arcade-room.js`
- Modify: `vibe-arcade/src/main.js`

- [ ] **Step 1: Place pinball table in arcade-room.js**

Import PinballTable. Create instance at position (3.5, 0, 4). Add to scene. Store as `this.pinballTable`. Add its meshes to `getClickableMeshes()` with `userData.pinball = this.pinballTable`.

- [ ] **Step 2: Handle pinball interaction in main.js**

In hover handler: detect `userData.pinball`, highlight/unhighlight like machines.

In click handler: if pinball detected:
- empty: open card panel for pinball creation
- ready: zoom + start pinball game (call pinballTable.startGame)
- occupied_npc: zoom + show KICK button

When genre card starts with 'pinball-', route to `/api/generate-pinball` endpoint instead of `/api/generate`. On response, call `pinballTable.buildFromConfig(config)`.

Forward keyboard input to pinball engine when playing.

Add `pinballTable.update(dt)` to render loop.

- [ ] **Step 3: NPC can play pinball**

In npc-manager.js `_chooseAction`, also consider pinballTable as candidate (if state === 'ready'). For NPC pinball play, simulate a simple score based on skill level (no full physics): skill * 500 + random(0, skill * 200). Show commentary, rate based on score.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: integrate pinball table in arcade, full card flow + NPC pinball"
git push origin master
```
