#!/usr/bin/env node
import { getConfig } from './config.mjs';
import { FirecrawlClient } from './firecrawl.mjs';
import { EvidenceStore, readJson } from './store.mjs';
import { buildQueries } from './query-builder.mjs';
import { runCampaign } from './campaign.mjs';
import { buildMarkdownReport, writeReport } from './report.mjs';
import { buildDashboardHtml, writeDashboard } from './dashboard.mjs';

const command = process.argv[2] || 'help';
const args = parseArgs(process.argv.slice(3));
const config = getConfig();
const targetFile = args.targets || 'data/targets.example.json';
const targetDoc = readJson(targetFile);
const targets = targetDoc.targets || [];
const outputDir = args.output || 'output';
const store = new EvidenceStore(outputDir);

if (command === 'queries') {
  for (const target of targets) {
    console.log(`\n# ${target.canonicalName}`);
    for (const q of buildQueries(target, { maxQueries: config.maxQueriesPerTarget })) console.log(q);
  }
} else if (command === 'research') {
  if (!config.firecrawlApiKey) {
    console.error('Missing FIRECRAWL_API_KEY. Copy .env.example to .env and add your key.');
    process.exitCode = 2;
  } else {
    const client = new FirecrawlClient({ apiKey: config.firecrawlApiKey, baseUrl: config.firecrawlBaseUrl });
    const run = await runCampaign({
      targets,
      client,
      store,
      config,
      onProgress(event) {
        if (event.type === 'target-start') console.log(`\n▶ ${event.target.canonicalName}: ${event.queryTotal} queries`);
        if (event.type === 'query-start') console.log(`  [${event.index}/${event.total}] ${event.query}`);
        if (event.type === 'query-done') console.log(`      ↳ ${event.resultCount} results; +${event.write.inserted} new`);
        if (event.type === 'query-error') console.error(`      ✗ ${event.error.message}`);
      }
    });
    console.log('\nRun complete:', JSON.stringify(run, null, 2));
    writeOutputs();
  }
} else if (command === 'report') {
  writeOutputs();
} else {
  console.log(`Family Evidence Engine\n\nCommands:\n  npm run queries -- --targets data/targets.example.json\n  npm run research -- --targets data/targets.example.json\n  npm run report -- --targets data/targets.example.json\n\nPrivate targets:\n  cp data/targets.private.example.json data/targets.private.json\n  # targets.private.json is git-ignored\n`);
}

function writeOutputs() {
  const evidence = store.readEvidence();
  const stats = store.stats();
  const markdown = buildMarkdownReport({ evidence, targets, stats });
  const html = buildDashboardHtml({ evidence, targets, stats });
  const report = writeReport(markdown, `${outputDir}/report.md`);
  const dashboard = writeDashboard(html, `${outputDir}/dashboard.html`);
  console.log(`Report: ${report}`);
  console.log(`Dashboard: ${dashboard}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [rawKey, inline] = token.slice(2).split('=', 2);
    if (inline !== undefined) out[rawKey] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[rawKey] = argv[++i];
    else out[rawKey] = true;
  }
  return out;
}
