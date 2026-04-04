const MAX_LOGS = 100;
const logs = [];

export function log(entry) {
  entry.timestamp = Date.now();
  entry.id = logs.length;
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  // Also console.log a summary
  const status = entry.status || 'info';
  const msg = entry.message || `${entry.type} ${entry.genre}/${entry.theme}`;
  console.log(`[LOG] ${new Date().toLocaleTimeString()} [${status}] ${msg}`);
}

export function getLogs() {
  return logs.slice().reverse();
}

export function addLogUpdate(id, updates) {
  const entry = logs.find(l => l.id === id);
  if (entry) Object.assign(entry, updates);
}
