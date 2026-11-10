import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import { buildPoolWidget, readPoolSettings, messageContent, advice } from '../src/widgets.js';
import { readPool } from '../src/read.js';
import { isStale } from '../src/tracker.js';
import { LANGUAGES } from '../src/i18n.js';
import { fakeGladys, rawPool, POOL_ID, NOW, HOUR } from './helpers/fixtures.js';

const snapshot = (options) => {
  const pool = readPool(rawPool(options));
  return { ...pool, stale: isStale(pool, NOW) };
};
const featureId = fakeGladys.externalIds('pool', POOL_ID).feature;
const valid = (content) => {
  assert.deepEqual(validateWidgetContent(content), [], JSON.stringify(content));
  const types = content.components.map((c) => c.type);
  const count = (list) => types.filter((type) => list.includes(type)).length;
  assert.ok(content.components.length <= 8);
  assert.ok(count(['value', 'gauge']) <= 6);
  assert.ok(count(['chart', 'card-list', 'image']) <= 1);
  assert.ok(count(['text']) <= 2 && count(['status']) <= 1);
};

test('the pool widget is valid in every language, settings and state', () => {
  const pools = [
    snapshot(),
    snapshot({ action: true, isValid: false, measureMode: 'maintenance' }),
    snapshot({ mode: 'WINTER', at: NOW - 40 * HOUR }),
    snapshot({ at: NOW - 40 * HOUR }),
    snapshot({ filtration: null, temperature: null }),
    snapshot({ measure: false }),
  ];
  for (const language of LANGUAGES) {
    for (const pool of pools) {
      for (const chart of ['temperature', 'filtration', 'none']) {
        const content = buildPoolWidget({
          pool,
          language,
          now: NOW,
          pollMinutes: 10,
          settings: readPoolSettings({ chart }),
          featureId,
        });
        valid(content);
        assert.equal(content.ttl_seconds, 600);
      }
    }
  }
  valid(messageContent('x'));
});

test('tiles, chart, advice and status rows', () => {
  const content = buildPoolWidget({
    pool: snapshot({ action: true }),
    language: 'fr',
    now: NOW,
    pollMinutes: 10,
    settings: readPoolSettings({ chart: 'orp' }),
    featureId,
  });
  const types = content.components.map((c) => c.type);
  assert.deepEqual(types, ['text', 'value', 'value', 'value', 'value', 'chart', 'text', 'status']);
  assert.equal(content.components[0].text, 'Mesuré il y a 1 h · iopool Garden');
  assert.deepEqual(
    content.components.slice(1, 5).map((c) => c.value),
    [26.4, 7.22, 702, 6.5],
  );
  assert.deepEqual(content.components[5].device_features, [featureId('orp')]);
  assert.match(content.components[6].text, /demande une action.*Filtrez environ 6 h 30 par jour/);
  const rows = content.components[7].items;
  assert.deepEqual(
    rows.map((row) => [row.value, row.color]),
    [
      ['Action requise', 'danger'],
      ['Standard', 'neutral'],
      ['Standard · valide', 'neutral'],
    ],
  );
});

test('no chart before the device exists; °F for imperial units', () => {
  const content = buildPoolWidget({
    pool: snapshot(),
    language: 'en',
    units: 'imperial',
    now: NOW,
    pollMinutes: 10,
  });
  assert.ok(!content.components.some((c) => c.type === 'chart'));
  assert.equal(content.components[1].unit, '°F');
  assert.equal(content.components[1].value, 79.5);
});

test('the advice follows the pool: winter, stale, action', () => {
  assert.match(advice(snapshot({ mode: 'WINTER' }), 'en', NOW), /Passive wintering/);
  assert.match(advice(snapshot({ at: NOW - 30 * HOUR }), 'en', NOW), /No measure for 30 h/);
  assert.match(advice(snapshot(), 'en', NOW), /asks for nothing.*6 h 30 min a day/);
  assert.doesNotMatch(advice(snapshot({ filtration: 0 }), 'en', NOW), /Filter/);
});

test('settings fall back to their defaults', () => {
  assert.deepEqual(readPoolSettings({ chart: 'chlorine', interval: 'year' }), {
    chart: 'temperature',
    interval: 'last-week',
  });
});
