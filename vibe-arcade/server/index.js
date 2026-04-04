import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateGameStream } from './generate.js';
import { getLogs } from './logger.js';
import { reviewGame } from './review.js';

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


app.post('/api/review', async (req, res) => {
  const { apiKey, gameCode, genre, theme, modifier, npcScore } = req.body;
  if (!apiKey || !gameCode) {
    return res.status(400).json({ error: 'apiKey and gameCode required' });
  }
  try {
    const review = await reviewGame(apiKey, gameCode, genre, theme, modifier, npcScore);
    res.json(review);
  } catch (err) {
    console.error('Review failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', (req, res) => {
  res.json(getLogs());
});

app.get('/logs', (req, res) => {
  res.send(buildLogsDashboard());
});

app.listen(PORT, () => {
  console.log(`🏪 Vibe Arcade server running at http://localhost:${PORT}`);
});

function buildLogsDashboard() {
  return `<!DOCTYPE html>
<html><head>
<title>Vibe Arcade - Logs</title>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 20px; margin: 0; }
  h1 { color: #4fc3f7; margin-bottom: 10px; }
  .subtitle { color: #888; margin-bottom: 20px; font-size: 14px; }
  #logs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  #logs-table th { background: #2a2a4e; padding: 10px 8px; text-align: left; color: #4fc3f7; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  #logs-table td { padding: 8px; border-bottom: 1px solid #2a2a3e; }
  #logs-table tr:hover { background: rgba(79,195,247,0.05); }
  .status-generating { color: #f39c12; }
  .status-done { color: #2ecc71; }
  .status-error { color: #e74c3c; }
  .duration { color: #888; }
  .refresh-info { color: #555; font-size: 12px; margin-top: 10px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-game { background: rgba(155,89,182,0.2); color: #9b59b6; }
  .badge-pinball { background: rgba(230,126,34,0.2); color: #e67e22; }
</style>
</head><body>
<h1>Vibe Arcade \u2014 Live Logs</h1>
<p class="subtitle">Auto-refreshes every 2 seconds</p>
<div id="logs-container">
  <table id="logs-table">
    <thead><tr>
      <th>Time</th><th>Type</th><th>Genre</th><th>Theme</th><th>Status</th><th>Duration</th><th>Details</th>
    </tr></thead>
    <tbody id="logs-body"></tbody>
  </table>
</div>
<p class="refresh-info">Showing last 100 entries</p>
<script>
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}
function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}
function setText(el, val) {
  el.textContent = val || '';
}
function render(logs) {
  var tbody = document.getElementById('logs-body');
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  for (var i = 0; i < logs.length; i++) {
    var l = logs[i];
    var tr = document.createElement('tr');
    var tdTime = document.createElement('td');
    setText(tdTime, formatTime(l.timestamp));
    var tdType = document.createElement('td');
    var badge = document.createElement('span');
    badge.className = 'badge ' + (l.type === 'pinball' ? 'badge-pinball' : 'badge-game');
    setText(badge, l.type || '?');
    tdType.appendChild(badge);
    var tdGenre = document.createElement('td');
    setText(tdGenre, l.genre || '-');
    var tdTheme = document.createElement('td');
    setText(tdTheme, l.theme || '-');
    var tdStatus = document.createElement('td');
    tdStatus.className = 'status-' + (l.status || 'info');
    setText(tdStatus, l.status || '-');
    var tdDuration = document.createElement('td');
    tdDuration.className = 'duration';
    setText(tdDuration, formatDuration(l.duration));
    var tdDetails = document.createElement('td');
    setText(tdDetails, l.title || l.error || l.message || '-');
    tr.appendChild(tdTime);
    tr.appendChild(tdType);
    tr.appendChild(tdGenre);
    tr.appendChild(tdTheme);
    tr.appendChild(tdStatus);
    tr.appendChild(tdDuration);
    tr.appendChild(tdDetails);
    tbody.appendChild(tr);
  }
}
async function refresh() {
  try {
    var response = await fetch('/api/logs');
    var logs = await response.json();
    render(logs);
  } catch (e) {}
}
refresh();
setInterval(refresh, 2000);
</script>
</body></html>`;
}
