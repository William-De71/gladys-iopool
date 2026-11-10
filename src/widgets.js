// -----------------------------------------------------------------------------
// Dashboard widget of the iopool integration.
//
//   - `pool`  the water of a pool at a glance: temperature, pH, redox and
//             recommended filtration tiles, the history of one of them (the
//             chart reads the states Gladys already keeps), what iopool asks,
//             and the pool mode and how the latest measure was taken.
//
// The contents come from the snapshots of the last reading: a widget never
// costs an iopool request. iopool publishes no ideal ranges, so the tiles are
// not colored by a rule of ours: only "action required", as iopool says it,
// turns the advice row red. Every text exists in the four languages (the
// content is cached per language and units).
// -----------------------------------------------------------------------------

import { t, ago, formatDuration } from './i18n.js';
import { FEATURE_KEYS, poolName, poolModeText, measureModeText } from './device.js';
import { filtrationMinutes } from './read.js';

const WIDGETS = { POOL: 'pool' };

const CHART_FEATURES = ['temperature', 'ph', 'orp', 'filtration', 'none'];
const CHART_INTERVALS = ['last-day', 'last-three-days', 'last-week', 'last-month'];
const DEFAULT_CHART = 'temperature';
const DEFAULT_INTERVAL = 'last-week';
const TTL = { min: 60, max: 3600, message: 300 };
const CHART_UNITS = { temperature: '°C', ph: 'pH', orp: 'mV', filtration: 'min' };

/**
 * @description Truncate a text to a bound, with an ellipsis.
 * @param {string} value - The text.
 * @param {number} max - The bound.
 * @returns {string} The text.
 * @example
 * clip('A very long title', 10); // -> 'A very lo…'
 */
function clip(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * @description A widget content made of one message.
 * @param {string} message - The message.
 * @param {number} [ttl] - Its freshness.
 * @returns {object} The content.
 * @example
 * messageContent('No pool');
 */
function messageContent(message, ttl = TTL.message) {
  return {
    ttl_seconds: ttl,
    components: [{ type: 'text', variant: 'body', text: clip(message, 300) }],
  };
}

/**
 * @description The settings of the widget, unknown values replaced by the defaults.
 * @param {object} [settings] - The raw settings.
 * @returns {{ chart: string, interval: string }} The settings.
 * @example
 * readPoolSettings({ chart: 'ph' }); // -> { chart: 'ph', interval: 'last-week' }
 */
function readPoolSettings(settings = {}) {
  return {
    chart: CHART_FEATURES.includes(settings.chart) ? settings.chart : DEFAULT_CHART,
    interval: CHART_INTERVALS.includes(settings.interval) ? settings.interval : DEFAULT_INTERVAL,
  };
}

const round = (value, digits) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value * 10 ** digits) / 10 ** digits
    : '–';

/**
 * @description What to do about the water, one or two sentences.
 * @param {object} pool - The pool snapshot.
 * @param {string} language - The language.
 * @param {number} now - Now, in ms.
 * @returns {string} The advice.
 */
function advice(pool, language, now) {
  if (pool.mode === 'WINTER') {
    return t('adviceWinter', language);
  }
  if (pool.stale) {
    return t('adviceStale', language, {
      hours: Math.floor((now - pool.measure.measuredAt) / 3600000),
    });
  }
  const parts = [t(pool.actionRequired ? 'adviceAction' : 'adviceNothing', language)];
  const minutes = filtrationMinutes(pool.filtrationHours);
  if (minutes !== null && minutes > 0) {
    parts.push(t('adviceFiltration', language, { duration: formatDuration(minutes, language) }));
  }
  return parts.join(' ');
}

/**
 * @description The `pool` widget.
 * @param {object} options - Options.
 * @param {object} options.pool - The pool snapshot.
 * @param {string} options.language - The user language.
 * @param {string} [options.units] - `metric` or `imperial`.
 * @param {number} options.now - Now, in ms.
 * @param {number} options.pollMinutes - The reading interval.
 * @param {object} [options.settings] - The widget settings (readPoolSettings).
 * @param {Function|null} [options.featureId] - `(key) => external id` of the
 * pool features, null when the device is not created (no chart then: the
 * core has no history of it).
 * @returns {object} The content.
 * @example
 * buildPoolWidget({ pool, language: 'fr', now: Date.now(), pollMinutes: 10 });
 */
function buildPoolWidget({
  pool,
  language,
  units = 'metric',
  now,
  pollMinutes,
  settings = readPoolSettings(),
  featureId = null,
}) {
  const { measure } = pool;
  const name = poolName(pool, language);
  const ttl = Math.min(TTL.max, Math.max(TTL.min, Math.round(pollMinutes * 60)));
  if (!measure) {
    return messageContent(`${name} · ${t('noMeasure', language)}`, ttl);
  }
  const imperial = units === 'imperial';
  const temperature =
    typeof measure.temperature === 'number' && imperial
      ? (measure.temperature * 9) / 5 + 32
      : measure.temperature;
  const hours =
    typeof pool.filtrationHours === 'number' ? Math.round(pool.filtrationHours * 10) / 10 : '–';

  const components = [
    {
      type: 'text',
      variant: 'caption',
      text: clip(
        t('measuredAgo', language, { ago: ago(measure.measuredAt, now, language), name }),
        80,
      ),
    },
    {
      type: 'value',
      value: round(temperature, 1),
      unit: imperial ? '°F' : '°C',
      label: t('tileWater', language),
      icon: 'thermometer',
      color: 'info',
    },
    { type: 'value', value: round(measure.ph, 2), label: t('tilePh', language), icon: 'droplet' },
    {
      type: 'value',
      value: round(measure.orp, 0),
      unit: 'mV',
      label: t('tileOrp', language),
      icon: 'zap',
    },
    {
      type: 'value',
      value: hours,
      unit: t('hoursPerDay', language),
      label: t('tileFiltration', language),
      icon: 'clock',
    },
  ];

  if (featureId && settings.chart !== 'none') {
    components.push({
      type: 'chart',
      device_features: [featureId(FEATURE_KEYS[settings.chart.toUpperCase()])],
      interval: settings.interval,
      chart_type: 'line',
      title: t(`chart_${settings.chart}`, language),
      unit: CHART_UNITS[settings.chart],
    });
  }

  components.push({ type: 'text', variant: 'body', text: clip(advice(pool, language, now), 300) });

  const rows = [];
  if (typeof pool.actionRequired === 'boolean') {
    rows.push({
      label: t('rowAction', language),
      value: t(pool.actionRequired ? 'action_yes' : 'action_no', language),
      color: pool.actionRequired ? 'danger' : 'success',
    });
  }
  if (pool.mode) {
    rows.push({
      label: t('rowPoolMode', language),
      value: clip(poolModeText(pool.mode, language), 40),
      color: pool.mode === 'STANDARD' ? 'neutral' : 'info',
    });
  }
  if (measure.mode) {
    const mode = measureModeText(measure.mode, language);
    rows.push({
      label: t('rowMeasure', language),
      value: clip(
        measure.isValid === false
          ? t('measureInvalid', language, { mode })
          : t('measureValid', language, { mode }),
        40,
      ),
      color: measure.isValid === false ? 'warning' : 'neutral',
    });
  }
  if (rows.length > 0) {
    components.push({ type: 'status', items: rows });
  }

  return { ttl_seconds: ttl, components };
}

export {
  WIDGETS,
  CHART_FEATURES,
  CHART_INTERVALS,
  DEFAULT_CHART,
  DEFAULT_INTERVAL,
  clip,
  messageContent,
  readPoolSettings,
  advice,
  buildPoolWidget,
};
