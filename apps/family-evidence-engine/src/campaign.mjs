import { buildQueries } from './query-builder.mjs';
import { makeEvidenceRecord } from './extractor.mjs';

export async function runCampaign({ targets, client, store, config, onProgress = () => {} }) {
  const startedAt = new Date().toISOString();
  const failures = [];
  let queryCount = 0;
  let resultCount = 0;
  let storedCount = 0;

  for (const target of targets) {
    const queries = buildQueries(target, { maxQueries: config.maxQueriesPerTarget });
    onProgress({ type: 'target-start', target, queryTotal: queries.length });

    for (let i = 0; i < queries.length; i += 1) {
      const query = queries[i];
      queryCount += 1;
      onProgress({ type: 'query-start', target, query, index: i + 1, total: queries.length });
      try {
        const results = await client.search(query, { limit: config.searchLimit });
        resultCount += results.length;
        const records = results.map((result) => makeEvidenceRecord({ target, query, result, storeRaw: config.storeRaw }));
        const write = store.upsertEvidence(records);
        storedCount += write.inserted;
        onProgress({ type: 'query-done', target, query, resultCount: results.length, write });
      } catch (error) {
        const failure = { targetId: target.id, query, error: error.message };
        failures.push(failure);
        onProgress({ type: 'query-error', target, query, error });
      }
      if (config.searchDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, config.searchDelayMs));
    }
  }

  const run = {
    id: `run-${Date.now()}`,
    startedAt,
    completedAt: new Date().toISOString(),
    targets: targets.map((t) => t.id),
    queryCount,
    resultCount,
    newlyStored: storedCount,
    failures
  };
  store.appendRun(run);
  return run;
}
