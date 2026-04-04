import Anthropic from '@anthropic-ai/sdk';
import { sanitizeGameCode } from './sanitize.js';

const client = new Anthropic();

const GENRE_DESCRIPTIONS = {
  platformer: 'A side-scrolling platformer where the player jumps between platforms, avoids hazards, and collects items. Player moves left/right and jumps.',
  shooter: 'A top-down or side-scrolling shooter where the player fires projectiles at enemies. Enemies spawn in waves and drop toward the player.',
  puzzle: 'A puzzle game with logic mechanics — matching, sorting, or pattern recognition. Clear conditions are met by solving the puzzle.',
  runner: 'An endless runner where the player automatically moves forward and must jump/duck to avoid obstacles. Speed increases over time.',
  dodge: 'A dodge game where obstacles fall/fly from edges and the player must avoid them. Survival time equals score.',
  pinball: `A 2D pinball machine viewed from above (ball rolls "downward" toward the bottom of the 800x600 canvas).

PINBALL TABLE LAYOUT (800x600 canvas):
- Table boundary: Solid walls on left (x=40), right (x=760), and top (y=30). No wall at bottom — that's the drain.
- Two flippers at bottom center: Left flipper pivot at (300, 540), Right flipper pivot at (500, 540). Each flipper is 80px long, resting angle ~30deg below horizontal, swings up to ~30deg above horizontal.
- Ball launch chute: Narrow channel on the right side (x=720 to x=760, from y=580 up to y=100). Ball starts here. Player presses Space or ArrowUp to launch with variable power (hold longer = stronger launch, up to max velocity of 15).
- Top zone (y=30 to y=200): 3 circular bumpers arranged in a triangle. Bumper positions: (300,120), (500,120), (400,180). Each bumper radius ~25px. Ball bounces off bumpers with coefficient of restitution 1.3 (speed boost). Each bumper hit = 100 points.
- Mid zone (y=200 to y=400): 2 more bumpers at (250,300) and (550,300) radius ~20px, 50 points each. Two "lanes" or ramps: diagonal guide rails from (100,350) angling up to (200,150) and from (700,350) to (600,150) — ball rolling up a ramp and coming back scores 500 points and activates a 3x multiplier for 8 seconds.
- Slingshots: Two angled bounce surfaces just above the flippers at (180,480)-(260,520) and (540,480)-(620,520). These kick the ball with extra velocity. 10 points each hit.
- Drain: If ball.y > 610, the ball is lost. Player has 3 balls total. After losing all 3, call onGameOver(finalScore).

PHYSICS ENGINE:
- Ball: circle, radius 8px. Position (x,y), velocity (vx,vy).
- Gravity: apply vy += 0.15 each frame (pulls ball downward).
- Friction: multiply vx and vy by 0.999 each frame.
- Max speed cap: limit ball speed to 20px/frame to prevent tunneling.
- Wall collisions: Reflect velocity component, multiply by 0.85 (energy loss on walls).
- Bumper collisions (circle-circle): When distance between ball center and bumper center < ball.radius + bumper.radius, reflect ball velocity away from bumper center and multiply speed by 1.3. Play a visual flash on the bumper.
- Flipper collisions (line-segment): Each flipper is a line segment from pivot to tip. Detect ball-to-line-segment distance. If ball hits flipper, reflect velocity off the flipper surface normal. If flipper is swinging up (active), add extra impulse (multiply reflected speed by 1.8) to simulate a strong hit. The flipper angle should animate smoothly: when key is held, rotate toward up position at 0.15 rad/frame; when released, rotate back down at 0.1 rad/frame.
- Slingshot collisions (line-segment): Same as flipper collision but static. Reflect and boost speed by 1.2.
- Ramp entry: If ball enters a ramp lane region with sufficient upward velocity, guide it along the rail (constrain position), then release at top. Award ramp bonus.

CONTROLS:
- ArrowLeft or A: Activate left flipper (swing up).
- ArrowRight or D: Activate right flipper (swing up).
- Space or ArrowUp: Launch ball (when ball is in the chute). Hold for power — track hold duration, map to launch velocity 5..15.
- Both flippers release when keys are released.

SCORING:
- Bumper hit (large): 100 pts
- Bumper hit (small): 50 pts
- Slingshot hit: 10 pts
- Ramp completion: 500 pts + activate 3x multiplier for 8 seconds
- Multiplier stacks with subsequent ramp completions.
- Call onScore(points) each time points are earned.

VISUAL EFFECTS (critical for "wow" factor):
- Dark background (#0a0a1a or theme-appropriate).
- Ball: bright glowing circle with a short motion trail (store last 8 positions, draw fading circles).
- Bumpers: Colored circles with a pulsing glow. On hit, flash white and expand briefly (scale up to 1.3x for 100ms, then back).
- Flippers: Rounded rectangles, slightly glowing. Brighter when active.
- Slingshots: Bright angled lines that flash on hit.
- Ramp lanes: Dashed or glowing guide lines.
- Score display: Large font, top-left. Show current multiplier if active ("3X!" text pulsing).
- Ball count: Show remaining balls as small circles in the top-right.
- When a ball drains, show a brief "BALL LOST" text, pause 1 second, then serve next ball to the chute.
- When game ends, show final score briefly, then call onGameOver.
- Particle burst: On bumper hits, emit 6-10 small particles that fly outward and fade over 0.3 seconds.`,
};

