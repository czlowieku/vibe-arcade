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
  rhythm: 'A rhythm game — notes/arrows fall from top, player presses matching keys (arrow keys or WASD) when they hit the target line. Score based on timing accuracy (Perfect/Good/Miss). Generate a pattern of notes that feels musical with varying speeds. Show combo counter and accuracy rating.',
  golf: 'A 2D mini golf game — top-down view. Player aims with arrow keys, holds Space to set power, releases to shoot. Ball physics with bouncing off walls. Design 1 creative hole with obstacles (bumpers, moving walls, water hazards). Hole-in-one bonus. Par score shown.',
  racing: 'A top-down racing game — player car drives on a track, steers left/right, accelerates/brakes. 2-3 AI opponents. Finish 3 laps to win. Add drifting (visual skid marks), speed boosts on track, and collision with walls slows you down. Show lap counter and positions.',
  fishing: 'A fishing game — cast line with Space (hold for distance), wait for a bite (bobber animation), then reel in with timed key presses. Different fish types worth different points. Some fish fight harder (rapid key mashing). Relaxing but engaging. Show catch count and total weight.',
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
  desert: 'Scorching desert aesthetic: golden sand dunes, blazing sun, heat shimmer effect. Colors: sandy gold, burnt orange, deep blue sky. Add cacti, pyramids in distance, sand particles blowing. Everything feels hot and dry.',
  arctic: 'Frozen arctic aesthetic: white/ice blue palette, snowflakes falling, aurora borealis in sky (animated color bands). Slippery surfaces, ice crystals, frosty breath effects. Colors: white, ice blue, deep navy, green/purple aurora.',
  lava: 'Volcanic aesthetic: black rock with glowing orange/red lava cracks. Rivers of lava flowing, embers floating upward, volcanic eruptions in background. Colors: black, deep red, bright orange, yellow-hot. Everything feels dangerous and hot.',
  matrix: 'Matrix/digital aesthetic: black background with falling green code characters (rain effect). Glitch effects, digital scan lines, wireframe objects that occasionally solidify. Colors: black, bright green (#00ff00), white flashes. Reality feels unstable.',
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
  'fog-of-war': 'Only a small circle around the player is visible — the rest of the screen is dark/fogged. Radius is about 120px. Things outside the circle are hidden. Creates tension — enemies and obstacles appear suddenly. Add a subtle glow at the edge of visibility.',
  'one-hit': 'Player dies in one hit — no health bar, no second chances. But score multiplier is always x3 to reward the risk. Add a dramatic death effect (explosion, slow-mo flash). Makes every moment tense. Show "HARDCORE" badge on screen.',
  growing: 'Player character grows 10% bigger every 10 seconds. Starts tiny, ends huge. Bigger = easier to hit but also more powerful. Hitbox grows with visual size. At max size the screen feels cramped. Show current size percentage.',
  split: 'Player controls TWO characters simultaneously — one on left half, one on right half. Same inputs control both but mirrored. Both must survive. If one dies, game over. Double the chaos, double the fun. Draw a dividing line down the middle.',
};

function buildAssemblerPrompt(genre, theme, modifier, codeBundle, extraInstructions) {
  const { mergedCode, scaffold, aiContext } = codeBundle;

  let modifierSection = '';
  if (modifier && MODIFIER_DESCRIPTIONS[modifier]) {
    modifierSection = `\nSpecial Modifier: ${modifier}\n${MODIFIER_DESCRIPTIONS[modifier]}`;
  }

  return `Write ONLY a startGame function for a Canvas2D mini-game.

Genre: ${genre} — ${GENRE_DESCRIPTIONS[genre] || genre}
Theme: ${theme} — ${THEME_DESCRIPTIONS[theme] || theme}
${modifierSection}
${extraInstructions ? `\nExtra: ${extraInstructions}\n` : ''}

The following utility code is ALREADY LOADED in the environment (for reference only — do NOT copy it into your output):
${mergedCode}

How to use them:
${aiContext}

${scaffold ? `Scaffold template:\n${scaffold}\n` : ''}

OUTPUT RULES:
- First line: // TITLE: Your Creative Game Name
- Then: function startGame(canvas, onScore, onGameOver) { ... }
- You may add small helper functions AFTER startGame if needed
- DO NOT output any classes or functions that already exist above (they are pre-loaded)
- Canvas is 800x600, use canvas.getContext('2d')
- requestAnimationFrame game loop, arrow keys + WASD + Space
- onScore(points) on scoring, onGameOver(finalScore) on game end
- Fun gameplay 30-90 seconds, visible score, dark background
- Gradients: ctx.createLinearGradient() not CSS strings
- Leave safe zone around player spawn, 1-2s grace period at start
- No markdown fences, no explanation, ONLY JavaScript code`;
}

