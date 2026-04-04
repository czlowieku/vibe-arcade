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
<title>Vibe Arcade - AI Logs</title>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; }
  .layout { display: flex; height: 100vh; }
  .sidebar { width: 380px; background: #1a1a2e; border-right: 1px solid #2a2a4e; overflow-y: auto; flex-shrink: 0; }
  .sidebar h1 { color: #4fc3f7; padding: 16px; font-size: 18px; border-bottom: 1px solid #2a2a4e; }
  .log-item { padding: 10px 16px; border-bottom: 1px solid #1f1f35; cursor: pointer; transition: background 0.15s; }
  .log-item:hover { background: #22223a; }
  .log-item.active { background: #2a2a50; border-left: 3px solid #4fc3f7; }
  .log-item .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .log-item .log-time { color: #666; font-size: 11px; }
  .log-item .log-title { font-weight: 600; font-size: 13px; }
  .log-item .log-meta { font-size: 11px; color: #888; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-right: 4px; }
  .badge-game { background: rgba(155,89,182,0.2); color: #9b59b6; }
  .badge-review { background: rgba(52,152,219,0.2); color: #3498db; }
  .status-generating { color: #f39c12; }
  .status-done { color: #2ecc71; }
  .status-error { color: #e74c3c; }
  .detail { flex: 1; overflow-y: auto; padding: 24px; }
  .detail-empty { color: #555; text-align: center; margin-top: 100px; font-size: 16px; }
  .detail h2 { color: #4fc3f7; margin-bottom: 16px; font-size: 20px; }
  .detail-section { margin-bottom: 20px; }
  .detail-section h3 { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .detail-section pre { background: #12121f; border: 1px solid #2a2a4e; border-radius: 8px; padding: 14px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; max-height: 500px; overflow-y: auto; font-family: 'Consolas', 'Fira Code', monospace; }
  .detail-section .prompt-pre { color: #81c784; }
  .detail-section .response-pre { color: #e0e0e0; }
  .detail-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .meta-card { background: #1a1a2e; border-radius: 8px; padding: 12px; }
  .meta-card .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .meta-card .value { font-size: 18px; font-weight: 700; }
  .auto-refresh { color: #444; font-size: 11px; padding: 8px 16px; border-top: 1px solid #2a2a4e; }
</style>
</head><body>
<div class="layout">
  <div class="sidebar">
    <h1>AI Conversations</h1>
    <div id="log-list"></div>
    <div class="auto-refresh">Auto-refresh 2s</div>
  </div>
  <div class="detail" id="detail">
    <div class="detail-empty">Select a conversation from the left</div>
  </div>
</div>
<script>
var allLogs = [];
var selectedId = null;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}
function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}
function escText(str) {
  var d = document.createElement('div');
  d.textContent = str || '';
  return d.textContent;
}

function renderList(logs) {
  allLogs = logs;
  var list = document.getElementById('log-list');
  list.replaceChildren();
  for (var i = 0; i < logs.length; i++) {
    var l = logs[i];
    var item = document.createElement('div');
    item.className = 'log-item' + (l.id === selectedId ? ' active' : '');
    item.dataset.id = l.id;

    var header = document.createElement('div');
    header.className = 'log-header';
    var title = document.createElement('span');
    title.className = 'log-title';
    title.textContent = l.title || l.genre + ' + ' + l.theme;
    var time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = formatTime(l.timestamp);
    header.appendChild(title);
    header.appendChild(time);

    var meta = document.createElement('div');
    meta.className = 'log-meta';
    var badge = document.createElement('span');
    badge.className = 'badge badge-' + (l.type || 'game');
    badge.textContent = l.type || 'game';
    meta.appendChild(badge);
    var status = document.createElement('span');
    status.className = 'status-' + (l.status || 'info');
    status.textContent = ' ' + (l.status || '') + (l.duration ? ' (' + formatDuration(l.duration) + ')' : '');
    meta.appendChild(status);

    item.appendChild(header);
    item.appendChild(meta);
    item.addEventListener('click', (function(id) { return function() { selectLog(id); }; })(l.id));
    list.appendChild(item);
  }
}

function selectLog(id) {
  selectedId = id;
  var log = allLogs.find(function(l) { return l.id === id; });
  if (!log) return;

  // Update active state
  var items = document.querySelectorAll('.log-item');
  items.forEach(function(el) {
    el.classList.toggle('active', parseInt(el.dataset.id) === id);
  });

  var detail = document.getElementById('detail');
  detail.replaceChildren();

  var h2 = document.createElement('h2');
  h2.textContent = (log.title || log.message || 'Generation') + (log.error ? ' (ERROR)' : '');
  detail.appendChild(h2);

  // Meta cards
  var metaGrid = document.createElement('div');
  metaGrid.className = 'detail-meta';

  var metas = [
    ['Model', log.model || 'claude'],
    ['Duration', formatDuration(log.duration)],
    ['Status', log.status || '-'],
    ['Genre', log.genre || '-'],
    ['Theme', log.theme || '-'],
    ['Modifier', log.modifier || 'none'],
    ['Prompt Length', log.promptLength ? log.promptLength.toLocaleString() + ' chars' : '-'],
    ['Response Length', log.codeLength ? log.codeLength.toLocaleString() + ' chars' : '-'],
    ['Session', '#' + (log.sessionId || '?')],
  ];
  for (var i = 0; i < metas.length; i++) {
    var card = document.createElement('div');
    card.className = 'meta-card';
    var label = document.createElement('div');
    label.className = 'label';
    label.textContent = metas[i][0];
    var value = document.createElement('div');
    value.className = 'value';
    value.textContent = metas[i][1];
    if (metas[i][0] === 'Status') value.className = 'value status-' + (log.status || 'info');
    card.appendChild(label);
    card.appendChild(value);
    metaGrid.appendChild(card);
  }
  detail.appendChild(metaGrid);

  // Prompt section
  if (log.prompt) {
    var promptSection = document.createElement('div');
    promptSection.className = 'detail-section';
    var promptH3 = document.createElement('h3');
    promptH3.textContent = 'Prompt sent to AI';
    var promptPre = document.createElement('pre');
    promptPre.className = 'prompt-pre';
    promptPre.textContent = log.prompt;
    promptSection.appendChild(promptH3);
    promptSection.appendChild(promptPre);
    detail.appendChild(promptSection);
  }

  // Response section
  if (log.response) {
    var respSection = document.createElement('div');
    respSection.className = 'detail-section';
    var respH3 = document.createElement('h3');
    respH3.textContent = 'AI Response (first 2000 chars)';
    var respPre = document.createElement('pre');
    respPre.className = 'response-pre';
    respPre.textContent = log.response;
    respSection.appendChild(respH3);
    respSection.appendChild(respPre);
    detail.appendChild(respSection);
  }

  // Error
  if (log.error) {
    var errSection = document.createElement('div');
    errSection.className = 'detail-section';
    var errH3 = document.createElement('h3');
    errH3.textContent = 'Error';
    var errPre = document.createElement('pre');
    errPre.style.color = '#e74c3c';
    errPre.textContent = log.error;
    errSection.appendChild(errH3);
    errSection.appendChild(errPre);
    detail.appendChild(errSection);
  }

  // No prompt/response
  if (!log.prompt && !log.response && !log.error) {
    var note = document.createElement('p');
    note.style.color = '#666';
    note.textContent = 'No conversation data — generation may still be in progress.';
    detail.appendChild(note);
  }
}

async function refresh() {
  try {
    var response = await fetch('/api/logs');
    var logs = await response.json();
    renderList(logs);
    if (selectedId !== null) selectLog(selectedId);
  } catch (e) {}
}
refresh();
setInterval(refresh, 2000);
</script>
</body></html>`;
}
