const DEFAULT_THEMES = ['probate', 'estate', 'heirs', 'obituary', 'deed', 'land'];

export function buildQueries(target, { maxQueries = 24 } = {}) {
  if (!target?.canonicalName) throw new Error('Target canonicalName is required.');
  const names = unique([target.canonicalName, ...(target.aliases || [])]);
  const themes = unique(target.themes?.length ? target.themes : DEFAULT_THEMES);
  const places = unique(target.places || []);
  const deathYear = extractYear(target.life?.death);
  const queries = [];

  for (const name of names) {
    for (const theme of themes) {
      add(queries, `"${name}" ${theme}`);
      if (deathYear && ['probate', 'estate', 'obituary', 'administrator'].includes(theme)) {
        add(queries, `"${name}" ${theme} ${deathYear}`);
      }
    }
  }

  for (const place of places) {
    for (const name of names.slice(0, 3)) {
      add(queries, `"${name}" "${place}"`);
      add(queries, `"${name}" "${place}" probate`);
      add(queries, `"${name}" "${place}" deed land`);
    }
  }

  for (const term of target.searchTerms || []) {
    add(queries, term.includes(target.canonicalName) ? term : `"${target.canonicalName}" ${term}`);
  }

  return queries.slice(0, maxQueries);
}

export function buildDescriptionQueries(description, { county, state, names = [] } = {}) {
  if (!description?.trim()) return [];
  const quoted = `"${description.trim()}"`;
  return unique([
    quoted,
    county ? `${quoted} "${county}"` : '',
    state ? `${quoted} "${state}"` : '',
    ...names.map((name) => `${quoted} "${name}"`),
    `${quoted} deed`,
    `${quoted} mineral`,
    `${quoted} royalty`,
    `${quoted} partition`
  ]).filter(Boolean);
}

function extractYear(value) {
  const m = String(value || '').match(/\b(1[6-9]\d{2}|20\d{2})\b/);
  return m?.[1] || '';
}

function add(arr, value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized && !arr.includes(normalized)) arr.push(normalized);
}

function unique(values) {
  return [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))];
}
