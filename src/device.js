// -----------------------------------------------------------------------------
// The devices of the iopool integration, offered on the Discovery screen.
//
// One device per pool of the account, "iopool <pool name>":
//   - water temperature        temperature-sensor / decimal, °C
//   - pH                       ph-sensor / decimal
//   - redox (ORP)              orp-sensor / decimal, mV
//   - recommended filtration   duration / integer, minutes a day (iopool sends
//                              hours; minutes keep "6 h 30" exact)
//   - action required          text / text: whether the iopool app asks for an
//                              action on the water
//   - pool mode                text / text: standard, opening, active or
//                              passive wintering, initialization
//
// External ids are built on the pool id of iopool (a UUID), never on a name.
//
// The iopool API has no push: the integration reads it on its own timer (every
// 10 minutes by default, beyond the 60 s Gladys polls at most), so
// `should_poll` is false. The API is read-only: every feature is read-only.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';
import { filtrationMinutes } from './read.js';
import { t } from './i18n.js';

const DEVICE_TYPE = 'pool';

const FEATURE_KEYS = {
  TEMPERATURE: 'temperature',
  PH: 'ph',
  ORP: 'orp',
  FILTRATION: 'filtration',
  ACTION_REQUIRED: 'action_required',
  POOL_MODE: 'pool_mode',
};

const round = (value, digits) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value * 10 ** digits) / 10 ** digits
    : null;

const sensor = { read_only: true, has_feedback: false, keep_history: true };
const text = {
  category: CATEGORIES.TEXT,
  type: TYPES.TEXT.TEXT,
  read_only: true,
  has_feedback: false,
  keep_history: false,
  min: 0,
  max: 0,
};

/**
 * @description The text of a pool mode (the raw value when iopool adds a new one).
 * @param {string|null} mode - The pool mode.
 * @param {string} language - The language.
 * @returns {string|null} The text.
 * @example
 * poolModeText('WINTER', 'fr'); // -> 'Hivernage passif'
 */
function poolModeText(mode, language) {
  if (!mode) {
    return null;
  }
  const label = t(`poolMode_${mode}`, language);
  return label === `poolMode_${mode}` ? mode : label;
}

/**
 * @description The text of a measure mode (the raw value when unknown).
 * @param {string|null} mode - The measure mode.
 * @param {string} language - The language.
 * @returns {string|null} The text.
 */
function measureModeText(mode, language) {
  if (!mode) {
    return null;
  }
  const label = t(`measureMode_${mode}`, language);
  return label === `measureMode_${mode}` ? mode : label;
}

// The features of a pool: their Gladys shape and their state. `state` returns
// a number, `{ text }`, or null when unknown (not published).
const POOL_FEATURES = [
  {
    key: FEATURE_KEYS.TEMPERATURE,
    name: 'featureTemperature',
    shape: {
      ...sensor,
      category: CATEGORIES.TEMPERATURE_SENSOR,
      type: TYPES.SENSOR.DECIMAL,
      unit: UNITS.CELSIUS,
      min: -10,
      max: 50,
    },
    state: (pool) => round(pool.measure?.temperature, 1),
  },
  {
    key: FEATURE_KEYS.PH,
    name: 'featurePh',
    shape: {
      ...sensor,
      category: CATEGORIES.PH_SENSOR,
      type: TYPES.PH_SENSOR.DECIMAL,
      unit: UNITS.PH,
      min: 0,
      max: 14,
    },
    state: (pool) => round(pool.measure?.ph, 2),
  },
  {
    key: FEATURE_KEYS.ORP,
    name: 'featureOrp',
    shape: {
      ...sensor,
      category: CATEGORIES.ORP_SENSOR,
      type: TYPES.ORP_SENSOR.DECIMAL,
      unit: UNITS.MILLI_VOLT,
      min: 0,
      max: 1200,
    },
    state: (pool) => round(pool.measure?.orp, 0),
  },
  {
    key: FEATURE_KEYS.FILTRATION,
    name: 'featureFiltration',
    shape: {
      ...sensor,
      category: CATEGORIES.DURATION,
      type: TYPES.DURATION.INTEGER,
      unit: UNITS.MINUTES,
      min: 0,
      max: 1440,
    },
    state: (pool) => filtrationMinutes(pool.filtrationHours),
  },
  {
    key: FEATURE_KEYS.ACTION_REQUIRED,
    name: 'featureAction',
    shape: text,
    state: (pool, language) =>
      typeof pool.actionRequired === 'boolean'
        ? { text: t(pool.actionRequired ? 'action_yes' : 'action_no', language) }
        : null,
  },
  {
    key: FEATURE_KEYS.POOL_MODE,
    name: 'featurePoolMode',
    shape: text,
    state: (pool, language) => (pool.mode ? { text: poolModeText(pool.mode, language) } : null),
  },
];

