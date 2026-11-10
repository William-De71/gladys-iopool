// -----------------------------------------------------------------------------
// The iopool integration: every handler, registered on a Gladys client.
//
// Brings the pools of an iopool account into Gladys:
//   - a device per pool (water temperature, pH, redox, recommended
//     filtration, action required, pool mode), offered on the Discovery
//     screen (see device.js);
//   - scene triggers: new measure, action required or resolved, pool mode
//     changed, recommended filtration changed, measures stopped (see
//     tracker.js, events.js);
//   - a scene action: read a pool, for a message or a condition;
//   - a dashboard widget: the pool water at a glance (see widgets.js).
//
// iopool has no local API and no push: the integration reads the official
// iopool public API on its own timer, with the API key of the iopool app
// (see iopool-api.js). Transport: cloud only. The API is read-only.
//
// index.js only creates the SDK client; the tests drive this module with the
// fake Gladys of the SDK (test/app.test.js).
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { logger as sdkLogger } from '@gladysassistant/integration-sdk';
import {
  normalizeConfig,
  hasApiKey,
  readLanguage,
  INTERNAL_KEYS,
  AUTO_LANGUAGE,
} from './config.js';
import { createIopoolClient } from './iopool-api.js';
import { readPools } from './read.js';
import { createWatcher } from './watcher.js';
import { idsOf, poolIdFromExternalId, buildPoolDevice, buildPoolStates } from './device.js';
import { buildPoolEvent, buildPoolOutputs } from './events.js';
import { WIDGETS, messageContent, readPoolSettings, buildPoolWidget } from './widgets.js';
import { t, all } from './i18n.js';

const { name, version, homepage } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const ACTIONS = { TEST_CONNECTION: 'test_connection' };
const SCENE_ACTIONS = { GET_POOL: 'get_pool' };
// A scene action reuses the last reading while it is this fresh.
const SNAPSHOT_MAX_AGE_MS = 60000;

/**
 * @description Register every handler of the integration on a Gladys client.
 * @param {object} gladys - A GladysIntegration (or the fake Gladys of the SDK).
 * @param {object} [options] - Options.
 * @param {Function} [options.fetchImpl] - fetch implementation (tests).
 * @param {Function} [options.now] - `() => number` in ms (tests).
 * @param {object} [options.logger] - Logger.
 * @returns {{ watcher: object, getConfig: Function }} Handles for the tests.
 * @example
 * createApp(new GladysIntegration());
 */
