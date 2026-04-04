import Anthropic from '@anthropic-ai/sdk';
import { sanitizeGameCode } from './sanitize.js';
import { log, addLogUpdate } from './logger.js';

const GENRE_DESCRIPTIONS = {
  platformer: 'A side-scrolling platformer where the player jumps between platforms, avoids hazards, and collects items. Player moves left/right and jumps.',
  shooter: 'A top-down or side-scrolling shooter where the player fires projectiles at enemies. Enemies spawn in waves and drop toward the player.',
  puzzle: 'A puzzle game with logic mechanics — matching, sorting, or pattern recognition. Clear conditions are met by solving the puzzle.',
  runner: 'An endless runner where the player automatically moves forward and must jump/duck to avoid obstacles. Speed increases over time.',
  dodge: 'A dodge game where obstacles fall/fly from edges and the player must avoid them. Survival time equals score.',
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
export async function generateGameStream(genre, theme, modifier, cardLevels, extraInstructions, apiKey, res) {
  const prompt = buildPrompt(genre, theme, modifier, cardLevels, extraInstructions);

  const client = new Anthropic({ apiKey });

  const logEntry = {
    type: 'game', genre, theme, modifier, status: 'generating',
    message: `Generating game: ${genre} + ${theme}`,
    startTime: Date.now(),
    prompt: prompt,
    promptLength: prompt.length,
    model: 'claude-opus-4-20250514',
    response: '',
  };
  log(logEntry);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  let fullCode = '';

  try {
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
  } catch (err) {
    addLogUpdate(logEntry.id, { status: 'error', error: err.message, duration: Date.now() - logEntry.startTime });
    throw err;
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

  addLogUpdate(logEntry.id, { status: 'done', duration: Date.now() - logEntry.startTime, title: result.title, codeLength: result.gameCode?.length, response: fullCode.slice(0, 2000) });

  return result;
}
