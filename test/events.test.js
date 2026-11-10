import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildPoolEvent, buildPoolOutputs } from '../src/events.js';
import { SCENE_TRIGGERS } from '../src/tracker.js';
import { readPool } from '../src/read.js';
import { fakeGladys, rawPool, POOL_ID, NOW, HOUR } from './helpers/fixtures.js';

const manifest = JSON.parse(
  readFileSync(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pool = readPool(rawPool());
const trigger = (key) => manifest.scene_triggers.find((entry) => entry.key === key);
const DEVICE = `ext:iopool:pool:${POOL_ID}`;

/**
 * @description Check an event payload against the limits of the core and its
 * manifest entry: flat, scalar, declared variables only.
 * @param {{ key: string, data: object }} event - The event.
 */
function checkEvent({ key, data }) {
  const entry = trigger(key);
  assert.ok(entry, key);
  assert.ok(Object.keys(data).length <= 30);
  const allowed = new Set([
    ...entry.variables.map((v) => v.key),
    ...entry.fields.map((f) => f.key),
  ]);
  for (const [name, value] of Object.entries(data)) {
    assert.ok(allowed.has(name), `${key}.${name} is declared`);
    assert.ok(
      value === null || ['string', 'number', 'boolean'].includes(typeof value),
      `${key}.${name} is a scalar`,
    );
    if (typeof value === 'string') {
      assert.ok(value.length <= 1000);
    }
  }
  for (const variable of entry.variables) {
    const value = data[variable.key];
    if (value !== null && value !== undefined) {
      assert.equal(typeof value, variable.type, `${key}.${variable.key}`);
    }
  }
}

test('new_measure carries the values and a summary', () => {
  const event = buildPoolEvent(fakeGladys, pool, { key: SCENE_TRIGGERS.NEW_MEASURE }, 'fr', NOW);
  checkEvent(event);
  assert.equal(event.data.device, DEVICE);
  assert.equal(event.data.ph, 7.2187);
  assert.equal(event.data.is_valid, true);
  assert.equal(event.data.measured_at, new Date(NOW - HOUR).toISOString());
  assert.equal(event.data.summary, 'iopool Garden : eau 26,4 °C, pH 7,22, redox 702 mV.');
});

test('action, mode, filtration and stopped events', () => {
  const required = buildPoolEvent(
    fakeGladys,
    { ...pool, actionRequired: true },
    { key: SCENE_TRIGGERS.ACTION_REQUIRED_CHANGED },
    'en',
    NOW,
  );
  checkEvent(required);
  assert.equal(required.data.state, 'required');
  const resolved = buildPoolEvent(fakeGladys, pool, { key: 'action_required_changed' }, 'en', NOW);
  assert.equal(resolved.data.state, 'resolved');

  const mode = buildPoolEvent(
    fakeGladys,
    { ...pool, mode: 'WINTER' },
    { key: SCENE_TRIGGERS.POOL_MODE_CHANGED, previous: 'STANDARD' },
    'fr',
    NOW,
  );
  checkEvent(mode);
  assert.deepEqual([mode.data.mode, mode.data.previous_mode], ['WINTER', 'STANDARD']);
  assert.match(mode.data.summary, /hivernage passif/);

  const filtration = buildPoolEvent(
    fakeGladys,
    pool,
    { key: SCENE_TRIGGERS.FILTRATION_ADVICE_CHANGED, previous: 5 },
    'fr',
    NOW,
  );
  checkEvent(filtration);
  assert.deepEqual(
    [filtration.data.minutes, filtration.data.hours, filtration.data.previous_minutes],
    [390, 6.5, 300],
  );
  assert.match(filtration.data.summary, /6 h 30 par jour \(au lieu de 5 h\)/);

  const stopped = buildPoolEvent(
    fakeGladys,
    { ...pool, measure: { ...pool.measure, measuredAt: NOW - 30 * HOUR } },
    { key: SCENE_TRIGGERS.MEASURES_STOPPED },
    'en',
    NOW,
  );
  checkEvent(stopped);
  assert.equal(stopped.data.hours, 30);
  assert.throws(() => buildPoolEvent(fakeGladys, pool, { key: 'nope' }, 'en', NOW));
});

test('get_pool returns exactly its declared outputs, typed', () => {
  const action = manifest.scene_actions.find((entry) => entry.key === 'get_pool');
  for (const snapshot of [pool, { ...pool, measure: null, filtrationHours: null, mode: null }]) {
    const outputs = buildPoolOutputs(snapshot, 'en');
    assert.deepEqual(Object.keys(outputs).sort(), action.outputs.map((o) => o.key).sort());
    for (const output of action.outputs) {
      assert.equal(typeof outputs[output.key], output.type, output.key);
    }
  }
  const empty = buildPoolOutputs({ ...pool, measure: null, filtrationHours: null }, 'en');
  assert.equal(empty.temperature, -1);
  assert.equal(empty.filtration_minutes, -1);
  assert.match(empty.summary, /No measure yet/);
  assert.equal(buildPoolOutputs(pool, 'en').filtration_minutes, 390);
});
