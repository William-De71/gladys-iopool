import { test } from 'node:test';
import assert from 'node:assert/strict';

import { diffPool, isStale, SCENE_TRIGGERS, STALE_HOURS } from '../src/tracker.js';
import { readPool } from '../src/read.js';
import { rawPool, NOW, HOUR } from './helpers/fixtures.js';

const snapshot = (options, now = NOW) => {
  const pool = readPool(rawPool(options));
  return { ...pool, stale: isStale(pool, now) };
};
const keys = (events) => events.map((event) => event.key);

test('the first snapshot is a baseline: nothing is replayed', () => {
  assert.deepEqual(diffPool(undefined, snapshot({ action: true, mode: 'WINTER' })), []);
});

test('a newer measure is a new_measure, the same one is nothing', () => {
  const before = snapshot();
  assert.deepEqual(diffPool(before, snapshot()), []);
  assert.deepEqual(keys(diffPool(before, snapshot({ at: NOW }))), [SCENE_TRIGGERS.NEW_MEASURE]);
  assert.deepEqual(diffPool(before, snapshot({ at: NOW - 2 * HOUR })), [], 'never an older one');
  assert.deepEqual(keys(diffPool(snapshot({ measure: false }), before)), ['new_measure']);
});

test('action required, pool mode and filtration advice transitions', () => {
  const before = snapshot();
  assert.deepEqual(keys(diffPool(before, snapshot({ action: true }))), [
    SCENE_TRIGGERS.ACTION_REQUIRED_CHANGED,
  ]);
  assert.deepEqual(diffPool(before, snapshot({ mode: 'ACTIVE_WINTER' })), [
    { key: SCENE_TRIGGERS.POOL_MODE_CHANGED, previous: 'STANDARD' },
  ]);
  assert.deepEqual(diffPool(before, snapshot({ filtration: 8 })), [
    { key: SCENE_TRIGGERS.FILTRATION_ADVICE_CHANGED, previous: 6.5 },
  ]);
  assert.deepEqual(diffPool(before, snapshot({ filtration: null })), [], 'unknown is not a change');
  assert.deepEqual(diffPool(before, snapshot({ action: null })), []);
});

test('measures_stopped fires once after 24 h, and never in passive wintering', () => {
  const old = NOW - (STALE_HOURS + 1) * HOUR;
  const fresh = snapshot({ at: old }, old + HOUR);
  const stale = snapshot({ at: old });
  assert.equal(stale.stale, true);
  assert.deepEqual(keys(diffPool(fresh, stale)), [SCENE_TRIGGERS.MEASURES_STOPPED]);
  assert.deepEqual(diffPool(stale, snapshot({ at: old })), [], 'only once');
  assert.equal(snapshot({ at: old, mode: 'WINTER' }).stale, false);
  assert.equal(snapshot({ at: old, mode: 'ACTIVE_WINTER' }).stale, true);
  assert.equal(isStale({ mode: 'STANDARD', measure: null }, NOW), false);
});
