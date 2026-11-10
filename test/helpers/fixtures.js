// Shapes of the iopool API answers (GET /v1/pools, as shown in the iopool
// help center and recorded by the community integrations), a fake iopool API
// and a stand-in for the SDK external ids.

export const NOW = Date.parse('2026-07-14T10:00:00Z');
export const HOUR = 3600000;

export const POOL_ID = '1aaa22b3-ccc4-4567-d888-e999ff000000';
export const SPA_ID = '2bbb33c4-ddd5-4678-e999-f000aa111111';
export const API_KEY = 'k3y-0f-the-app';

/**
 * @description A raw pool of GET /v1/pools.
 * @param {object} [options] - Overrides.
 * @returns {object} The pool.
 */
export function rawPool({
  id = POOL_ID,
  title = 'Garden',
  at = NOW - HOUR,
  temperature = 26.4123,
  ph = 7.2187,
  orp = 702,
  measureMode = 'standard',
  isValid = true,
  mode = 'STANDARD',
  action = false,
  filtration = 6.5,
  measure = true,
} = {}) {
  return {
    id,
    title,
    latestMeasure: measure
      ? {
          temperature,
          ph,
          orp,
          mode: measureMode,
          isValid,
          ecoId: '/Keb7cMf',
          measuredAt: new Date(at).toISOString(),
        }
      : null,
    mode,
    hasAnActionRequired: action,
    advice: { filtrationDuration: filtration },
  };
}

/**
 * @description A fake iopool API: a fetch answering like api.iopool.com
 * from an editable state. Records every call in `fetch.calls`.
 * @param {object} [state] - `{ key, pools, failure }`.
 * @returns {Function} The fetch, with `.state` and `.calls`.
 */
export function iopoolCloud(state = {}) {
  const cloud = { key: API_KEY, pools: [rawPool()], failure: null, ...state };
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  const fetch = async (url, init = {}) => {
    const { pathname } = new URL(url);
    fetch.calls.push({ path: pathname, headers: init.headers });
    if (cloud.failure === 'network') {
      throw new TypeError('fetch failed');
    }
    if (cloud.failure) {
      return json({ message: 'failure' }, cloud.failure);
    }
    if (init.headers?.['x-api-key'] !== cloud.key) {
      return json({ message: 'Forbidden' }, 403);
    }
    if (pathname === '/v1/pools') {
      return json(cloud.pools);
    }
    return json({ message: 'Missing Authentication Token' }, 403);
  };
  fetch.calls = [];
  fetch.state = cloud;
  return fetch;
}

// The SDK external ids, without a client (selector `iopool`).
export const fakeGladys = {
  externalIds: (type, id) => {
    const device = `ext:iopool:${type}:${id}`;
    return { device, feature: (key) => `${device}:${key}` };
  },
};

export const silent = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
