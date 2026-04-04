# Vibe Arcade — Design Spec

## Context

Gra w Three.js+HTML, której główna pętla to **AI vibe-kodowanie mini-gier**. Gracz zbiera karty opisujące mechaniki/motywy/modyfikatory, składa je w "przepis", a Claude API generuje na żywo mini-grę Canvas2D, która renderuje się na ekranie automatu arcade w izometrycznym pokoju 3D.

Cel: stworzyć grę, w której sam proces generowania treści przez AI jest gameplay'em — nie narzędziem, a doświadczeniem.

---

## Architektura

```
┌─────────────────────────────────────────┐
│                BROWSER                   │
│                                          │
│  ┌──────────────┐   ┌────────────────┐  │
│  │  Three.js     │   │  Card UI       │  │
│  │  Arcade Room  │   │  (HTML overlay) │  │
│  │  - isometric  │   │  - deck view   │  │
│  │  - machines   │   │  - combine     │  │
│  │  - camera     │   │  - inventory   │  │
│  └──────┬───────┘   └───────┬────────┘  │
│         │                    │           │
│         ▼                    ▼           │
│  ┌──────────────────────────────────┐   │
│  │       Game Manager               │   │
│  │  - sends card combo to backend   │   │
│  │  - receives Canvas2D code        │   │
│  │  - runs in sandboxed iframe      │   │
│  │  - captures iframe canvas pixels │   │
│  │  - applies as CanvasTexture      │   │
│  │  - forwards input to iframe      │   │
│  └──────────────┬───────────────────┘   │
│                  │                       │
└──────────────────┼───────────────────────┘
                   │ HTTP
          ┌────────▼────────┐
          │  Node.js Server  │
          │  - POST /generate│
          │  - Claude API    │
          │  - code sanitize │
          └─────────────────┘
```

## Komponenty

### 1. Arcade Room (Three.js)

**Widok**: Izometryczny (kamera OrthographicCamera pod kątem ~45°, obrócona).

**Elementy sceny**:
- Podłoga z siatką (neonowy/retro styl)
- 6 slotów na automaty arcade (BoxGeometry z ekranem jako PlaneGeometry)
- Oświetlenie ambient + punkt lights (kolorowe, neonowe)
- Prosty efekt cząsteczkowy (pyłki/glow)

**Interakcja**:
- Klik na automat → kamera animuje zoom (TWEEN/lerp) do ekranu automatu
- Klik na pusty slot → otwiera panel "Stwórz grę" (Card UI)
- ESC / przycisk "Back" → kamera wraca do widoku izometrycznego

**Automaty**:
- Każdy automat ma: mesh, ekran (PlaneGeometry z CanvasTexture), label, stan (empty/generating/ready)
- Stan "generating" → animacja loading na ekranie (shader/canvas)
- Stan "ready" → mini-gra renderuje się w pętli na texture

### 2. Card System

**Kategorie kart (MVP — 15 kart na start)**:

| Kategoria | Karty | Przykłady |
|-----------|-------|-----------|
| Genre (5) | wymagana 1 | platformer, shooter, puzzle, runner, dodge |
| Theme (5) | wymagana 1 | neon, space, retro, ocean, forest |
| Modifier (5) | opcjonalna | speed-up, gravity-flip, time-limit, boss, powerups |

**Przepis na grę** = 1 Genre + 1 Theme + 0-1 Modifier

**Progresja**:
- Start: gracz ma 3 losowe karty (1 genre, 1 theme, 1 modifier)
- Granie w mini-grę → monety (proporcjonalnie do score)
- Monety → "Card Pack" (3 losowe karty, 100 monet)
- Duplikaty → "upgrade" karty (np. "Shooter★★" daje lepsze parametry w prompcie)

**UI**: HTML overlay nad canvas Three.js
- Dolny pasek: podgląd aktywnego decku
- Panel boczny (toggle): pełny inventory kart
- Panel tworzenia: drag & drop kart na sloty Genre/Theme/Modifier → przycisk "Generate"

### 3. Game Generator (Backend)

**Endpoint**: `POST /api/generate`

**Request**:
```json
{
  "genre": "platformer",
  "theme": "neon",
  "modifier": "gravity-flip",
  "cardLevels": { "genre": 2, "theme": 1, "modifier": 1 }
}
```

**Backend flow**:
1. Buduje prompt z kart (szablon + parametry)
2. Wysyła do Claude API (model: claude-sonnet-4-6 dla szybkości)
3. Otrzymuje kod Canvas2D mini-gry
4. Sanityzuje kod (usuwa niebezpieczne API: fetch, XMLHttpRequest itp.)
5. Zwraca kod gry

**Response**:
```json
{
  "gameCode": "// Canvas2D mini-game code...",
  "title": "Neon Gravity Flip",
  "description": "Platformer z odwróconą grawitacją w neonowym stylu"
}
```

