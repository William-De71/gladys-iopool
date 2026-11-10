// -----------------------------------------------------------------------------
// Answers of the iopool API -> plain pool snapshots (pure logic, no I/O).
//
// A pool of GET /v1/pools:
//   {
//     "id": "1aaa22b3-…",                 stable id of the pool
//     "title": "My pool",                 name given in the iopool app
//     "latestMeasure": {                  null before the first measure
//       "temperature": 23.13,             °C
//       "ph": 7.42,
//       "orp": 660,                       mV
//       "mode": "standard",               how the measure was taken: standard,
//                                         live, maintenance, manual, backup,
//                                         gateway
//       "isValid": true,
//       "ecoId": "/Keb7cMf",              the iopool EcO probe
//       "measuredAt": "2024-05-24T14:04:00.000Z"
//     },
//     "mode": "STANDARD",                 pool mode: STANDARD, OPENING,
//                                         ACTIVE_WINTER, WINTER, INITIALIZATION
//     "hasAnActionRequired": false,       the iopool app asks for an action
//     "advice": { "filtrationDuration": 4 }   recommended filtration, hours/day
//   }
//
// A value the API did not send is null, never 0. A pool without a usable id
// is left out (its external id could not be stable).
// -----------------------------------------------------------------------------

const POOL_MODES = ['STANDARD', 'OPENING', 'ACTIVE_WINTER', 'WINTER', 'INITIALIZATION'];
const MEASURE_MODES = ['standard', 'live', 'maintenance', 'manual', 'backup', 'gateway'];

const finite = (value) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
};
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * @description The latest measure of a pool.
 * @param {unknown} raw - `latestMeasure`.
 * @returns {object|null} `{ temperature, ph, orp, mode, isValid, probe, measuredAt }`
 * (measuredAt in ms), null without a dated measure.
 * @example
 * readMeasure({ temperature: 23.1, ph: 7.4, orp: 660, measuredAt: '2026-07-14T09:00:00Z' });
 */
function readMeasure(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const measuredAt = Date.parse(raw.measuredAt);
  if (!Number.isFinite(measuredAt)) {
    return null;
  }
  const mode = text(raw.mode)?.toLowerCase() ?? null;
  return {
    temperature: finite(raw.temperature),
    ph: finite(raw.ph),
    orp: finite(raw.orp),
    mode,
    isValid: typeof raw.isValid === 'boolean' ? raw.isValid : null,
    probe: text(raw.ecoId),
    measuredAt,
  };
}

/**
 * @description One pool of the API.
 * @param {unknown} raw - A pool.
 * @returns {object|null} The snapshot data, null without an id.
 * @example
 * readPool({ id: 'abc', title: 'Pool', mode: 'STANDARD', hasAnActionRequired: false });
 */
function readPool(raw) {
  const id = text(raw?.id);
  if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return null;
  }
  const hours = finite(raw.advice?.filtrationDuration);
  return {
    id,
    title: text(raw.title),
    mode: text(raw.mode)?.toUpperCase() ?? null,
    actionRequired: typeof raw.hasAnActionRequired === 'boolean' ? raw.hasAnActionRequired : null,
    filtrationHours: hours !== null && hours >= 0 ? hours : null,
    measure: readMeasure(raw.latestMeasure),
  };
}

/**
 * @description Every pool of the API answer; duplicates and unusable ones left out.
 * @param {unknown} raw - The answer of GET /v1/pools.
 * @returns {Array<object>} The pools.
 * @example
 * readPools([{ id: 'abc', title: 'Pool' }]).length; // -> 1
 */
function readPools(raw) {
  const pools = new Map();
  (Array.isArray(raw) ? raw : []).forEach((item) => {
    const pool = readPool(item);
    if (pool && !pools.has(pool.id)) {
      pools.set(pool.id, pool);
    }
  });
  return [...pools.values()];
}

/**
 * @description The recommended filtration, in whole minutes.
 * @param {number|null} hours - The recommendation, in hours.
 * @returns {number|null} The minutes.
 * @example
 * filtrationMinutes(6.5); // -> 390
 */
function filtrationMinutes(hours) {
  return typeof hours === 'number' ? Math.round(hours * 60) : null;
}

export { POOL_MODES, MEASURE_MODES, readMeasure, readPool, readPools, filtrationMinutes };
