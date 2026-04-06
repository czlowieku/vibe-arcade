import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeGameCode } from './sanitize.js';
import { log, addLogUpdate } from './logger.js';

// Remove a "class Name {..}" or "function Name(...) {..}" block using brace-counting
// searchFrom: start searching from this index (to skip the first occurrence)
function stripBlock(code, pattern, searchFrom = 0) {
  const idx = code.indexOf(pattern, searchFrom);
  if (idx === -1) return code;
  const braceStart = code.indexOf('{', idx);
  if (braceStart === -1) return code;
  let depth = 1;
  let i = braceStart + 1;
  while (i < code.length && depth > 0) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') depth--;
    i++;
  }
  let lineStart = code.lastIndexOf('\n', idx);
  if (lineStart === -1) lineStart = 0; else lineStart++;
  return code.slice(0, lineStart) + code.slice(i);
}

const GENRE_DESCRIPTIONS = {
  platformer: 'A side-scrolling platformer where the player jumps between platforms, avoids hazards, and collects items. Player moves left/right and jumps. Design interesting level layouts with moving platforms, gaps, and enemies.',
  shooter: 'A top-down or side-scrolling shooter where the player fires projectiles at enemies. Enemies spawn in waves with different movement patterns. Add satisfying hit effects and screen shake.',
  puzzle: 'A puzzle game with creative mechanics — could be matching, sorting, pattern recognition, sliding, stacking, or anything clever. Make the player think! Clear conditions should feel satisfying.',
  runner: 'An endless runner where the player automatically moves forward and must jump/duck/dodge obstacles. Speed increases over time. Add variety — different obstacle types, collectibles, terrain changes.',
  dodge: 'A dodge game where threats come from all directions — falling objects, lasers, projectiles, expanding circles. Be creative with obstacle patterns! Survival time = score. Make it feel intense.',
  breakout: 'A breakout/arkanoid game — paddle at bottom, ball bounces off bricks. Add creative brick layouts, power-ups that fall from destroyed bricks (wider paddle, multi-ball, sticky paddle, laser). Ball speed increases over time.',
  snake: 'A snake game — player controls a growing snake/worm. Eating food makes you longer. Dont hit walls or yourself. Add creative twists — special food types, obstacles that appear, speed changes. Make the arena interesting.',
  'tower-defense': 'A simple tower defense — enemies walk a path, player places/upgrades 2-3 tower types by clicking. Towers auto-shoot. Waves get harder. Keep it simple but satisfying — show enemy health bars, tower ranges, satisfying projectile effects.',
  fighting: 'A 1v1 fighting game — player vs AI opponent. Simple controls: move, punch, kick, block. Add a health bar for each fighter, hit effects, knockback. AI should be beatable but put up a good fight. Best of 1 round, 60 second timer.',
};

const THEME_DESCRIPTIONS = {
  neon: 'Neon/cyberpunk aesthetic: glowing outlines, dark backgrounds (#0a0a1a), bright cyan (#00fff5), magenta (#ff00ff), yellow (#ffe600). Everything should glow and pulse. Add glow trails, neon reflections.',
  space: 'Deep space aesthetic: animated starfield background, planets, asteroids, nebulae. Colors: dark navy, white stars, orange/red for dangers, blue for player. Add twinkling stars and particle effects.',
  retro: '8-bit retro pixel aesthetic: chunky blocky shapes, limited color palette. Feels like a classic Game Boy or NES game. Pixel-perfect edges, screen flash effects, chiptune-style visual rhythm.',
  ocean: 'Underwater ocean aesthetic: blue-green gradients, animated bubbles rising, fish swimming by, coral, seaweed swaying. Colors: teals, deep blues, sandy yellows. Everything feels floaty.',
  forest: 'Enchanted forest aesthetic: greens, browns, magical sparkles. Trees, mushrooms, fireflies floating around. Colors: forest greens, earth browns, golden glows. Leaf particles drifting down.',
  horror: 'Dark horror aesthetic: nearly black background with dim red/purple lighting. Flickering effects, fog/mist, eerie shapes in shadows. Enemies should look creepy. Sudden visual flashes for scares. Colors: black, blood red, sickly green, bone white.',
  candy: 'Sweet candy aesthetic: bright pastels, pink/purple/yellow/mint. Everything looks edible — striped candy canes, gummy shapes, lollipop trees, chocolate platforms. Sparkly effects, rainbow trails. Happy and colorful.',
  samurai: 'Japanese ink-wash aesthetic: elegant brushstroke style, cherry blossom petals falling, paper/parchment textures. Colors: white/cream background with bold black ink, red accents, pink sakura. Minimalist but beautiful.',
  steampunk: 'Victorian steampunk aesthetic: brass/copper/bronze colors, visible gears and cogs, steam puffs, riveted metal plates. Dark brown backgrounds with warm orange/amber lighting. Clockwork mechanisms, pipes, gauges.',
};