function buildPrompt(genre, theme, modifier, cardLevels, extraInstructions) {
  let modifierSection = '';
  if (modifier && MODIFIER_DESCRIPTIONS[modifier]) {
    modifierSection = `\n=== MODIFIER: ${modifier} ===\n${MODIFIER_DESCRIPTIONS[modifier]}`;
  }

  return `You are a game developer creating a polished, fun Canvas2D mini-game. Make it feel like a real indie game, not a tech demo.

=== GAME CONCEPT ===
Genre: ${genre} — ${GENRE_DESCRIPTIONS[genre] || genre}
Theme: ${theme} — ${THEME_DESCRIPTIONS[theme] || theme}
${modifierSection}
${extraInstructions ? `\nPlayer request: ${extraInstructions}` : ''}

=== GAME DESIGN REQUIREMENTS ===
Make this game GENUINELY FUN. Think about:
- GAME FEEL: Responsive controls, satisfying feedback (screen shake, particles, flash effects on hits/collects)
- PROGRESSION: Game should get harder over time — start easy, ramp difficulty every 15-20 seconds
- JUICE: Add particles on explosions/collects, screen flash on damage, smooth animations, trail effects
- VARIETY: Randomize enemy patterns, spawn positions, obstacle layouts — no two runs should feel the same
- SCORING: Reward skill — combos, close calls, speed bonuses. Show score prominently with +points popup
- POLISH: Smooth movement (use lerp/easing, not teleporting), camera shake on impacts, death animation before game over
- PLAYER SPAWN: Start player in a safe zone. Give 1-2 seconds invincibility at start (blinking effect)
- PACING: 30-90 seconds per game. Build tension toward the end

=== VISUAL STYLE ===
- Apply the ${theme} theme HEAVILY — this is what makes each game unique
- Use at least 5-6 colors from the theme palette
- Animated background (not static) — particles, scrolling, pulsing
- UI elements styled to match theme (score display, health bar if any)
- Entity variety — at least 3-4 different enemy/obstacle types with distinct appearances

=== CONTROLS ===
- Choose the best controls for the genre — keyboard, mouse, or both
- Keyboard: arrow keys + WASD + Space (window.addEventListener keydown/keyup)
- Mouse: canvas.addEventListener mousemove/click for aiming, shooting, dragging, etc.
- IMPORTANT: Draw a small controls hint on screen during the first 3 seconds (e.g. "WASD to move, Click to shoot" or "Mouse to aim, Space to fire")
- The hint should fade out after 3 seconds

=== TECHNICAL REQUIREMENTS ===
1. Define: function startGame(canvas, onScore, onGameOver)
2. Canvas is 800x600, use canvas.getContext('2d')
3. onScore(points) when scoring, onGameOver(finalScore) when game ends
4. requestAnimationFrame game loop with delta time (not frame-counting)
5. Use ONLY Canvas2D — no images, no external resources, no fetch
6. For gradients: ctx.createLinearGradient(), NEVER CSS strings
7. fillStyle accepts only: '#hex', 'rgb()', 'rgba()', or CanvasGradient
8. Clear/fill canvas every frame

=== OUTPUT FORMAT ===
First line: // TITLE: Your Creative Game Title
Then: complete self-contained JavaScript code.
No markdown fences. No explanation. Just code.`;
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
  // Always use plain generation — modules were causing more problems than they solved
  const prompt = buildPrompt(genre, theme, modifier, cardLevels, extraInstructions);

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

  // Extract title
  const titleMatch = fullCode.match(/^\/\/\s*TITLE:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : `${theme.toUpperCase()} ${genre.toUpperCase()}${modifier ? ' + ' + modifier.toUpperCase() : ''}`;

  console.log(`[pipeline] ${fullCode.length} chars | startGame: ${fullCode.includes('function startGame')}`);

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
