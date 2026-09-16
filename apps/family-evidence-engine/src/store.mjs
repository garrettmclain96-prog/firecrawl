import fs from 'node:fs';
import path from 'node:path';

export class EvidenceStore {
  constructor(outputDir = 'output') {
    this.outputDir = path.resolve(process.cwd(), outputDir);
    this.evidenceFile = path.join(this.outputDir, 'evidence.jsonl');
    this.runFile = path.join(this.outputDir, 'runs.jsonl');
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  readEvidence() {
    return readJsonl(this.evidenceFile);
  }

  upsertEvidence(records) {
    const existing = this.readEvidence();
    const map = new Map(existing.map((item) => [item.id, item]));
    let inserted = 0;
    let updated = 0;
    for (const record of records) {
      if (map.has(record.id)) updated += 1;
      else inserted += 1;
      map.set(record.id, { ...map.get(record.id), ...record });
    }
    const sorted = [...map.values()].sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt)));
    writeJsonlAtomic(this.evidenceFile, sorted);
    return { inserted, updated, total: sorted.length };
  }

  appendRun(run) {
    fs.appendFileSync(this.runFile, `${JSON.stringify(run)}\n`, 'utf8');
  }

  stats() {
    const evidence = this.readEvidence();
    return {
      totalEvidence: evidence.length,
      highConfidence: evidence.filter((x) => x.confidenceScore >= 70).length,
      landClues: evidence.reduce((sum, x) => sum + (x.landClues?.length || 0), 0),
      contradictionFlags: evidence.reduce((sum, x) => sum + (x.contradictionFlags?.length || 0), 0),
      byType: countBy(evidence, 'recordType'),
      byTier: countBy(evidence, (item) => `tier-${item.sourceTier}`),
      byTarget: countBy(evidence, 'targetName')
    };
  }
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'));
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJsonlAtomic(file, records) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : ''), 'utf8');
  fs.renameSync(temp, file);
}

function countBy(items, keyOrFn) {
  const out = {};
  for (const item of items) {
    const key = typeof keyOrFn === 'function' ? keyOrFn(item) : (item[keyOrFn] || 'unknown');
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}
