import fs from 'node:fs';
import path from 'node:path';

export function loadDotEnv(file = '.env') {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getConfig() {
  loadDotEnv();
  return {
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
    firecrawlBaseUrl: (process.env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev').replace(/\/$/, ''),
    searchLimit: intEnv('FAMILY_SEARCH_LIMIT', 5, 1, 25),
    maxQueriesPerTarget: intEnv('FAMILY_MAX_QUERIES_PER_TARGET', 24, 1, 200),
    searchDelayMs: intEnv('FAMILY_SEARCH_DELAY_MS', 350, 0, 60_000),
    storeRaw: /^(1|true|yes)$/i.test(process.env.FAMILY_STORE_RAW || '0'),
    dashboardPort: intEnv('FAMILY_DASHBOARD_PORT', 4317, 1, 65535)
  };
}

function intEnv(name, fallback, min, max) {
  const value = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
