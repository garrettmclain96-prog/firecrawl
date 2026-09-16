import fs from 'node:fs';
import path from 'node:path';

export function buildMarkdownReport({ evidence, targets, stats, generatedAt = new Date().toISOString() }) {
  const lines = ['# Family Evidence Engine — Research Report', '', `Generated: ${generatedAt}`, '', '> Evidence-first rule: crawler output is a lead until verified against the underlying record. A Tier 3 result is a primary-record candidate, not automatically a proven fact.', '', '## Dashboard', '', `- Evidence records: **${stats.totalEvidence}**`, `- High-confidence candidates (score ≥70): **${stats.highConfidence}**`, `- Extracted land-description clues: **${stats.landClues}**`, `- Contradiction flags: **${stats.contradictionFlags}**`, ''];

  for (const target of targets) {
    const records = evidence.filter((x) => x.targetId === target.id).sort((a, b) => b.confidenceScore - a.confidenceScore);
    lines.push(`## ${target.canonicalName}`, '');
    if (target.life?.death) lines.push(`Known/working death date: ${target.life.death}`, '');
    if (target.places?.length) lines.push(`Working place(s): ${target.places.join('; ')}`, '');
    if (target.researchQuestions?.length) {
      lines.push('### Research questions', '');
      for (const q of target.researchQuestions) lines.push(`- ${q}`);
      lines.push('');
    }
    if (!records.length) {
      lines.push('_No captured evidence yet._', '');
      continue;
    }
    lines.push('### Strongest captured leads', '');
    for (const record of records.slice(0, 15)) {
      lines.push(`#### ${record.title}`);
      lines.push(`- Score: **${record.confidenceScore}/100** | Tier: **${record.sourceTier}** | Type: **${record.recordType}** | Status: **${record.verificationStatus}**`);
      lines.push(`- Source: ${record.sourceUrl}`);
      lines.push(`- Query: \`${record.query}\``);
      if (record.mentions?.length) lines.push(`- Name matches: ${record.mentions.join('; ')}`);
      if (record.dates?.length) lines.push(`- Dates: ${record.dates.join('; ')}`);
      if (record.landClues?.length) lines.push(`- Land clues: ${record.landClues.join('; ')}`);
      if (record.contradictionFlags?.length) lines.push(`- ⚠ Contradictions: ${record.contradictionFlags.join('; ')}`);
      if (record.excerpt) lines.push(`- Excerpt: ${record.excerpt}`);
      lines.push('');
    }
  }

  lines.push('## Verification queue', '');
  const queue = evidence.filter((x) => x.verificationStatus === 'unverified').sort((a, b) => (b.sourceTier - a.sourceTier) || (b.confidenceScore - a.confidenceScore)).slice(0, 30);
  for (const item of queue) lines.push(`- [ ] **${item.targetName}** — ${item.recordType} — Tier ${item.sourceTier} — ${item.title} — ${item.sourceUrl}`);
  lines.push('');
  return lines.join('\n');
}

export function writeReport(markdown, outputFile = 'output/report.md') {
  const file = path.resolve(process.cwd(), outputFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, markdown, 'utf8');
  return file;
}
