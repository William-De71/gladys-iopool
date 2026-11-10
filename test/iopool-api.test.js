import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createIopoolClient, kindOfStatus, IopoolError } from '../src/iopool-api.js';
import { readPools, readPool, readMeasure, filtrationMinutes } from '../src/read.js';
import { iopoolCloud, rawPool, API_KEY, POOL_ID, NOW, HOUR } from './helpers/fixtures.js';

const client = (fetch, key = API_KEY) => createIopoolClient({ getApiKey: () => key, fetch });

test('reads the pools with the key in the x-api-key header', async () => {
  const fetch = iopoolCloud();
  const pools = await client(fetch).listPools();
  assert.equal(pools.length, 1);
  assert.deepEqual(
    fetch.calls.map((call) => call.path),
    ['/v1/pools'],
  );
  assert.equal(fetch.calls[0].headers['x-api-key'], API_KEY);
  assert.match(fetch.calls[0].headers['User-Agent'], /gladys-iopool/);
});

test('every failure has a kind, and never shows the key', async () => {
  const cases = [
    [iopoolCloud(), 'wrong-key', 'auth'],
    [iopoolCloud({ failure: 429 }), API_KEY, 'rate_limit'],
    [iopoolCloud({ failure: 502 }), API_KEY, 'unreachable'],
    [iopoolCloud({ failure: 'network' }), API_KEY, 'unreachable'],
    [iopoolCloud({ failure: 400 }), API_KEY, 'unexpected'],
    [iopoolCloud(), '', 'auth'],
  ];
  for (const [fetch, key, kind] of cases) {
    await assert.rejects(client(fetch, key).listPools(), (err) => {
      assert.ok(err instanceof IopoolError);
      assert.equal(err.kind, kind, `${key} -> ${kind}`);
      assert.doesNotMatch(err.message, new RegExp(API_KEY));
      return true;
    });
  }
  const notJson = async () => new Response('<html>', { status: 200 });
  await assert.rejects(client(notJson).listPools(), { kind: 'unexpected' });
  const notList = async () => new Response('{"message":"x"}', { status: 200 });
  await assert.rejects(client(notList).listPools(), { kind: 'unexpected' });
  assert.equal(kindOfStatus(401), 'auth');
});

test('a pool of the API becomes a snapshot; unknown values are null, never 0', () => {
  const [pool] = readPools([rawPool()]);
  assert.deepEqual(pool, {
    id: POOL_ID,
    title: 'Garden',
    mode: 'STANDARD',
    actionRequired: false,
    filtrationHours: 6.5,
    measure: {
      temperature: 26.4123,
      ph: 7.2187,
      orp: 702,
      mode: 'standard',
      isValid: true,
      probe: '/Keb7cMf',
      measuredAt: NOW - HOUR,
    },
  });
  const bare = readPool({ id: 'abc', title: ' ', advice: null, latestMeasure: null });
  assert.deepEqual(bare, {
    id: 'abc',
    title: null,
    mode: null,
    actionRequired: null,
    filtrationHours: null,
    measure: null,
  });
  assert.equal(readMeasure({ temperature: 20 }), null, 'a measure without a date is ignored');
  assert.equal(readMeasure({ ph: '7.1', measuredAt: '2026-07-14T09:00:00Z' }).ph, 7.1);
  assert.equal(readMeasure({ ph: null, measuredAt: '2026-07-14T09:00:00Z' }).ph, null);
});

test('pools without a usable id and duplicates are left out', () => {
  const pools = readPools([
    rawPool(),
    rawPool({ title: 'Twice' }),
    { title: 'No id' },
    { id: 'has spaces' },
    null,
  ]);
  assert.deepEqual(
    pools.map((pool) => pool.title),
    ['Garden'],
  );
  assert.deepEqual(readPools({ message: 'x' }), []);
});

test('the filtration advice in minutes', () => {
  assert.equal(filtrationMinutes(6.5), 390);
  assert.equal(filtrationMinutes(4), 240);
  assert.equal(filtrationMinutes(null), null);
  assert.equal(readPool({ id: 'a', advice: { filtrationDuration: -1 } }).filtrationHours, null);
});
