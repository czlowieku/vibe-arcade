// Simple code sanitizer for AI-generated game code
// Checks for dangerous patterns that shouldn't appear in Canvas2D mini-games

const CDN_WHITELIST = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
];

export function validateDependencies(deps) {
  const errors = [];
  if (!Array.isArray(deps)) return ['dependencies must be an array'];
  for (const url of deps) {
    if (typeof url !== 'string') {
      errors.push('dependency URL must be a string');
      continue;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        errors.push(`${url}: must use HTTPS`);
        continue;
      }
      const allowed = CDN_WHITELIST.some(host => parsed.hostname === host);
      if (!allowed) {
        errors.push(`${url}: host not in CDN whitelist (allowed: ${CDN_WHITELIST.join(', ')})`);
      }
    } catch {
      errors.push(`${url}: invalid URL`);
    }
  }
  return errors;
}

const BLOCKED_PATTERNS = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bimport\s*\(/,
  /\bimport\s+/,
  /\brequire\s*\(/,
  /\bWebSocket\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bdocument\.cookie\b/,
  /\bwindow\.open\b/,
  /\bwindow\.location\b/,
  /\bnavigator\b/,
  /\bServiceWorker\b/,
  /\bWorker\s*\(/,
  /\bSharedWorker\b/,
];

export function sanitizeGameCode(code) {
  const issues = [];

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(`Blocked pattern found: ${pattern.source}`);
    }
  }

  if (issues.length > 0) {
    console.warn('Sanitizer warnings:', issues);
    // Remove blocked patterns by commenting them out
    let sanitized = code;
    for (const pattern of BLOCKED_PATTERNS) {
      sanitized = sanitized.replace(new RegExp(pattern.source, 'g'), '/* BLOCKED */');
    }
    return sanitized;
  }

  return code;
}
