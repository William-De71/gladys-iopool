// -----------------------------------------------------------------------------
// Scene events and scene action outputs of the integration.
//
// The tracker says what happened; this module writes the flat `data` of the
// event the core matches against the scene triggers. Every event carries:
//   - `device`       the device external id: the value of the "Device"
//                    filter (a `source: "devices"` select);
//   - `device_name`  "iopool My pool", readable by the actions;
//   - `summary`      a sentence ready to put in a message;
// plus the fields of its kind. Values are scalars (null when iopool did not
// say), texts cut at 1,000 characters.
// -----------------------------------------------------------------------------

import { SCENE_TRIGGERS, STALE_HOURS } from './tracker.js';
import { idsOf, poolName, poolModeText } from './device.js';
import { filtrationMinutes } from './read.js';
import { t, formatNumber, formatDuration } from './i18n.js';

const MAX_TEXT = 1000;
const clip = (value) => String(value ?? '').slice(0, MAX_TEXT);
const iso = (instant) => (Number.isFinite(instant) ? new Date(instant).toISOString() : null);
const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * @description The values of a measure, shared by the new_measure event and
 * the get_pool action.
 * @param {object|null} measure - The measure.
 * @returns {object} Flat values.
 */
function measureValues(measure) {
  return {
    temperature: finite(measure?.temperature),
    ph: finite(measure?.ph),
    orp: finite(measure?.orp),
    measure_mode: measure?.mode ?? null,
    is_valid: typeof measure?.isValid === 'boolean' ? measure.isValid : null,
    measured_at: iso(measure?.measuredAt),
  };
}

/**
 * @description "iopool Garden: water 26.4 °C, pH 7.2, redox 702 mV."
 * @param {string} name - The device name.
 * @param {object} measure - The measure.
 * @param {string} language - The language.
 * @returns {string} The sentence.
 */
function measureSummary(name, measure, language) {
  return t('summaryMeasure', language, {
    name,
    temperature: formatNumber(measure.temperature, language, 1),
    ph: formatNumber(measure.ph, language, 2),
    orp: formatNumber(measure.orp, language, 0),
  });
}

/**
 * @description The event of a pool transition.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} pool - The pool snapshot.
 * @param {object} event - From diffPool.
 * @param {string} language - Language of the summary.
 * @param {number} now - Now, in ms.
 * @returns {{ key: string, data: object }} The event.
 * @example
 * const { key, data } = buildPoolEvent(gladys, pool, { key: 'new_measure' }, 'fr', Date.now());
 * await gladys.publishSceneEvent(key, data);
 */
function buildPoolEvent(gladys, pool, event, language, now) {
  const name = poolName(pool, language);
  const { measure } = pool;
  const data = { device: idsOf(gladys, pool.id).device, device_name: clip(name) };
  switch (event.key) {
    case SCENE_TRIGGERS.NEW_MEASURE:
      Object.assign(data, measureValues(measure), {
        summary: clip(measureSummary(name, measure, language)),
      });
      break;
    case SCENE_TRIGGERS.ACTION_REQUIRED_CHANGED:
      Object.assign(data, {
        state: pool.actionRequired ? 'required' : 'resolved',
        summary: clip(
          t(pool.actionRequired ? 'summaryActionRequired' : 'summaryActionResolved', language, {
            name,
          }),
        ),
      });
      break;
    case SCENE_TRIGGERS.POOL_MODE_CHANGED:
      Object.assign(data, {
        mode: pool.mode,
        previous_mode: event.previous ?? null,
        summary: clip(
          t('summaryPoolMode', language, {
            name,
            mode: (poolModeText(pool.mode, language) ?? '?').toLowerCase(),
          }),
        ),
      });
      break;
    case SCENE_TRIGGERS.FILTRATION_ADVICE_CHANGED: {
      const minutes = filtrationMinutes(pool.filtrationHours);
      const previous = filtrationMinutes(event.previous ?? null);
      Object.assign(data, {
        minutes,
        hours: finite(pool.filtrationHours),
        previous_minutes: previous,
        summary: clip(
          t('summaryFiltration', language, {
            name,
            duration: formatDuration(minutes, language),
            previous: formatDuration(previous, language),
          }),
        ),
      });
      break;
    }
    case SCENE_TRIGGERS.MEASURES_STOPPED: {
      const hours = measure ? Math.floor((now - measure.measuredAt) / 3600000) : STALE_HOURS;
      Object.assign(data, {
        last_measure_at: iso(measure?.measuredAt),
        hours,
        summary: clip(t('summaryStopped', language, { name, hours })),
      });
      break;
    }
    default:
      throw new Error(`Unknown pool event: ${event.key}`);
  }
  return { key: event.key, data };
}

/**
 * @description The outputs of the get_pool scene action. Numbers iopool did
 * not send are -1 (outputs are typed), texts are empty.
 * @param {object} pool - The pool snapshot.
 * @param {string} language - Language of the summary.
 * @returns {object} The outputs.
 */
function buildPoolOutputs(pool, language) {
  const name = poolName(pool, language);
  const values = measureValues(pool.measure);
  const number = (value) => value ?? -1;
  return {
    temperature: number(values.temperature),
    ph: number(values.ph),
    orp: number(values.orp),
    filtration_minutes: number(filtrationMinutes(pool.filtrationHours)),
    action_required: pool.actionRequired === true,
    pool_mode: pool.mode ?? '',
    measured_at: values.measured_at ?? '',
    summary: pool.measure
      ? clip(measureSummary(name, pool.measure, language))
      : clip(`${name}: ${t('noMeasure', language)}`),
  };
}

export { measureValues, buildPoolEvent, buildPoolOutputs };
