import crypto from 'node:crypto';

const RECORD_PATTERNS = [
  ['probate', /\b(probate|letters testamentary|letters of administration|executor|executrix|administrator|administratrix|estate of)\b/i],
  ['deed', /\b(deed|grantor|grantee|conveyed|warranty deed|quitclaim)\b/i],
  ['mineral', /\b(mineral|royalt(?:y|ies)|oil and gas|leasehold|working interest|overriding royalty)\b/i],
  ['land', /\b(acre(?:s|age)?|survey|abstract|section|township|range|legal description|metes and bounds|tract|parcel)\b/i],
  ['obituary', /\b(obituary|funeral|survived by|died|death notice)\b/i],
  ['newspaper', /\b(newspaper|gazette|times|journal|chronicle|news archive)\b/i],
  ['census', /\b(census|enumeration district|household)\b/i],
  ['cemetery', /\b(cemetery|memorial|burial|grave)\b/i]
];

export function makeEvidenceRecord({ target, query, result, storeRaw = false, capturedAt = new Date().toISOString() }) {
  const combined = [result.title, result.description, result.markdown].filter(Boolean).join('\n');
  const recordType = classifyRecordType(combined, result.url);
  const source = classifySource(result.url, combined, recordType);
  const mentions = findNameMentions(target, combined);
  const dates = extractDates(combined);
  const landClues = extractLandClues(combined);
  const contradictionFlags = detectContradictions(target, combined);
  const id = stableId(target.id, result.url, result.title);
  const score = scoreEvidence({ mentions, recordType, source, landClues, contradictionFlags });

  return {
    id,
    targetId: target.id,
    targetName: target.canonicalName,
    capturedAt,
    query,
    sourceUrl: result.url,
    title: result.title || result.url,
    description: result.description || '',
    recordType,
    sourceTier: source.tier,
    sourceClass: source.className,
    verificationStatus: 'unverified',
    confidenceScore: score,
    mentions,
    dates,
    landClues,
    contradictionFlags,
    excerpt: excerpt(result.markdown || result.description || '', 1400),
    ...(storeRaw ? { rawMarkdown: result.markdown || '' } : {})
  };
}

export function classifyRecordType(text, url = '') {
  const haystack = `${url}\n${text}`;
  for (const [type, pattern] of RECORD_PATTERNS) {
    if (pattern.test(haystack)) return type;
  }
  return 'general';
}

export function classifySource(url, text, recordType) {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch {}

  const official = /(?:\.gov|\.us)$/.test(host) || /(^|\.)(archives|courts|county|state)\./.test(host);
  const primaryRecordLanguage = /\b(deed book|instrument no\.?|case no\.?|probate file|recorded in|official records|clerk of court|register of deeds)\b/i.test(text);
  const secondary = /\b(obituary|newspaper|cemetery|memorial|biography|historical society)\b/i.test(text);

  if (official && (primaryRecordLanguage || ['probate', 'deed', 'land', 'mineral'].includes(recordType))) {
    return { tier: 3, className: 'primary-candidate' };
  }
  if (secondary) return { tier: 2, className: 'corroborating' };
  return { tier: 1, className: 'lead' };
}

export function findNameMentions(target, text) {
  const names = [target.canonicalName, ...(target.aliases || [])].filter(Boolean);
  return names.filter((name) => text.toLowerCase().includes(name.toLowerCase()));
}

export function extractDates(text) {
  const found = new Set();
  for (const match of text.matchAll(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+(?:1[6-9]\d{2}|20\d{2})\b/gi)) {
    found.add(match[0]);
  }
  for (const match of text.matchAll(/\b(?:1[6-9]\d{2}|20\d{2})\b/g)) found.add(match[0]);
  return [...found].slice(0, 20);
}

export function extractLandClues(text) {
  const clues = [];
  const patterns = [
    /\b\d+(?:\.\d+)?\s+acres?\b/gi,
    /\b(?:abstract|survey|section|township|range|tract|parcel)\s+(?:no\.?\s*)?[A-Z0-9-]+\b/gi,
    /\b(?:book|volume)\s+[A-Z0-9-]+\s*,?\s*(?:page|pg\.?|p\.)\s*[A-Z0-9-]+\b/gi,
    /\b(?:instrument|document)\s+(?:no\.?|number)?\s*[A-Z0-9-]+\b/gi
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (!clues.includes(match[0])) clues.push(match[0]);
      if (clues.length >= 20) return clues;
    }
  }
  return clues;
}

export function detectContradictions(target, text) {
  const flags = [];
  const deathYear = String(target.life?.death || '').match(/\b(1[6-9]\d{2}|20\d{2})\b/)?.[1];
  if (deathYear) {
    const otherDeathYears = [...text.matchAll(/\b(?:died|death|deceased)\D{0,30}(1[6-9]\d{2}|20\d{2})\b/gi)]
      .map((m) => m[1])
      .filter((year) => year !== deathYear);
    if (otherDeathYears.length) flags.push(`Possible conflicting death year(s): ${[...new Set(otherDeathYears)].join(', ')}`);
  }
  return flags;
}

function scoreEvidence({ mentions, recordType, source, landClues, contradictionFlags }) {
  let score = 15;
  score += Math.min(30, mentions.length * 15);
  if (recordType !== 'general') score += 15;
  score += source.tier * 10;
  if (landClues.length) score += Math.min(15, landClues.length * 3);
  score -= contradictionFlags.length * 10;
  return Math.max(0, Math.min(100, score));
}

function stableId(...parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 20);
}

function excerpt(value, max) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
