import Anthropic from '@anthropic-ai/sdk';
import { log, addLogUpdate } from './logger.js';

// Client created per-request with apiKey from frontend

function buildPinballPrompt(genre, theme, modifier, cardLevels, extraInstructions) {
  const themeGuides = {
    neon: 'dark background (#0a0a1a), bright cyan (#00fff5) and magenta (#ff00ff) accents, everything glows, high contrast neon palette',
    space: 'dark navy/black background (#050510), deep blue and indigo surfaces, white/silver bumpers, orange/red danger elements, star-like particle effects',
    retro: 'warm muted tones, cream/tan playfield (#f5e6c8), red and gold bumpers, earthy browns for rails, limited classic arcade color palette',
    ocean: 'deep blue-green background (#0a2a3a), teal and aquamarine bumpers, sandy yellow lanes, coral/seafoam accents, bubble-like particles',
    forest: 'dark green background (#0a1a0a), forest green and earthy brown elements, golden-glow bumpers, mossy texture implied by colors, firefly-like particle effects',
  };

  const genreRules = {
    roguelike: `"genreRules": { "onBallLost": "increase_difficulty", "difficultyScale": 1.2 }`,
    hyper: `"genreRules": { "gravityMultiplier": 1.5, "scoreMultiplier": 2 }`,
    multiball: `"genreRules": { "startBalls": 3, "maxBalls": 6, "newBallInterval": 15 }`,
    classic: `"genreRules": { "standard": true }`,
  };

  const modifierRules = {
    'speed-up': `"modifierRules": { "ballSpeedIncrease": 0.05, "intervalSeconds": 10, "maxSpeedMultiplier": 2.5 }`,
    'gravity-flip': `"modifierRules": { "gravityFlipKey": "Space", "flipCooldownSeconds": 3 }`,
    'time-limit': `"modifierRules": { "timeLimitSeconds": 60, "showCountdown": true }`,
    boss: `"modifierRules": { "bossAppearAfterSeconds": 30, "bossHitPoints": 10, "bossScoreBonus": 5000 }`,
    powerups: `"modifierRules": { "powerupTypes": ["speed","shield","doublePoints","sizeChange"], "powerupDurationSeconds": 5, "spawnIntervalSeconds": 15 }`,
  };

  const themeDesc = themeGuides[theme] || theme;
  const genreRule = genreRules[genre] || `"genreRules": { "standard": true }`;
  const modifierRule = modifier && modifierRules[modifier]
    ? modifierRules[modifier]
    : `"modifierRules": {}`;

  return `Generate a pinball table configuration as a single JSON object. Return ONLY the JSON — no markdown, no code fences, no explanation, no comments.

INPUTS:
- Genre: ${genre}
- Theme: ${theme}
- Modifier: ${modifier || 'none'}
${extraInstructions ? `- Extra instructions: ${extraInstructions}` : ''}

COORDINATE SYSTEM:
- X axis: -0.5 (left wall) to +0.5 (right wall). Safe play area: -0.28 to +0.28.
- Z axis: -0.7 (top) to +0.7 (bottom/drain). Safe play area: -0.55 (top zone) to +0.6 (near flippers).
- Bumpers should cluster in top/mid zone: z between -0.55 and -0.1.
- Ramps span from mid-field toward the sides.
- Lanes run vertically (startZ < endZ), placed at x offsets from center.
- Targets scatter across mid-field: z between -0.4 and +0.1.
- Walls (slingshots/rails) sit just above flippers: z between +0.2 and +0.5.

PLACEMENT REQUIREMENTS:
- bumpers: exactly 4 to 8. Each has: x (-0.28..0.28), z (-0.55..-0.1), radius (0.02..0.05), score (50..200), type ("round" or "mushroom").
- ramps: exactly 1 to 3. Each has: startX, startZ, endX, endZ, height (always 0.06), scoreMultiplier (2..5).
- lanes: exactly 0 to 3. Each has: x, width (always 0.04), startZ, endZ, score (100..500).
- targets: exactly 2 to 5. Each has: x, z, type ("dropdown" or "standup"), score (100..300).
- walls: exactly 2 to 4. Each has: x1, z1, x2, z2, type ("slingshot" or "rail"), score (0..50).

THEME COLORS (${theme}):
${themeDesc}
Apply this palette to playfieldColor, bumperColor, bumperEmissive, rampColor, wallColor, particleColor. glowIntensity: 0.5..2.0.

GENRE RULES (${genre}):
Use this for the genreRules field: ${genreRule}

MODIFIER RULES (${modifier || 'none'}):
Use this for the modifierRules field: ${modifierRule}

OUTPUT SCHEMA (follow exactly):
{
  "tableName": "<thematic name in SCREAMING_SNAKE_CASE, e.g. NEON_STORM>",
  "layout": {
    "bumpers": [ { "x": float, "z": float, "radius": float, "score": int, "type": "round"|"mushroom" } ],
    "ramps": [ { "startX": float, "startZ": float, "endX": float, "endZ": float, "height": 0.06, "scoreMultiplier": int } ],
    "lanes": [ { "x": float, "width": 0.04, "startZ": float, "endZ": float, "score": int } ],
    "targets": [ { "x": float, "z": float, "type": "dropdown"|"standup", "score": int } ],
    "walls": [ { "x1": float, "z1": float, "x2": float, "z2": float, "type": "slingshot"|"rail", "score": int } ]
  },
  "scoring": {
    "bumperBase": int,
    "rampBonus": int,
    "comboMultiplier": bool,
    "comboTimeout": int
  },
  "balls": 3,
  "visualStyle": {
    "playfieldColor": "#hex",
    "bumperColor": "#hex",
    "bumperEmissive": "#hex",
    "rampColor": "#hex",
    "wallColor": "#hex",
    "glowIntensity": float,
    "particleColor": "#hex"
  },
  ${genreRule},
  ${modifierRule}
}

Return ONLY the JSON object. Nothing else.`;
}

export async function generatePinballConfig(genre, theme, modifier, cardLevels, extraInstructions, apiKey, res) {
  const prompt = buildPinballPrompt(genre, theme, modifier, cardLevels, extraInstructions);

  const logEntry = { type: 'pinball', genre, theme, modifier, status: 'generating', message: `Generating pinball: ${genre} + ${theme}`, startTime: Date.now() };
  log(logEntry);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  let fullResponse = '';

  try {
    const client = new Anthropic({ apiKey });
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: event.delta.text })}\n\n`);
      }
    }
  } catch (err) {
    addLogUpdate(logEntry.id, { status: 'error', error: err.message, duration: Date.now() - logEntry.startTime });
    throw err;
  }

  // Extract JSON from response
  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    addLogUpdate(logEntry.id, { status: 'error', error: 'No valid JSON in AI response', duration: Date.now() - logEntry.startTime });
    throw new Error('No valid JSON in AI response');
  }

  const config = JSON.parse(jsonMatch[0]);

  res.write(`data: ${JSON.stringify({ type: 'done', config, tableName: config.tableName || 'PINBALL' })}\n\n`);
  res.end();

  addLogUpdate(logEntry.id, { status: 'done', duration: Date.now() - logEntry.startTime, title: config.tableName, codeLength: fullResponse.length });

  return config;
}