/**
 * @description The external ids of a pool.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {string} id - The iopool pool id.
 * @returns {{ device: string, feature: Function }} The ids.
 * @example
 * idsOf(gladys, '1aaa22b3-ccc4').device; // -> 'ext:iopool:pool:1aaa22b3-ccc4'
 */
function idsOf(gladys, id) {
  return gladys.externalIds(DEVICE_TYPE, id);
}

/**
 * @description The pool id a device (or feature) external id stands for.
 * @param {unknown} externalId - The external id.
 * @returns {string|null} The pool id.
 * @example
 * poolIdFromExternalId('ext:iopool:pool:1aaa22b3-ccc4:ph'); // -> '1aaa22b3-ccc4'
 */
function poolIdFromExternalId(externalId) {
  const match = /:pool:([A-Za-z0-9_-]+)(?::[a-z_]+)?$/.exec(String(externalId ?? ''));
  return match ? match[1] : null;
}

/**
 * @description The name of a pool device.
 * @param {object} pool - The pool snapshot.
 * @param {string} language - The language.
 * @returns {string} "iopool My pool".
 */
function poolName(pool, language) {
  return t('poolDeviceName', language, { title: pool.title ?? t('defaultTitle', language) });
}

/**
 * @description The device of a pool.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} pool - The pool snapshot.
 * @param {string} [language] - Language of the names.
 * @returns {object} The discovered device.
 * @example
 * buildPoolDevice(gladys, { id: '1aaa22b3-ccc4', title: 'Garden' }, 'fr');
 */
function buildPoolDevice(gladys, pool, language = 'en') {
  const ids = idsOf(gladys, pool.id);
  return {
    name: poolName(pool, language),
    external_id: ids.device,
    should_poll: false,
    params: [
      { name: 'IOPOOL_POOL_ID', value: pool.id },
      ...(pool.measure?.probe ? [{ name: 'IOPOOL_ECO_ID', value: pool.measure.probe }] : []),
    ],
    features: POOL_FEATURES.map((spec) => ({
      name: t(spec.name, language),
      external_id: ids.feature(spec.key),
      ...spec.shape,
    })),
  };
}

/**
 * @description The states of a pool. Unknown values are left out, never
 * published as 0.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} pool - The pool snapshot.
 * @param {string} language - Language of the texts.
 * @returns {Array<object>} The states.
 */
function buildPoolStates(gladys, pool, language) {
  const ids = idsOf(gladys, pool.id);
  return POOL_FEATURES.flatMap((spec) => {
    const value = spec.state(pool, language);
    if (value === null) {
      return [];
    }
    const id = ids.feature(spec.key);
    return [
      typeof value === 'object'
        ? { device_feature_external_id: id, text: value.text }
        : { device_feature_external_id: id, state: value },
    ];
  });
}

export {
  DEVICE_TYPE,
  FEATURE_KEYS,
  POOL_FEATURES,
  idsOf,
  poolIdFromExternalId,
  poolName,
  poolModeText,
  measureModeText,
  buildPoolDevice,
  buildPoolStates,
};
