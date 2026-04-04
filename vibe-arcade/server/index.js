import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateGameStream } from './generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// SSE streaming endpoint
app.post('/api/generate', async (req, res) => {
  const { genre, theme, modifier, cardLevels, extraInstructions, apiKey } = req.body;

  if (!genre || !theme) {
    return res.status(400).json({ error: 'genre and theme are required' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required. Enter your Anthropic API key in settings.' });
  }

  try {
    console.log(`Generating game: ${genre} + ${theme}${modifier ? ' + ' + modifier : ''}`);
    const result = await generateGameStream(genre, theme, modifier, cardLevels || {}, extraInstructions || '', apiKey, res);
    console.log(`Game generated: ${result.title} (${result.gameCode.length} chars)`);
  } catch (err) {
    console.error('Generation failed:', err.message);
    // If headers already sent (streaming started), send error as SSE
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to generate game: ' + err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🏪 Vibe Arcade server running at http://localhost:${PORT}`);
});