const MODIFIER_DESCRIPTIONS = {
  'speed-up': 'The game progressively gets faster every 10 seconds. Start chill, end frantic. Show a visible speed indicator. The acceleration should feel exciting not frustrating.',
  'gravity-flip': 'Pressing Space or G reverses gravity. Player falls upward or downward. Design the level/arena to make gravity flipping FUN — put collectibles on ceilings, have hazards that require flipping to dodge.',
  'time-limit': 'Strict 60-second countdown. Big visible timer. Score as much as possible before time runs out. Add a "HURRY UP!" visual at 10 seconds. Final score should feel earned.',
  boss: 'A boss enemy appears after 30 seconds. Give it a health bar, 2-3 distinct attack patterns, and telegraphed moves. Make the fight feel epic — screen shake on hits, dramatic entrance. Defeating the boss = victory.',
  powerups: 'Add a power-up system that fits the game genre. Spawn collectible power-ups periodically — design 3-5 creative power-ups that make sense for this specific game (e.g. a shooter might have rapid fire, homing bullets, or a shield; a platformer might have double jump, magnet coins, or invincibility). Each power-up should have a distinct color/icon, last 5-8 seconds, and visually show when active. Be creative — surprise the player with fun combinations.',
  combo: 'Add a combo/chain system — consecutive hits/actions without pause build a multiplier (x2, x3, x4... up to x10). Show the combo counter prominently. Combo resets after 2 seconds of no action. Higher combos = way more points. Add visual flair as combo grows (screen effects, color changes).',
  survival: 'Endless survival mode — waves of increasing difficulty, no time limit. New enemy types appear every 30 seconds. Show wave number. The question is how long can you survive? Add brief moments of calm between waves.',
  tiny: 'Everything is 50% smaller than normal — player, enemies, projectiles, platforms. But speed is 50% faster. The arena feels huge but everything zips around. Chaotic and fun.',
  mirror: 'Controls are horizontally reversed — left goes right, right goes left. Up and down stay normal. This should be disorienting but playable. Add a visual "mirror" effect to remind the player (maybe a subtle horizontal flip on the UI).',
};

function buildAssemblerPrompt(genre, theme, modifier, codeBundle, extraInstructions) {
  const { mergedCode, scaffold, aiContext } = codeBundle;

  let modifierSection = '';
  if (modifier && MODIFIER_DESCRIPTIONS[modifier]) {
    modifierSection = `\nSpecial Modifier: ${modifier}\n${MODIFIER_DESCRIPTIONS[modifier]}`;
  }

  return `Create a complete, playable Canvas2D mini-game by combining the provided utility modules with a game loop.

=== GAME SPEC ===
Genre: ${genre} — ${GENRE_DESCRIPTIONS[genre] || genre}
Visual Theme: ${theme} — ${THEME_DESCRIPTIONS[theme] || theme}
${modifierSection}
${extraInstructions ? `\nExtra instructions: ${extraInstructions}\n` : ''}

=== UTILITY MODULES (include these at the top of your output, then use them) ===
${mergedCode}

=== HOW TO USE THEM ===
${aiContext}

${scaffold ? `=== GAME SCAFFOLD (fill this in as your startGame) ===\n${scaffold}\n` : ''}

=== WHAT TO OUTPUT ===
Output a COMPLETE JavaScript file with this structure:
1. First: paste ALL the utility code from above (classes, functions, constants) exactly as-is
2. Then: write a function startGame(canvas, onScore, onGameOver) that uses those utilities
   - canvas is 800x600 HTMLCanvasElement, use canvas.getContext('2d')
   - requestAnimationFrame game loop
   - Arrow keys + WASD + Space for input
   - onScore(points) on scoring, onGameOver(finalScore) on game end
   - Fun gameplay lasting 30-90 seconds with visible score
   - Dark background, clear canvas each frame
   - For gradients: ctx.createLinearGradient(), NOT CSS strings
   - Skip title screen — gameplay starts immediately

IMPORTANT: Your very first line must be a comment with a creative game title, like:
// TITLE: Neon Gravity Blaster

Then the rest of the JavaScript code. No markdown fences, no other explanation.`;
}

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

IMPORTANT: Your very first line must be a comment with a creative game title, like:
// TITLE: Neon Gravity Blaster

Then the rest of the JavaScript code. No markdown fences, no other explanation.
The code must be a complete, self-contained script that defines startGame at the top level.`;
}

// Streaming via Anthropic Claude
async function streamAnthropic(prompt, apiKey, res, logEntry) {
  const client = new Anthropic({ apiKey });
  let fullCode = '';

  const stream = await client.messages.stream({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      fullCode += event.delta.text;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: event.delta.text })}\n\n`);
    }
  }

  return fullCode;
}

