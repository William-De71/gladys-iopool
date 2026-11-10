// -----------------------------------------------------------------------------
// The reading loop: every `poll_interval` minutes, one request to the iopool
// API returns every pool of the account with its latest measure.
//
// It keeps the snapshots the devices, widgets, scene actions and triggers
// read, and hands each round to the app with its transitions (tracker.js).
// A round never overlaps another one; a failing read keeps the last
// snapshots and goes to onError.
// -----------------------------------------------------------------------------

import { readPools } from './read.js';
import { isStale, diffPool } from './tracker.js';

/**
 * @description Create the watcher.
 * @param {object} options - Options.
 * @param {object} options.iopool - The iopool client.
 * @param {Function} options.isEnabled - `() => boolean`: an API key is known.
 * @param {Function} options.getIntervalMs - `() => number`.
 * @param {Function} options.onRound - `async ({ pools }) => void`, each pool
 * as `{ snapshot, events, changed }`.
 * @param {Function} options.onError - `async (err) => void`.
 * @param {Function} [options.now] - `() => number` in ms.
 * @param {object} options.logger - Logger.
 * @returns {object} The watcher.
 * @example
 * const watcher = createWatcher({ iopool, isEnabled, getIntervalMs, onRound, onError, logger });
 * watcher.start();
 */
function createWatcher({
  iopool,
  isEnabled,
  getIntervalMs,
  onRound,
  onError,
  now = () => Date.now(),
  logger,
}) {
  // id -> snapshot
  let pools = new Map();
  let fetchedAt = null;
  let timer = null;
  let running = null;
  let started = false;

  /**
   * @description One reading of the whole account.
   * @returns {Promise<void>}
   */
  async function readAll() {
    const listed = readPools(await iopool.listPools());
    const at = now();
    const next = new Map();
    const round = { pools: [] };
    for (const pool of listed) {
      const previous = pools.get(pool.id);
      // No measure in this answer (a new probe, a hiccup): keep the last one.
      const measure = pool.measure ?? previous?.measure ?? null;
      const snapshot = { ...pool, measure };
      snapshot.stale = isStale(snapshot, at);
      next.set(pool.id, snapshot);
      round.pools.push({
        snapshot,
        events: diffPool(previous, snapshot),
        changed:
          !previous ||
          JSON.stringify({ ...previous, stale: null }) !==
            JSON.stringify({ ...snapshot, stale: null }),
      });
    }
    pools = next;
    fetchedAt = at;
    await onRound(round);
  }

  /**
   * @description Plan the next round.
   */
  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (started) {
      timer = setTimeout(() => {
        round().finally(schedule);
      }, getIntervalMs());
      timer.unref?.();
    }
  }

  /**
   * @description Read the account now; joins a round already running.
   * @returns {Promise<void>} Never rejects: failures go to onError.
   */
  function round() {
    if (running) {
      return running;
    }
    if (!isEnabled()) {
      return Promise.resolve();
    }
    running = readAll()
      .catch(async (err) => {
        logger.warn(`iopool reading failed: ${err.message}`);
        await onError(err);
      })
      .catch((err) => logger.error('Unable to report a reading failure', err))
      .finally(() => {
        running = null;
      });
    return running;
  }

  return {
    round,
    start: () => {
      started = true;
      schedule();
    },
    stop: () => {
      started = false;
      clearTimeout(timer);
      timer = null;
    },
    reschedule: schedule,
    /** @description Forget everything: the next round is a new baseline. */
    reset: () => {
      pools = new Map();
      fetchedAt = null;
    },
    pools: () => [...pools.values()],
    pool: (id) => pools.get(id) ?? null,
    fetchedAt: () => fetchedAt,
  };
}

export { createWatcher };
