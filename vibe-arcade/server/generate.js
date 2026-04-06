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
  powerups: 'Add a power-up system that fits the game genre. Spawn collectible power-ups periodically — design 3-5 creative power-ups that make sense for this specific game (e.g. a shooter might have rapid fire, homing bullets, or a shield; a platformer might have double jump, magnet coins, or invincibility). Each power-up should have a distinct color/icon, last 5-8 seconds, and visually show when active. Be creative — surprise the player with fun combinations.',
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

Return ONLY JavaScript code. No markdown fences, no explanation.`;
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

Return ONLY the JavaScript code. No markdown code fences, no explanation.
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

  const hasStartGame = fullCode.includes('function startGame') || fullCode.includes('startGame =');
  console.log(`[pipeline] ${fullCode.length} chars | startGame: ${hasStartGame}`);

  console.log(`[pipeline] ${fullCode.length} chars | startGame: ${hasStartGame} | syntax: ${syntaxOk}`);
  if (!hasStartGame) {
    console.warn('[pipeline] AI output start:', fullCode.slice(0, 500));
  }

  // If code is broken, retry once without module assembly (plain generation)
  if (!hasStartGame || !syntaxOk) {
    console.log('[pipeline] Code broken — retrying with plain generation...');
    const retryPrompt = buildPrompt(genre, theme, modifier, cardLevels, extraInstructions);
    let retryCode = '';
    try {
      retryCode = isGemini
        ? await streamGemini(retryPrompt, apiKey, res, logEntry)
        : await streamAnthropic(retryPrompt, apiKey, res, logEntry);
      retryCode = retryCode.replace(/<think>[\s\S]*?<\/think>/g, '');
      const retryFence = retryCode.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
      if (retryFence) retryCode = retryFence[1];
      else retryCode = retryCode.replace(/^```(?:javascript|js)?\n?/gm, '').replace(/\n?```\s*$/gm, '');
      const retryStart = retryCode.search(/^(function |const |let |var |class |\/\/|\/\*)/m);
      if (retryStart > 0) retryCode = retryCode.slice(retryStart);
      retryCode = retryCode.trim();
      retryCode = sanitizeGameCode(retryCode);
      if (retryCode.includes('function startGame') || retryCode.includes('startGame =')) {
        console.log('[pipeline] Retry succeeded!');
        fullCode = retryCode;
      }
    } catch (retryErr) {
      console.warn('[pipeline] Retry also failed:', retryErr.message);
    }
  }

  const title = `${theme.toUpperCase()} ${genre.toUpperCase()}${modifier ? ' + ' + modifier.toUpperCase() : ''}`;

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