// Streaming via Google Gemini
async function streamGemini(prompt, apiKey, res, logEntry) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
  let fullCode = '';

  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 16000,
      temperature: 1,
      thinkingConfig: { thinkingBudget: 8000 },
    },
  });

  for await (const chunk of result.stream) {
    // Only take text parts, skip thinking parts
    const candidates = chunk.candidates;
    if (!candidates || !candidates[0]?.content?.parts) continue;
    for (const part of candidates[0].content.parts) {
      if (part.thought) continue; // skip thinking
      if (part.text) {
        fullCode += part.text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: part.text })}\n\n`);
      }
    }
  }

  return fullCode;
}

// Streaming version — sends SSE events as code is generated
export async function generateGameStream(genre, theme, modifier, cardLevels, extraInstructions, apiKey, res, codeBundle, provider) {
  const prompt = codeBundle
    ? buildAssemblerPrompt(genre, theme, modifier, codeBundle, extraInstructions)
    : buildPrompt(genre, theme, modifier, cardLevels, extraInstructions);

  const isGemini = provider === 'gemini';
  const modelName = isGemini ? 'gemini-3.1-pro-preview' : 'claude-opus-4-20250514';

  const logEntry = {
    type: 'game', genre, theme, modifier, status: 'generating',
    message: `Generating game: ${genre} + ${theme}`,
    startTime: Date.now(),
    prompt: prompt,
    promptLength: prompt.length,
    model: modelName,
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
    fullCode = isGemini
      ? await streamGemini(prompt, apiKey, res, logEntry)
      : await streamAnthropic(prompt, apiKey, res, logEntry);
  } catch (err) {
    addLogUpdate(logEntry.id, { status: 'error', error: err.message, duration: Date.now() - logEntry.startTime });
    throw err;
  }

  // Strip thinking tags, markdown fences, and any non-code text
  fullCode = fullCode.replace(/<think>[\s\S]*?<\/think>/g, '');
  fullCode = fullCode.replace(/\[thinking\][\s\S]*?\[\/thinking\]/g, '');
  // Extract code from markdown fence if present
  const fenceMatch = fullCode.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
  if (fenceMatch) {
    fullCode = fenceMatch[1];
  } else {
    // Strip any leading/trailing fences
    fullCode = fullCode.replace(/^```(?:javascript|js)?\n?/gm, '').replace(/\n?```\s*$/gm, '');
  }
  // Strip any leading text before first function/const/let/var/class
  const codeStart = fullCode.search(/^(function |const |let |var |class |\/\/|\/\*)/m);
  if (codeStart > 0) {
    fullCode = fullCode.slice(codeStart);
  }
  fullCode = fullCode.trim();

  // Validate JS syntax before sending — try to auto-fix common issues
  // NOTE: new Function() is intentionally used here to validate AI-generated game code syntax.
  // This is the core mechanic of Vibe Arcade — AI generates game code that we execute.
  // The code is already sanitized by sanitizeGameCode() to block dangerous patterns.
  try {
    new Function(fullCode); // eslint-disable-line no-new-func
  } catch (syntaxErr) {
    console.warn(`[syntax-fix] Generated code has error: ${syntaxErr.message}`);
    // Try stripping everything after the last complete function/class closing brace
    // Common issue: AI appends explanation text or incomplete code at the end
    const lines = fullCode.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed === '}' || trimmed === '};') {
        const candidate = lines.slice(0, i + 1).join('\n');
        try {
          new Function(candidate); // eslint-disable-line no-new-func
          console.log(`[syntax-fix] Fixed by trimming after line ${i + 1}`);
          fullCode = candidate;
          break;
        } catch (e) {
          // keep trying earlier lines
        }
      }
    }
  }

  fullCode = sanitizeGameCode(fullCode);
  console.log(`[pipeline] ${fullCode.length} chars | startGame: ${fullCode.includes('function startGame')}`);

  // Extract AI-generated title from first comment line
  const titleMatch = fullCode.match(/^\/\/\s*TITLE:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : `${theme.toUpperCase()} ${genre.toUpperCase()}${modifier ? ' + ' + modifier.toUpperCase() : ''}`;

  const result = {
    type: 'done',
    gameCode: fullCode,
    title,
    description: `A ${theme} ${genre} mini-game${modifier ? ` with ${modifier}` : ''}`,
  };
  res.write(`data: ${JSON.stringify(result)}\n\n`);
  res.end();

  addLogUpdate(logEntry.id, { status: 'done', duration: Date.now() - logEntry.startTime, title: result.title, codeLength: result.gameCode?.length, response: fullCode });

  return result;
}
