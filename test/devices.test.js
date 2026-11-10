// The device of a pool, checked against the rules the host API applies (and
// the ones the fake Gladys of the SDK does not check: see the community
// feedback, forum topic 11005).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
} from '@gladysassistant/integration-sdk';

import {
  buildPoolDevice,
  buildPoolStates,
  poolIdFromExternalId,
  poolModeText,
  measureModeText,
  POOL_FEATURES,
} from '../src/device.js';
import { readPool } from '../src/read.js';
import { LANGUAGES } from '../src/i18n.js';
import { fakeGladys, rawPool, POOL_ID } from './helpers/fixtures.js';

const pool = readPool(rawPool());
const DEVICE = `ext:iopool:pool:${POOL_ID}`;

test('one device per pool, with stable ids and every mandatory field', () => {
  const device = buildPoolDevice(fakeGladys, pool, 'fr');
  assert.equal(device.name, 'iopool Garden');
  assert.equal(device.external_id, DEVICE);
  assert.equal(device.should_poll, false, 'read on the integration timer');
  assert.equal(device.poll_frequency, undefined);
  assert.deepEqual(
    device.params.map((param) => param.name),
    ['IOPOOL_POOL_ID', 'IOPOOL_ECO_ID'],
  );
  assert.deepEqual(
    device.features.map((feature) => feature.external_id),
    POOL_FEATURES.map((spec) => `${DEVICE}:${spec.key}`),
  );
  const categories = Object.values(CATEGORIES);
  for (const feature of device.features) {
    for (const key of ['min', 'max', 'read_only', 'has_feedback']) {
      assert.notEqual(feature[key], undefined, `${feature.external_id}.${key}`);
    }
    assert.ok(categories.includes(feature.category), feature.category);
    assert.equal(feature.read_only, true, 'the iopool API is read-only');
    assert.ok(feature.name.length > 0);
  }
  const byKey = Object.fromEntries(device.features.map((f) => [f.external_id.split(':').pop(), f]));
  assert.equal(byKey.ph.type, TYPES.PH_SENSOR.DECIMAL);
  assert.equal(byKey.orp.type, TYPES.ORP_SENSOR.DECIMAL);
  assert.equal(byKey.filtration.category, CATEGORIES.DURATION);
  assert.equal(byKey.filtration.unit, 'minutes');
  assert.equal(byKey.action_required.category, CATEGORIES.TEXT);
});

test('a pool without a name gets a translated one; ids never depend on it', () => {
  const unnamed = { ...pool, title: null };
  assert.equal(buildPoolDevice(fakeGladys, unnamed, 'fr').name, 'iopool piscine');
  assert.equal(buildPoolDevice(fakeGladys, unnamed, 'de').external_id, DEVICE);
});

test('the states of a pool, rounded; unknown values are not published', () => {
  const states = Object.fromEntries(
    buildPoolStates(fakeGladys, pool, 'fr').map((s) => [
      s.device_feature_external_id.split(':').pop(),
      s.state ?? s.text,
    ]),
  );
  assert.deepEqual(states, {
    temperature: 26.4,
    ph: 7.22,
    orp: 702,
    filtration: 390,
    action_required: 'Rien à faire',
    pool_mode: 'Standard',
  });
  const empty = buildPoolStates(
    fakeGladys,
    { ...pool, measure: null, actionRequired: null, mode: null, filtrationHours: null },
    'en',
  );
  assert.deepEqual(empty, []);
  const winter = buildPoolStates(
    fakeGladys,
    { ...pool, mode: 'WINTER', actionRequired: true },
    'de',
  );
  assert.ok(winter.some((s) => s.text === 'Passive Überwinterung'));
  assert.ok(winter.some((s) => s.text === 'Handlung erforderlich'));
});

test('pool and measure modes in every language; a new value shows as sent', () => {
  for (const language of LANGUAGES) {
    for (const mode of ['STANDARD', 'OPENING', 'ACTIVE_WINTER', 'WINTER', 'INITIALIZATION']) {
      assert.doesNotMatch(poolModeText(mode, language), /^poolMode_/);
    }
    for (const mode of ['standard', 'live', 'maintenance', 'manual', 'backup', 'gateway']) {
      assert.doesNotMatch(measureModeText(mode, language), /^measureMode_/);
    }
  }
  assert.equal(poolModeText('SUMMER_PARTY', 'fr'), 'SUMMER_PARTY');
  assert.equal(poolModeText(null, 'fr'), null);
});

test('the pool id of a device or feature external id', () => {
  assert.equal(poolIdFromExternalId(DEVICE), POOL_ID);
  assert.equal(poolIdFromExternalId(`${DEVICE}:orp`), POOL_ID);
  assert.equal(poolIdFromExternalId('ext:other:thing'), null);
  assert.equal(poolIdFromExternalId(undefined), null);
});