**Prompt template** (szkielet):
```
Wygeneruj mini-grę Canvas2D w JavaScript.

Specyfikacja:
- Gatunek: {genre}
- Motyw wizualny: {theme}  
- Modyfikator: {modifier}
- Poziom złożoności: {complexity based on card levels}

Wymagania techniczne:
- Kod musi być jedną funkcją: function startGame(canvas, onScore, onGameOver)
- canvas: HTMLCanvasElement (800x600)
- onScore(points): callback gdy gracz zdobywa punkty
- onGameOver(finalScore): callback gdy gra się kończy
- Użyj TYLKO Canvas2D API (ctx = canvas.getContext('2d'))
- Gra musi mieć pętlę requestAnimationFrame
- Obsługa input: keyboard (arrows/WASD/space)
- Gra powinna trwać 30-90 sekund
- Musi być grywalna i mieć jasny cel
- Zwróć TYLKO kod JS, bez markdown, bez komentarzy poza kluczowymi
```

### 4. Mini-Game Runtime

**Sandbox (iframe)**:
- Tworzy ukryty `<iframe sandbox="allow-scripts">` (najbezpieczniejszy sposób na uruchomienie niezaufanego kodu)
- Wewnątrz iframe: `<canvas>` 800x600 z kodem mini-gry
- Komunikacja parent ↔ iframe przez `postMessage` API
- Iframe nie ma dostępu do parent DOM, fetch, localStorage — pełna izolacja

**Canvas capture do Three.js**:
- Iframe renderuje grę na swój canvas
- Parent co frame robi `drawImage()` z iframe canvas na lokalny canvas
- Lokalny canvas jest źródłem `CanvasTexture` na mesh ekranu automatu
- `texture.needsUpdate = true` co frame

**Input forwarding**:
- Gdy kamera jest "zoomowana" na automat, keydown/keyup events są przekazywane do iframe przez `postMessage`
- Iframe rejestruje te events i przekazuje do mini-gry

**Lifecycle**:
1. Gracz klika "Generate" → backend generuje kod
2. Kod ładowany do sandboxed iframe → animacja "booting" na ekranie automatu
3. Gra startuje na ekranie automatu (widoczna z oddalenia jako animowany texture)
4. Gracz klika automat → kamera zoomuje → pełna interakcja
5. `onGameOver` → wynik → monety → kamera wraca

### 5. HUD & Scoring

- Górny pasek: monety, poziom gracza, nazwa arcade
- Po zakończeniu mini-gry: overlay z wynikiem, zdobyte monety, przycisk "Play Again" / "Back"
- Leaderboard per automat (localStorage)

---

## Struktura plików

```
vibe-arcade/
├── index.html              # Entry point
├── style.css               # Global styles
├── src/
│   ├── main.js             # App init, scene setup
│   ├── arcade-room.js      # Three.js isometric room
│   ├── machine.js          # Arcade machine mesh + state
│   ├── camera.js           # Camera controller (iso ↔ zoom)
│   ├── card-system.js      # Cards, deck, inventory logic
│   ├── card-ui.js          # Card UI overlay (HTML)
│   ├── game-manager.js     # Generate, load, run mini-games
│   ├── game-sandbox.js     # iframe sandbox execution
│   ├── hud.js              # Score, coins, level display
│   └── storage.js          # localStorage wrapper
├── server/
│   ├── index.js            # Express server
│   ├── generate.js         # Claude API integration
│   └── sanitize.js         # Code sanitization
├── assets/
│   └── (textures, fonts)
└── package.json
```

---

## Styl wizualny

- **Paleta**: ciemne tło (#0a0a1a), neonowe akcenty (cyan #00fff5, magenta #ff00ff, żółty #ffe600)
- **Automaty**: low-poly boxy z emisyjnymi ekranami (glow effect)
- **Podłoga**: siatka neonowa (grid shader lub texture)
- **Karty**: pixel-art styl z kolorowym obramowaniem per kategoria
- **Czcionki**: monospace / pixel font

---

## MVP Scope — co jest IN, co jest OUT

**IN (MVP)**:
- Izometryczny pokój z 6 slotami
- 15 kart startowych (5+5+5)
- Generowanie mini-gier przez Claude API
- Granie w mini-gry na ekranach automatów
- System monet + card packs
- localStorage persistence

**OUT (post-MVP)**:
- Multiplayer / odwiedzanie cudzych arcade
- Ewolucja/breeding gier
- Daily challenges
- Dekoracje pokoju
- Sound effects / muzyka
- Leaderboard online

---

## Weryfikacja

1. `npm install && npm run dev` — serwer startuje
2. Otwórz przeglądarkę → widać izometryczny pokój z 6 slotami
3. Kliknij pusty slot → otwiera się Card UI
4. Wybierz Genre + Theme → kliknij "Generate"
5. Automat pokazuje loading → po ~10s mini-gra pojawia się na ekranie
6. Kliknij automat → kamera zoomuje → graj (WASD/arrows)
7. Game Over → wynik, monety, powrót do arcade
8. Kup Card Pack za monety → nowe karty w inventory
