# NPC Visitors System — Design Spec

## Overview

Add a living layer to the Vibe Arcade: NPC visitors walk in from the street, browse the arcade, play games on machines, rate them, leave tips, and walk out. Their behavior is driven by a simple AI state machine, and their spending/ratings create a gameplay-affecting economy loop.

Parallel to NPC work, the arcade gets an exterior: a front wall with glass door and windows, a sidewalk, neighboring buildings, street lamps, and trees — so NPC arrivals are visible from outside.

## 1. NPC Visual Model (Voxel Block-People)

Built from Three.js geometry, Minecraft/Crossy Road voxel style:

| Part | Geometry | Size | Color |
|------|----------|------|-------|
| Head | Box | 0.2 x 0.2 x 0.2 | Random skin tone (4-5 options) |
| Body | Box | 0.3 x 0.4 x 0.2 | Random shirt color (~10 options) |
| Legs | 2x Box | 0.1 x 0.35 x 0.1 | Dark gray / navy |
| Arms | 2x Box | 0.08 x 0.3 x 0.08 | Skin tone |
| Hair/hat | Box/Cylinder | varies | Random — cap, flat hair, bald |

Total height: ~0.9 units (machines are ~2.2, realistic proportion).

### Animations (procedural, no skeletal)

- **Walking**: legs and arms swing (sin/cos on rotation.x), slight body bob
- **Idle**: minimal sway side to side
- **Playing**: arms forward toward control panel, slight head movement
- **Watching**: standing behind player, occasional lean-in

## 2. NPC AI — State Machine

```
SPAWNING -> ENTERING -> BROWSING -> CHOOSING -> WALKING_TO_MACHINE -> WAITING | PLAYING | WATCHING -> RATING -> BROWSING | LEAVING -> DESPAWNING
```

### States

| State | Behavior |
|-------|----------|
| **SPAWNING** | Appears on sidewalk (z=12+), starts walking toward door |
| **ENTERING** | Walks through door into arcade |
| **BROWSING** | Walks to 1-2 random browse points, looks around (head rotation) |
| **CHOOSING** | Picks a machine with a game (state=ready). Prefers higher-rated machines. If none available, leaves |
| **WALKING_TO_MACHINE** | Walks to chosen machine's play position |
| **WAITING** | If machine occupied, stands in queue behind. Impatient NPCs leave after timeout |
| **PLAYING** | Stands at machine 15-30s, playing animation. Machine shows "NPC PLAYING" on screen |
| **WATCHING** | Stands behind/beside someone playing (NPC or real player). Reacts with emoticons. May queue to play next |
| **RATING** | Shows star emoticon above head (1-5), pays coins, may tip |
| **LEAVING** | Walks to door, exits to sidewalk |
| **DESPAWNING** | Walks away on sidewalk, removed after leaving camera view |

### Pairs/Groups (20% chance)

- Two NPCs spawn together
- Walk close to each other
- One plays, other watches
- Then they swap
- Leave together

### Pathfinding

Simple waypoint system (no A*). NPC walks in straight line toward next waypoint. Minor random offset if close to another NPC (collision avoidance).

**Waypoints:**
- `SIDEWALK_SPAWN`: (random x in -2..2, 0, 13)
- `DOOR`: (0, 0, 7.5)
- `ENTRY`: (0, 0, 6)
- `BROWSE_1`: (-3, 0, 2)
- `BROWSE_2`: (3, 0, 2)
- `BROWSE_3`: (0, 0, 0)
- Per-machine `PLAY_POS`: offset 1.2 units in front of machine
- Per-machine `WATCH_POS`: offset 1.8 units in front of machine, slightly to side

## 3. Personality System

Each NPC gets randomized personality at spawn:

| Trait | Range | Effect |
|-------|-------|--------|
| **patience** | 0.3 - 1.0 | How long they wait in queue (3-10 seconds) |
| **generosity** | 0.5 - 1.5 | Coin payment multiplier |
| **standards** | 0.3 - 1.0 | How harshly they rate (high = stricter) |

## 4. Economy

### Payment

