# Pinball Table + NPC Skill System v2 — Design Spec

## Overview

Two features:
1. **Physical 3D pinball table** in the arcade salon — cannon-es physics, AI-generated layouts via cards, playable in 3D
2. **NPC skill system v2** — per-genre skills (1-10), gameplay history with names, score-based play quality

---

## Feature 1: 3D Pinball Table

### Physical Object

A full-size pinball table mesh in the arcade room, positioned between the counter desk and the orange arcade machine (~(3.5, 0, 4)). Larger than arcade cabinets:
- Width: 0.7 units, Length: 1.4 units, Height: 1.0 units
- Wooden/metal side rails (BoxGeometry)
- Transparent glass top (PlaneGeometry, opacity 0.15)
- Playfield surface (PlaneGeometry with CanvasTexture from AI config)
- 4 legs
- Flipper buttons on sides (small colored cylinders)

Interacts like arcade machines:
- Hover = highlight
- Click when empty = open card panel (theme + genre + modifier)
- Click when NPC playing = zoom to watch + KICK button
- Click when ready = zoom and play

### Card System for Pinball

**Genre cards (pinball-specific):**

| id | name | icon | effect |
|----|------|------|--------|
| pinball-classic | Classic Pinball | 🎯 | Standard 3-ball pinball, balanced scoring |
| pinball-roguelike | Roguelike Pinball | 🎲 | Lose a ball = table layout randomizes, difficulty scales 1.2x |
| pinball-hyper | Hyper Pinball | ⚡ | 2x gravity, 3x scoring, ball moves fast, chaos mode |
| pinball-multiball | Multiball Madness | 🔴 | Starts with 2 balls, new ball every 30s, max 5 on table |

**Theme cards**: Same as arcade (neon/space/retro/ocean/forest) — affects visual style of table.

**Modifier cards**: Same as arcade (speed-up/gravity-flip/time-limit/boss/powerups) — affects mechanics.

### AI Generation

Player picks cards -> sends to `/api/generate-pinball` endpoint -> Claude generates JSON config + code snippets.

**Config structure:**
```json
{
  "tableName": "Cosmic Roguelike",
  "layout": {
    "bumpers": [
      { "x": 0.1, "z": -0.3, "radius": 0.04, "score": 100, "type": "round" },
      { "x": -0.15, "z": -0.4, "radius": 0.03, "score": 50, "type": "mushroom" }
    ],
    "ramps": [
      { "startX": -0.2, "startZ": 0.1, "endX": 0.1, "endZ": -0.5, "height": 0.06, "scoreMultiplier": 3 }
    ],
    "lanes": [
      { "x": 0.25, "width": 0.05, "startZ": -0.2, "endZ": -0.6, "score": 200 }
    ],
    "targets": [
      { "x": -0.1, "z": -0.55, "type": "dropdown", "score": 150 }
    ],
    "walls": [
      { "points": [[x1,z1],[x2,z2]], "type": "slingshot", "score": 10 }
    ],
    "specialZones": [
      { "x": 0, "z": -0.65, "radius": 0.05, "effect": "multiball" }
    ]
  },
  "scoring": {
    "bumperBase": 100,
    "rampBonus": 500,
    "comboMultiplier": true,
    "comboTimeout": 3
  },
  "balls": 3,
  "visualStyle": {
    "playfieldColor": "#0a0a2a",
    "bumperColor": "#00fff5",
    "bumperEmissive": "#00fff5",
    "rampColor": "#ff6600",
    "wallColor": "#cccccc",
    "glowIntensity": 0.8,
    "particleColor": "#ffffff"
  },
  "genreRules": {
    "onBallLost": "randomizeLayout",
    "difficultyScale": 1.2,
    "startBalls": 2,
    "maxBalls": 5,
    "newBallInterval": 30
  },
  "modifierRules": {
    "speedUp": { "gravityIncrease": 0.05, "interval": 10 },
    "powerups": { "types": ["magnet", "bigFlippers", "slowMo"], "spawnInterval": 15 }
  },
  "customEffects": "function onBumperHit(bumper, ball) { /* particle burst, screen shake */ }"
}
```

### Pinball Engine (Fixed)

`src/pinball-engine.js` — the core engine that never changes:

**Physics (cannon-es):**
- World with gravity (0, -9.8 * scale, 0)
- Ball: sphere rigid body (mass 0.1, radius 0.015)
- Flippers: kinematic hinge bodies, rotate on Left/Right arrow
- Bumpers: static sphere bodies with contact event -> impulse bounce + score
- Ramps: static box bodies at angle
- Walls: static box bodies
- Drain zone: trigger body at bottom -> ball lost
- Launch chute: ball starts at bottom-right, Space to launch (hold for power)

**Rendering (Three.js):**
- Table frame and legs as BoxGeometry
- Glass top as transparent PlaneGeometry
- Playfield surface with CanvasTexture (colored by AI config)
- Bumpers as CylinderGeometry with emissive materials
- Ramps as BoxGeometry at angles
- Ball as SphereGeometry with metallic material
- Flippers as BoxGeometry with pivot rotation
- Point lights inside bumpers for glow effect
- Particle system for hits (simple sprite particles)

**Game loop:**
- `update(dt)`: step physics, sync Three.js meshes, check scoring zones, update effects
- `handleInput(key, down)`: flipper control, ball launch
- `getScore()`: current score
- `isGameOver()`: all balls lost

### Pinball Table Manager

`src/pinball-table.js` — the 3D object in the arcade room:

- Extends similar pattern to ArcadeMachine
- Has `state`: empty | generating | ready | playing | occupied_npc
- `npcOccupant` for NPC play
- `buildFromConfig(config)`: parses AI config, creates physics + meshes
- `startGame()` / `stopGame()`: game lifecycle
- `highlight()` / `unhighlight()`: hover effect
- Shows mini preview on playfield when ready (static table layout)

### Playing Flow

1. Player clicks pinball table -> card selection panel
2. Picks theme + genre + modifier -> sends to `/api/generate-pinball`
3. AI returns JSON config
4. Engine builds table from config
5. Camera zooms to table (top-down angled view)
6. Player controls flippers (Left/Right), launches ball (Space)
7. Game over -> score -> coins reward -> back to arcade

### Controls

- **Left Arrow**: Left flipper
- **Right Arrow**: Right flipper
- **Space** (hold+release): Launch ball (hold longer = more power)
- **Escape**: Back to arcade

---

## Feature 2: NPC Skill System v2 + History

### Per-Genre Skills

Each NPC spawns with skills per game genre:

```js
npc.skills = {
  platformer: 4,
  shooter: 7,
  puzzle: 2,
  runner: 5,
  dodge: 3,
  pinball: 8,
}
```

**Distribution**: Gaussian-ish, center at 5, stddev ~2. Most NPCs are 3-7, rare 1-2 or 9-10.

**Skill → Input Quality:**

| Skill | Input Interval | Accuracy | Behavior |
|-------|---------------|----------|----------|
| 1-2 | 400-500ms | 30% correct | Random mashing, slow reactions, frequently dies |
| 3-4 | 300-400ms | 50% correct | Tries but misses a lot, mediocre scores |
| 5-6 | 200-300ms | 65% correct | Decent player, gets combos sometimes |
| 7-8 | 120-200ms | 80% correct | Good player, consistent combos, high scores |
| 9-10 | 60-120ms | 95% correct | God gamer, perfect timing, chain combos, exploits mechanics, breaks records |

**For pinball specifically:**
- Skill 1-2: Mashes flippers randomly, ball drains fast
- Skill 5-6: Times flippers OK, keeps ball alive, hits some bumpers
- Skill 9-10: Perfect flipper timing, aims for ramps, chains combos, multiball master

### NPC Names

Random Polish names assigned at spawn:

```js
const NPC_NAMES = [
  'Janusz', 'Grażyna', 'Seba', 'Brajan', 'Karyna', 'Mirek',
  'Ziomek', 'Bożena', 'Andrzej', 'Wiesław', 'Halina', 'Dariusz',
  'Patryk', 'Kuba', 'Marta', 'Ola', 'Tomek', 'Basia', 'Marek', 'Ewa',
];
```

### History System

`gameState.npcHistory` — array of play records, max 50 (FIFO):

```js
{
  npcName: "Seba",
  gameTitle: "Neon Runner",
  machineType: "arcade",    // or "pinball"
  machineIndex: 2,
  score: 1240,
  rating: 4,
  skill: 7,
  timestamp: 1712188800000,
}
```

Persisted in localStorage via existing storage system.

### History UI Panel

New button in HUD: "📋 HISTORIA" — opens overlay panel showing last 50 plays:

| Gracz | Gra | Typ | Wynik | Ocena | Skill | Kiedy |
|-------|-----|-----|-------|-------|-------|-------|
| Seba | Neon Runner | 🕹️ | 1,240 | ⭐⭐⭐⭐ | 7/10 | 2min ago |
| Grażyna | Space Dodge | 🕹️ | 89 | ⭐⭐ | 3/10 | 5min ago |
| Janusz | Cosmic Roguelike | 🎯 | 4,500 | ⭐⭐⭐⭐⭐ | 9/10 | 8min ago |

Sortable by score, rating, time.

### KICK NPC

When NPC is playing pinball (or arcade) and player clicks:
- "KICK 👟" button appears
- Click it: NPC gets "😤" emoticon, walks away immediately
- Reputation penalty: -0.1 to arcade reputation
- Player takes over the game in current state (same ball, same score)
- For arcade machines: player takes over the running game
- For pinball: player takes over ball position and score

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/pinball-engine.js` | Core pinball physics (cannon-es) + Three.js rendering, input handling |
| `src/pinball-table.js` | Pinball table 3D object in arcade, state management, config parsing |
| `src/npc-names.js` | NPC name list + random name generator |
| `server/generate-pinball.js` | Claude API endpoint for pinball config generation |

### Modified Files

| File | Change |
|------|--------|
| `src/card-system.js` | Add 4 pinball genre cards |
| `src/npc.js` | Replace single `skill` with per-genre `skills` object, add `name` property |
| `src/npc-manager.js` | Use genre-specific skill for input, record history after play |
| `src/npc-game-runner.js` | Use genre-specific skill for input quality |
| `src/arcade-room.js` | Place pinball table, add to clickable meshes |
| `src/main.js` | Add pinball interaction, KICK button, history panel, genre desc for pinball |
| `src/hud.js` | Add history button + panel |
| `src/storage.js` | Add npcHistory to default state |
| `index.html` | Add history panel HTML, KICK button HTML |
| `style.css` | Style history panel, KICK button |
| `server/index.js` | Add `/api/generate-pinball` route |
| `package.json` | Add cannon-es dependency |

---

## Parallelization

Three independent streams:

**Stream A — Pinball Engine + Table**: pinball-engine.js, pinball-table.js, cannon-es setup. No dependency on NPC code.

**Stream B — NPC Skills v2 + History**: npc.js changes, npc-manager.js changes, npc-names.js, history UI. No dependency on pinball.

**Stream C — Pinball Generation + Cards**: server/generate-pinball.js, card-system.js pinball cards, server route. Independent.

Merge in main.js/arcade-room.js/hud.js at the end.
