import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEvidenceRecord } from '../src/extractor.mjs';

test('extractor recognizes probate and land clues', () => {
  const record = makeEvidenceRecord({
    target: { id:'p1', canonicalName:'Nathaniel M. McClung', aliases:[], life:{death:'1915-05-15'} },
    query: '"Nathaniel M. McClung" probate',
    result: {
      url:'https://example.gov/records/1',
      title:'Probate file',
      description:'',
      markdown:'Estate of Nathaniel M. McClung. Probate File 88. 160 acres. Abstract 327. Deed Book 4, Page 19.'
    }
  });
  assert.equal(record.recordType, 'probate');
  assert.equal(record.sourceTier, 3);
  assert.ok(record.landClues.some(x => /160 acres/i.test(x)));
  assert.ok(record.confidenceScore >= 70);
});
