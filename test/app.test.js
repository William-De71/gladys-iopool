// The whole integration against the fake Gladys of the SDK
// (`@gladysassistant/integration-sdk/testing`), which checks the discovered
// devices and the states like the host API does, and a fake iopool API.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import { createApp, SCENE_ACTIONS, ACTIONS } from '../src/app.js';
import { WIDGETS } from '../src/widgets.js';
import {
  iopoolCloud,
  rawPool,
  silent,
  NOW,
  HOUR,
  POOL_ID,
  SPA_ID,
  API_KEY,
} from './helpers/fixtures.js';

const CONFIG = { api_key: API_KEY };
const POOL = `ext:test-integration:pool:${POOL_ID}`;
const SPA = `ext:test-integration:pool:${SPA_ID}`;

/**
 * @description The integration, connected to a fake Gladys and a fake iopool API.
 * @param {object} [options] - `{ config, cloud }`.
 * @returns {Promise<object>} `{ gladys, app, fetch, clock }`.
 */
async function startApp({ config = CONFIG, cloud = {} } = {}) {
  const fetch = iopoolCloud(cloud);
  const clock = { now: NOW };
  const gladys = createFakeGladys({ config });
  const app = createApp(gladys, { fetchImpl: fetch, now: () => clock.now, logger: silent });
  await gladys.connect();
  return { gladys, app, fetch, clock };
}

const created = async (gladys, externalId) => {
  const device = gladys.fake.discoveredDevices.find((d) => d.external_id === externalId);
  await gladys.fake.deviceCreated(device);
  return device;
};
const widget = async (gladys, key, options) =>
  (await gladys.fake.widgetGet(key, options)).data.content;
const sceneAction = async (gladys, key, fields) =>
  (await gladys.fake.sceneAction(key, fields)).data.outputs;
const action = async (gladys, language) => {
  const ack = await gladys.fake.action(ACTIONS.TEST_CONNECTION);
  return (
    JSON.stringify(ack.data).match(new RegExp(`"${language}":"([^"]*)"`))?.[1] ??
    JSON.stringify(ack)
  );
};
const eventsOf = (gladys, key) => gladys.fake.sceneEvents.filter((event) => event.key === key);

test('the pools are offered after one request, accepted by the host API checks', async (t) => {
  const { gladys, fetch } = await startApp({
    cloud: { pools: [rawPool(), rawPool({ id: SPA_ID, title: 'Spa', measure: false })] },
  });
  t.after(() => gladys.fake.shutdown());
  assert.equal(fetch.calls.length, 1);
  assert.deepEqual(
    gladys.fake.discoveredDevices.map((device) => [device.external_id, device.name]),
    [
      [POOL, 'iopool Garden'],
      [SPA, 'iopool Spa'],
    ],
  );
  assert.equal(gladys.fake.connectionStatus.connected, true);
  assert.match(gladys.fake.connectionStatus.message.fr, /2 bassin\(s\)/);
  assert.equal(gladys.fake.states.length, 0, 'nothing before a device exists');
});

test('creating a device publishes all its states, then only what changed', async (t) => {
  const { gladys, app, fetch } = await startApp();
  t.after(() => gladys.fake.shutdown());
  await created(gladys, POOL);
  assert.equal(gladys.fake.lastState(`${POOL}:temperature`), 26.4);
  assert.equal(gladys.fake.lastState(`${POOL}:ph`), 7.22);
  assert.equal(gladys.fake.lastState(`${POOL}:orp`), 702);
  assert.equal(gladys.fake.lastState(`${POOL}:filtration`), 390);
  assert.equal(gladys.fake.lastState(`${POOL}:action_required`), 'Nothing to do');
  assert.equal(gladys.fake.lastState(`${POOL}:pool_mode`), 'Standard');
  const sent = gladys.fake.states.length;

  await app.watcher.round();
  assert.equal(gladys.fake.states.length, sent, 'same answer, nothing sent again');

  fetch.state.pools = [rawPool({ at: NOW, orp: 650, action: true })];
  await app.watcher.round();
  assert.equal(gladys.fake.lastState(`${POOL}:orp`), 650);
  assert.equal(gladys.fake.lastState(`${POOL}:action_required`), 'Action required');
  assert.ok(gladys.fake.states.length - sent <= 3, 'only the changed values');
});

