// -----------------------------------------------------------------------------
// Pool snapshots -> scene trigger transitions (pure logic, no I/O).
//
// One event per transition, never a periodic snapshot:
//   - new_measure                the probe sent a measure newer than the last one;
//   - action_required_changed    the iopool app starts (or stops) asking for an
//                                action on the water;
//   - pool_mode_changed          the pool moved to another mode (standard,
//                                opening, active or passive wintering…);
//   - filtration_advice_changed  iopool changed the recommended filtration
//                                duration (it follows the water temperature);
//   - measures_stopped           no new measure for STALE_HOURS (fired once,
//                                again only after measures came back; never in
//                                passive wintering, where the probe is out of
//                                the water).
//
// A pool seen for the first time (start, restart, new key) is a baseline:
// nothing that happened before is replayed. The API is read-only: no change
// made by the integration can fire a trigger.
// -----------------------------------------------------------------------------

const SCENE_TRIGGERS = {
  NEW_MEASURE: 'new_measure',
  ACTION_REQUIRED_CHANGED: 'action_required_changed',
  POOL_MODE_CHANGED: 'pool_mode_changed',
  FILTRATION_ADVICE_CHANGED: 'filtration_advice_changed',
  MEASURES_STOPPED: 'measures_stopped',
};

const STALE_HOURS = 24;
const HOUR = 3600000;
// Passive wintering: the probe is out of the water, no measure is expected.
const QUIET_MODES = ['WINTER'];

/**
 * @description Whether the measures of a pool stopped coming.
 * @param {object} pool - `{ mode, measure }`.
 * @param {number} now - Now, in ms.
 * @returns {boolean} True when the latest measure is older than STALE_HOURS,
 * outside passive wintering.
 * @example
 * isStale({ mode: 'STANDARD', measure: { measuredAt: Date.now() - 25 * 3600000 } }, Date.now()); // -> true
 */
function isStale(pool, now) {
  return (
    Boolean(pool.measure) &&
    !QUIET_MODES.includes(pool.mode) &&
    now - pool.measure.measuredAt > STALE_HOURS * HOUR
  );
}

/**
 * @description The transitions between two snapshots of a pool.
 * @param {object|undefined} previous - The previous snapshot, undefined the first time.
 * @param {object} next - The new snapshot (`{ measure, actionRequired, mode,
 * filtrationHours, stale }`).
 * @returns {Array<object>} `{ key, previous? }` events.
 * @example
 * diffPool(before, after); // -> [{ key: 'new_measure' }]
 */
function diffPool(previous, next) {
  if (!previous) {
    return [];
  }
  const events = [];
  const before = previous.measure;
  const after = next.measure;
  if (after && (!before || after.measuredAt > before.measuredAt)) {
    events.push({ key: SCENE_TRIGGERS.NEW_MEASURE });
  }
  if (
    typeof previous.actionRequired === 'boolean' &&
    typeof next.actionRequired === 'boolean' &&
    previous.actionRequired !== next.actionRequired
  ) {
    events.push({ key: SCENE_TRIGGERS.ACTION_REQUIRED_CHANGED });
  }
  if (previous.mode && next.mode && previous.mode !== next.mode) {
    events.push({ key: SCENE_TRIGGERS.POOL_MODE_CHANGED, previous: previous.mode });
  }
  if (
    typeof previous.filtrationHours === 'number' &&
    typeof next.filtrationHours === 'number' &&
    previous.filtrationHours !== next.filtrationHours
  ) {
    events.push({
      key: SCENE_TRIGGERS.FILTRATION_ADVICE_CHANGED,
      previous: previous.filtrationHours,
    });
  }
  if (next.stale && !previous.stale) {
    events.push({ key: SCENE_TRIGGERS.MEASURES_STOPPED });
  }
  return events;
}

export { SCENE_TRIGGERS, STALE_HOURS, QUIET_MODES, isStale, diffPool };
