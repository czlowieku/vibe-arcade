const MAX_LOGS = 100;
const logs = [];
let sessionCounter = 0;

export function log(entry) {
  entry.timestamp = Date.now();
  entry.id = logs.length;
  if (!entry.sessionId) {
    entry.sessionId = ++sessionCounter;
  }
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  const status = entry.status || 'info';
  const msg = entry.message || `${entry.type} ${entry.genre}/${entry.theme}`;
  console.log(`[LOG] ${new Date().toLocaleTimeString()} [S${entry.sessionId}] [${status}] ${msg}`);
}

export function getLogs() {
  return logs.slice().reverse();
}

export function addLogUpdate(id, updates) {
  const entry = logs.find(l => l.id === id);
  if (entry) Object.assign(entry, updates);
}

export function newSession() {
  return ++sessionCounter;
}
