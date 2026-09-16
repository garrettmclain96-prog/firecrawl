import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQueries, buildDescriptionQueries } from '../src/query-builder.mjs';

test('buildQueries prioritizes exact name, themes, year and place', () => {
  const queries = buildQueries({
    canonicalName: 'Joseph Sidney McClung',
    aliases: ['Joseph Sydney McClung'],
    life: { death: '1932-12-23' },
    places: ['Limestone County, Alabama'],
    themes: ['probate', 'deed']
  }, { maxQueries: 20 });
  assert.ok(queries.includes('"Joseph Sidney McClung" probate'));
  assert.ok(queries.includes('"Joseph Sidney McClung" probate 1932'));
  assert.ok(queries.some(q => q.includes('Limestone County, Alabama')));
  assert.equal(new Set(queries).size, queries.length);
});

test('description queries follow the tract independently of surname', () => {
  const queries = buildDescriptionQueries('Abstract 327 Survey X 160 acres', { county: 'Example County', names: ['A Person'] });
  assert.ok(queries.includes('"Abstract 327 Survey X 160 acres"'));
  assert.ok(queries.some(q => q.includes('mineral')));
  assert.ok(queries.some(q => q.includes('A Person')));
});