const THEME_DESCRIPTIONS = {
  neon: 'Neon/cyberpunk aesthetic: glowing outlines, dark backgrounds (#0a0a1a), bright cyan (#00fff5), magenta (#ff00ff), yellow (#ffe600). Everything should glow.',
  space: 'Deep space aesthetic: starfield background, planets, asteroids. Colors: dark navy, white stars, orange/red for dangers, blue for player.',
  retro: '8-bit retro pixel aesthetic: chunky blocky shapes, limited color palette (greens, whites, reds on black). Feels like an old arcade game.',
  ocean: 'Underwater ocean aesthetic: blue-green gradients, bubbles, fish, coral, seaweed. Colors: teals, deep blues, sandy yellows.',
  forest: 'Enchanted forest aesthetic: greens, browns, magical sparkles. Trees, mushrooms, fireflies. Colors: forest greens, earth browns, golden glows.',
};

const MODIFIER_DESCRIPTIONS = {
  'speed-up': 'The game progressively gets faster. Start slow, ramp up speed every 10 seconds. Makes the game increasingly challenging.',
  'gravity-flip': 'Include a gravity flip mechanic — pressing a key (Space or G) reverses gravity direction. Player falls upward or downward.',
  'time-limit': 'Strict 60-second time limit. Show a visible countdown timer. Game ends when time runs out. Score as much as possible before then.',
  boss: 'Include a boss enemy that appears after 30 seconds of play. Boss has health bar, attack patterns, and must be defeated to win.',
  powerups: 'Spawn random power-ups: speed boost (blue), shield (green), double points (gold), size change (purple). Each lasts 5 seconds.',
};

function buildPrompt(genre, theme, modifier, cardLevels, extraInstructions) {
  const complexity = Math.max(cardLevels.genre, cardLevels.theme, cardLevels.modifier || 1);
  const complexityNote = complexity > 1
    ? `Complexity level: ${complexity}/5. Add more enemies, obstacles, visual polish, and gameplay depth.`
    : 'Keep it simple but fun and polished.';

  let modifierSection = '';
  if (modifier && MODIFIER_DESCRIPTIONS[modifier]) {
    modifierSection = `\nSpecial Modifier: ${modifier}\n${MODIFIER_DESCRIPTIONS[modifier]}`;
  }

  return `Generate a mini-game using Canvas2D in JavaScript.

Genre: ${genre}
${GENRE_DESCRIPTIONS[genre] || genre}

Visual Theme: ${theme}
${THEME_DESCRIPTIONS[theme] || theme}
${modifierSection}

${complexityNote}
${extraInstructions ? `\nADDITIONAL PLAYER INSTRUCTIONS:\n${extraInstructions}\n` : ''}
CRITICAL REQUIREMENTS:
1. Your code MUST define a function: function startGame(canvas, onScore, onGameOver)
2. canvas is an HTMLCanvasElement (800x600 pixels)
3. onScore(points) — call this whenever the player scores points
4. onGameOver(finalScore) — call this when the game ends
5. Use ONLY Canvas2D API: canvas.getContext('2d')
6. Use requestAnimationFrame for the game loop
7. Handle keyboard input with window.addEventListener('keydown'/'keyup')
8. Support arrow keys AND WASD for movement, Space for action
9. Game should be fun and playable, lasting 30-90 seconds
10. Draw ALL visuals using Canvas2D (fillRect, arc, lineTo, etc.) — NO images or external resources
11. Include a visible score display in the top-left corner
12. Skip title screen — start gameplay immediately

CRITICAL Canvas2D rules (DO NOT BREAK):
- For gradients use ctx.createLinearGradient() NOT CSS strings like "linear-gradient(...)"
- fillStyle only accepts color strings (#hex, rgb(), rgba()) or CanvasGradient objects
- Always clear/fill the canvas each frame with a dark background color
- Keep the game simple but visually interesting with shapes and colors
- Use a dark background (#0a0a1a or similar) with bright colored game elements

Return ONLY the JavaScript code. No markdown code fences, no explanation.
The code must be a complete, self-contained script that defines startGame at the top level.`;
}

// Streaming version — sends SSE events as code is generated
export async function generateGameStream(genre, theme, modifier, cardLevels, extraInstructions, res) {
  const prompt = buildPrompt(genre, theme, modifier, cardLevels, extraInstructions);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  let fullCode = '';

  const stream = await client.messages.stream({
    model: 'claude-opus-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      fullCode += event.delta.text;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: event.delta.text })}\n\n`);
    }
  }

  // Strip markdown fences
  fullCode = fullCode.replace(/^```(?:javascript|js)?\n?/m, '').replace(/\n?```$/m, '');
  fullCode = sanitizeGameCode(fullCode);

  const title = `${theme.toUpperCase()} ${genre.toUpperCase()}${modifier ? ' + ' + modifier.toUpperCase() : ''}`;

  // Send final complete event
  const result = {
    type: 'done',
    gameCode: fullCode,
    title,
    description: `A ${theme} ${genre} mini-game${modifier ? ` with ${modifier}` : ''}`,
  };
  res.write(`data: ${JSON.stringify(result)}\n\n`);
  res.end();
  return result;
}