test('transitions fire scene events once, never at the first reading', async (t) => {
  const { gladys, app, fetch, clock } = await startApp({ cloud: { pools: [rawPool()] } });
  t.after(() => gladys.fake.shutdown());
  assert.equal(gladys.fake.sceneEvents.length, 0, 'the first reading is a baseline');

  fetch.state.pools = [rawPool({ at: NOW, action: true, filtration: 8, mode: 'ACTIVE_WINTER' })];
  await app.watcher.round();
  assert.equal(eventsOf(gladys, 'new_measure').length, 1);
  assert.equal(eventsOf(gladys, 'action_required_changed')[0].data.state, 'required');
  assert.equal(eventsOf(gladys, 'filtration_advice_changed')[0].data.minutes, 480);
  assert.equal(eventsOf(gladys, 'pool_mode_changed')[0].data.previous_mode, 'STANDARD');
  assert.equal(eventsOf(gladys, 'new_measure')[0].data.device, POOL);

  await app.watcher.round();
  assert.equal(gladys.fake.sceneEvents.length, 4, 'nothing new, nothing fired');

  clock.now = NOW + 25 * HOUR;
  await app.watcher.round();
  await app.watcher.round();
  assert.equal(eventsOf(gladys, 'measures_stopped').length, 1);
});

test('a refused key, a rate limit and an outage are reported, then the recovery', async (t) => {
  const { gladys, app, fetch } = await startApp({ config: { api_key: 'wrong' } });
  t.after(() => gladys.fake.shutdown());
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.match(gladys.fake.connectionStatus.message.en, /refused the API key/);

  await gladys.fake.configUpdated({ api_key: API_KEY });
  assert.equal(gladys.fake.connectionStatus.connected, true);

  fetch.state.failure = 429;
  await app.watcher.round();
  assert.match(gladys.fake.connectionStatus.message.en, /limits the requests/);
  fetch.state.failure = 'network';
  await app.watcher.round();
  assert.match(gladys.fake.connectionStatus.message.fr, /ne répond pas/);
  assert.equal(app.watcher.pools().length, 1, 'the last snapshots are kept');
  fetch.state.failure = null;
  await app.watcher.round();
  assert.equal(gladys.fake.connectionStatus.connected, true);
});

test('without a key: nothing is read and the user is told what to do', async (t) => {
  const { gladys, fetch } = await startApp({ config: {} });
  t.after(() => gladys.fake.shutdown());
  assert.equal(fetch.calls.length, 0);
  assert.match(gladys.fake.connectionStatus.message.fr, /clé API de l’application iopool/);
  const content = await widget(gladys, WIDGETS.POOL, { language: 'en' });
  assert.match(content.components[0].text, /API key/);
});

test('the test button counts the pools with the typed key', async (t) => {
  const { gladys, fetch } = await startApp();
  t.after(() => gladys.fake.shutdown());
  assert.match(await action(gladys, 'fr'), /1 bassin/);
  fetch.state.key = 'rotated';
  assert.match(await action(gladys, 'en'), /refused the API key/);
});

test('the widget reads the snapshots, with the chart once the device exists', async (t) => {
  const { gladys, fetch } = await startApp();
  t.after(() => gladys.fake.shutdown());
  const calls = fetch.calls.length;
  const before = await widget(gladys, WIDGETS.POOL, { language: 'fr', settings: {} });
  assert.deepEqual(validateWidgetContent(before), []);
  assert.ok(!before.components.some((c) => c.type === 'chart'));
  await created(gladys, POOL);
  const after = await widget(gladys, WIDGETS.POOL, {
    language: 'fr',
    settings: { device: POOL, chart: 'ph' },
  });
  assert.deepEqual(validateWidgetContent(after), []);
  assert.deepEqual(after.components.find((c) => c.type === 'chart').device_features, [
    `${POOL}:ph`,
  ]);
  assert.equal(fetch.calls.length, calls, 'a widget never costs a request');
});

test('get_pool answers from a fresh reading, or reads iopool when it is old', async (t) => {
  const { gladys, fetch, clock } = await startApp({
    cloud: { pools: [rawPool(), rawPool({ id: SPA_ID, title: 'Spa', temperature: 37 })] },
  });
  t.after(() => gladys.fake.shutdown());
  const calls = fetch.calls.length;
  const first = await sceneAction(gladys, SCENE_ACTIONS.GET_POOL, {});
  assert.equal(first.temperature, 26.4123);
  assert.equal(first.filtration_minutes, 390);
  assert.equal(first.action_required, false);
  assert.equal(fetch.calls.length, calls, 'fresh snapshot reused');

  clock.now = NOW + 10 * 60000;
  const spa = await sceneAction(gladys, SCENE_ACTIONS.GET_POOL, { device: SPA });
  assert.equal(spa.temperature, 37);
  assert.equal(fetch.calls.length, calls + 1);
  assert.equal(gladys.fake.sceneEvents.length, 0, 'a scene action never fires a trigger');
});

test('a new key starts a new baseline and the new interval applies', async (t) => {
  const { gladys, app, fetch } = await startApp();
  t.after(() => gladys.fake.shutdown());
  fetch.state.key = 'other-account';
  fetch.state.pools = [rawPool({ at: NOW, action: true })];
  await gladys.fake.configUpdated({ api_key: 'other-account', poll_interval: 30 });
  assert.equal(app.getConfig().pollInterval, 30);
  assert.equal(gladys.fake.sceneEvents.length, 0, 'another account replays nothing');
});