function createApp(
  gladys,
  { fetchImpl = globalThis.fetch, now = () => Date.now(), logger = sdkLogger } = {},
) {
  let config = normalizeConfig();
  // Language of the last widget request: the fallback of the texts Gladys does
  // not ask for in a language, when the `language` setting is `auto`.
  let language = 'en';
  // Device external ids the user created (states are only published for them).
  let createdDevices = new Set();
  // Last connection status sent, to send it again only when it changes.
  let lastStatus = null;

  const iopool = createIopoolClient({
    getApiKey: () => config.apiKey,
    fetch: fetchImpl,
    userAgent: `${name}/${version} (+${homepage})`,
  });

  /**
   * @description Remember the language of a request, and store it when it changed.
   * @param {string} next - The language.
   */
  function rememberLanguage(next) {
    if (typeof next !== 'string' || !/^[a-z]{2}$/.test(next) || next === language) {
      return;
    }
    language = next;
    gladys
      .setConfig({ [INTERNAL_KEYS.language]: next })
      .catch((err) => logger.warn(`Unable to store the language: ${err.message}`));
  }

  /**
   * @description Language of the texts Gladys does not ask for in a language
   * (feature names and texts, scene summaries and outputs).
   * @returns {string} The language.
   */
  function textLanguage() {
    return config.language === AUTO_LANGUAGE ? language : config.language;
  }

  /**
   * @description Report the connection status, only when it changed.
   * @param {boolean} connected - Connected or not.
   * @param {object} message - The multi-language message.
   * @returns {Promise<void>}
   */
  async function reportStatus(connected, message) {
    const signature = JSON.stringify([connected, message]);
    if (signature === lastStatus) {
      return;
    }
    lastStatus = signature;
    try {
      await gladys.setConnectionStatus(connected, message);
    } catch (err) {
      lastStatus = null;
      logger.error('Unable to report the connection status', err);
    }
  }

  /**
   * @description The multi-language message of a failed reading.
   * @param {Error} err - An IopoolError.
   * @returns {object} The message.
   */
  function errorMessage(err) {
    switch (err.kind) {
      case 'auth':
        return all(hasApiKey(config) ? 'statusInvalidKey' : 'noApiKey');
      case 'rate_limit':
        return all('statusRateLimited');
      default:
        return all('statusUnreachable');
    }
  }

  /**
   * @description Refresh the list of the devices the user created.
   * @returns {Promise<void>}
   */
  async function refreshCreatedDevices() {
    try {
      const devices = await gladys.getDevices();
      createdDevices = new Set(devices.map((device) => device.external_id));
    } catch (err) {
      logger.warn(`Unable to read the devices: ${err.message}`);
    }
  }

  const isCreated = (id) => createdDevices.has(idsOf(gladys, id).device);

  /**
   * @description Publish the states of the created devices that changed. The
   * SDK remembers what it sent (publishChangedStates) and forgets a device when
   * the user creates it: its states then go out again in full.
   * @param {object[]} pools - Pool snapshots.
   * @returns {Promise<void>}
   */
  async function publishStates(pools) {
    const states = pools
      .filter((pool) => isCreated(pool.id))
      .flatMap((pool) => buildPoolStates(gladys, pool, textLanguage()));
    if (states.length > 0) {
      await gladys.publishChangedStates(states);
    }
  }

  const publishQuietly = (pools) =>
    publishStates(pools).catch((err) =>
      logger.warn(`Unable to publish the states: ${err.message}`),
    );

  /**
   * @description Ask the dashboards to read the widget again.
   */
  function refreshWidgets() {
    Object.values(WIDGETS).forEach((key) => gladys.requestWidgetRefresh(key));
  }

  /**
   * @description Publish a scene event; a failure is only logged.
   * @param {{ key: string, data: object }} event - The event.
   * @returns {Promise<void>}
   */
  async function publishEvent({ key, data }) {
    logger.info(`${data.device_name}: ${key}`);
    try {
      await gladys.publishSceneEvent(key, data);
    } catch (err) {
      logger.warn(`Unable to publish the scene event ${key}: ${err.message}`);
    }
  }

  // --- The watcher -----------------------------------------------------------------
  const watcher = createWatcher({
    iopool,
    isEnabled: () => hasApiKey(config),
    getIntervalMs: () => config.pollInterval * 60000,
    onRound: async ({ pools }) => {
      for (const { snapshot, events } of pools) {
        for (const event of events) {
          await publishEvent(buildPoolEvent(gladys, snapshot, event, textLanguage(), now()));
        }
      }
      const changed = pools.filter((pool) => pool.changed).map((pool) => pool.snapshot);
      if (changed.length > 0) {
        await publishQuietly(changed);
        refreshWidgets();
      }
      await reportStatus(
        true,
        pools.length === 0 ? all('statusNoPool') : all('statusConnected', { pools: pools.length }),
      );
    },
    onError: async (err) => {
      await reportStatus(false, errorMessage(err));
    },
    now,
    logger,
  });

  /**
   * @description Offer every pool read on the Discovery screen.
   * @returns {Promise<number>} How many devices were offered.
   */
  async function publishDiscoveredDevices() {
    const devices = hasApiKey(config)
      ? watcher.pools().map((pool) => buildPoolDevice(gladys, pool, textLanguage()))
      : [];
    await gladys.publishDiscoveredDevices(devices);
    return devices.length;
  }

  /**
   * @description The pool a widget or a scene action targets: the chosen
   * device, or the first pool of the account.
   * @param {unknown} deviceExternalId - The `source: "devices"` value.
   * @returns {object|null} The snapshot, null when none is known.
   */
  function resolvePool(deviceExternalId) {
    const id = poolIdFromExternalId(deviceExternalId);
    return (id && watcher.pool(id)) || watcher.pools()[0] || null;
  }

  // --- Dashboard widget --------------------------------------------------------------
  gladys.onWidgetGet(WIDGETS.POOL, async ({ settings = {}, language: lang, units }) => {
    rememberLanguage(lang);
    if (!hasApiKey(config)) {
      return messageContent(t('noApiKey', lang));
    }
    if (watcher.fetchedAt() === null) {
      return messageContent(t('notReadYet', lang), 30);
    }
    const pool = resolvePool(settings.device);
    if (!pool) {
      return messageContent(t('noPool', lang));
    }
    return buildPoolWidget({
      pool,
      language: lang,
      units,
      now: now(),
      pollMinutes: config.pollInterval,
      settings: readPoolSettings(settings),
      featureId: isCreated(pool.id) ? idsOf(gladys, pool.id).feature : null,
    });
  });

  // --- Scene action ------------------------------------------------------------------
  gladys.onSceneAction(SCENE_ACTIONS.GET_POOL, async (fields) => {
    if (!hasApiKey(config)) {
      throw new Error('No iopool API key is configured');
    }
    if (watcher.fetchedAt() === null || now() - watcher.fetchedAt() > SNAPSHOT_MAX_AGE_MS) {
      // Read for this answer only when the last reading is old: a scene run
      // every minute must not multiply the requests.
      const target = poolIdFromExternalId(fields.device);
      const fresh = readPools(await iopool.listPools());
      const pool = fresh.find((item) => item.id === target) ?? fresh[0];
      if (!pool) {
        throw new Error('No pool in this iopool account');
      }
      const known = watcher.pool(pool.id);
      return buildPoolOutputs(
        { ...pool, measure: pool.measure ?? known?.measure ?? null },
        textLanguage(),
      );
    }
    const pool = resolvePool(fields.device);
    if (!pool) {
      throw new Error('No pool in this iopool account');
    }
    return buildPoolOutputs(pool, textLanguage());
  });

  // --- Device commands ---------------------------------------------------------------
  // The iopool API is read-only: every feature is read-only.
  gladys.onSetValue(async (device, deviceFeature) => {
    throw new Error(`Read-only feature: ${deviceFeature.external_id}`);
  });

  // --- Configuration screen actions --------------------------------------------------
  gladys.onAction(ACTIONS.TEST_CONNECTION, async () => {
    if (!hasApiKey(config)) {
      return all('noApiKey');
    }
    try {
      const pools = readPools(await iopool.listPools());
      return all('testOk', { pools: pools.length });
    } catch (err) {
      return errorMessage(err);
    }
  });

  // --- Devices -----------------------------------------------------------------------
  gladys.onScanRequest(async () => {
    await watcher.round();
    const count = await publishDiscoveredDevices();
    logger.info(`Scan: ${count} iopool pool(s) offered`);
  });

  gladys.onDeviceCreated(async () => {
    await refreshCreatedDevices();
    // States sent before the device existed were dropped by Gladys, and the SDK
    // forgot what it sent for this device: send everything known again.
    await publishQuietly(watcher.pools());
    refreshWidgets();
  });

  gladys.onDeviceDeleted(refreshCreatedDevices);

  // --- Configuration -----------------------------------------------------------------

  /**
   * @description Reload the whole config (internal keys included).
   * @param {object} [fallback] - Raw values to use when the read fails.
   * @returns {Promise<void>}
   */
  async function loadConfig(fallback) {
    try {
      const raw = await gladys.getConfig();
      config = normalizeConfig(raw);
      language = readLanguage(raw, language);
    } catch (err) {
      if (fallback) {
        config = normalizeConfig(fallback);
      }
      logger.error('Unable to read the configuration', err);
    }
  }

  /**
   * @description Read iopool now and offer the devices; report a missing key.
   * @returns {Promise<void>}
   */
  async function refreshAll() {
    if (!hasApiKey(config)) {
      await reportStatus(false, all('noApiKey'));
    }
    await watcher.round();
    await publishDiscoveredDevices().catch((err) =>
      logger.warn(`Unable to offer the devices: ${err.message}`),
    );
  }

  gladys.onConfigUpdated(async (rawConfig) => {
    const previousKey = config.apiKey;
    await loadConfig(rawConfig);
    logger.info(`Configuration updated: iopool read every ${config.pollInterval} min`);
    if (config.apiKey !== previousKey) {
      // Maybe another account: start again from a fresh baseline.
      watcher.reset();
    }
    watcher.reschedule();
    await refreshAll();
  });

  // --- Connection lifecycle ----------------------------------------------------------
  // Each step on its own: a failing one must not keep the watcher from starting.
  gladys.on('connected', async () => {
    await loadConfig();
    await refreshCreatedDevices();
    lastStatus = null;
    await refreshAll();
    watcher.start();
  });

  // --- Graceful shutdown -------------------------------------------------------------
  gladys.handleShutdown((signal) => {
    logger.info(`Received ${signal} -> graceful shutdown`);
    watcher.stop();
  });

  return { watcher, getConfig: () => config };
}

export { createApp, ACTIONS, SCENE_ACTIONS };