- Base price per play: **5 coins**
- Actual payment: `floor(5 * generosity)` = 3-8 coins
- Tips for good experience:
  - Rating 4: +2-5 bonus coins
  - Rating 5: +5-10 bonus coins, "WOW" emoticon
  - Rating 1-2: no tip, may scare away nearby NPCs briefly

### Rating System

Each machine accumulates NPC ratings.

**Rating formula:**
```
baseRating = random(2, 4)
cardBonus = (avgCardStars - 1) * 0.5    // higher card levels = better games
standardsPenalty = (standards - 0.5) * 1.5  // strict NPC rates lower
finalRating = clamp(round(baseRating + cardBonus - standardsPenalty), 1, 5)
```

Machine stores: total ratings count, average rating (displayed as stars above machine).

### Reputation & Spawn Rate

Arcade reputation = average rating across all machines with games.

**Spawn rate formula:**
```
baseRate = 0.1  // NPC per second base
spawnRate = baseRate * (1 + level * 0.15) * (0.5 + reputation / 5)
```

- Level 1, average games (rep 3): ~1 NPC every 12s
- Level 5, good games (rep 4): ~1 NPC every 5s
- Max concurrent NPCs: `4 + level * 1` (cap at 12)

Empty arcade (no games on machines) = no NPCs spawn.

### Visual Feedback

- Star emoticon above head after rating (floats up, fades out)
- Angry red cloud for rating 1-2
- Yellow star / heart for rating 5
- Coin particle effect when paying

## 5. Arcade Exterior & Street

### Front Wall & Door

Currently the front side (z=8) is open. Add:

- **Front wall**: same material as other walls, with cutout for door and windows
- **Door frame**: dark wood trim, glass door (semi-transparent panel)
- **"OPEN" sign**: small glowing sign above/beside door
- **Entrance light**: warm point light above door
- **Glass windows/vitrines**: semi-transparent panels on both sides of door, so you can see inside from outside

### Street & Sidewalk

- **Sidewalk**: PlaneGeometry (20 x 4) at z=8..12, gray concrete material
- **Road**: PlaneGeometry (20 x 6) at z=12..18, dark asphalt with white lane markings (canvas texture)
- **Curb**: thin BoxGeometry between sidewalk and road

### Neighboring Buildings (simple, low detail)

- 2-3 box buildings on each side of the arcade
- Different heights (3-6 units), muted colors (beige, gray, brown)
- Window grids drawn on canvas texture
- Flat rooftops

### Street Props

- **Street lamps**: 2 lamp posts on sidewalk (cylinder pole + sphere light + warm point light)
- **Trees**: 1-2 simple trees (cylinder trunk + sphere/cone canopy, green)
- **Bench**: simple box geometry near entrance
- **Parked car** (optional): colored box with cylinder wheels

### Sky / Background

- Scene background color change to light blue/sky (#87CEEB or gradient)
- Or keep neutral, since the buildings frame the scene

## 6. File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/npc.js` | NPC class: 3D model, state machine, animation, personality |
| `src/npc-spawner.js` | Spawn logic: timing, limits, pairs, reputation-based rates |
| `src/npc-manager.js` | Manages all NPCs: update loop, collision avoidance, machine interaction |
| `src/reputation.js` | Rating system, arcade reputation, spawn rate calculation |
| `src/exterior.js` | Street, buildings, sidewalk, front wall, door, street props |

### Modified Files

| File | Change |
|------|--------|
| `src/main.js` | Init NpcManager + Exterior, add to render loop |
| `src/machine.js` | New state `occupied_npc`, reserve/release methods for NPC use, rating display |
| `src/arcade-room.js` | Add front wall with door/window cutouts |
| `src/hud.js` | Display arcade reputation, visitor count |
| `src/storage.js` | Persist reputation and per-machine ratings |

## 7. Parallelization

Two independent workstreams:

**Stream A — Exterior**: `exterior.js` + `arcade-room.js` front wall changes + scene background. No dependency on NPC code.

**Stream B — NPC System**: `npc.js`, `npc-spawner.js`, `npc-manager.js`, `reputation.js` + machine/hud/storage changes. Uses door position from exterior but can use hardcoded waypoint.

Both streams merge in `main.js` at the end.
