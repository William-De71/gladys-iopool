// -----------------------------------------------------------------------------
// Client of the iopool public API (https://api.iopool.com/v1).
//
// The official API iopool documents for its users
// (https://help.iopool.com/en/articles/5537423-iopool-public-api): a personal
// API key, shown at the bottom of the Settings page of the iopool app, sent in
// the `x-api-key` header. It is read-only:
//   GET /v1/pools      every pool of the account, with its latest measure
//                      (temperature, pH, ORP), its mode, whether an action is
//                      required and the recommended filtration duration
//   GET /v1/pool/:id   one pool (not used: the list costs the same request)
//
// The API sits behind AWS API Gateway: a missing or wrong key is a 403
// `{"message":"Forbidden"}`, too many requests a 429.
//
// Every failure becomes an IopoolError with a `kind` the app turns into a
// user message: auth, rate_limit, unreachable, unexpected. The API key never
// appears in an error message.
// -----------------------------------------------------------------------------

const BASE_URL = 'https://api.iopool.com/v1';
const TIMEOUT_MS = 20000;

class IopoolError extends Error {
  /**
   * @description An error of the iopool API.
   * @param {string} kind - auth, rate_limit, unreachable or unexpected.
   * @param {string} message - What failed (never a secret).
   * @param {number} [status] - The HTTP status, when there was an answer.
   */
  constructor(kind, message, status) {
    super(message);
    this.name = 'IopoolError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * @description The error kind of an HTTP status.
 * @param {number} status - The status.
 * @returns {string} The kind.
 * @example
 * kindOfStatus(403); // -> 'auth'
 */
function kindOfStatus(status) {
  if (status === 401 || status === 403) {
    return 'auth';
  }
  if (status === 429) {
    return 'rate_limit';
  }
  return status >= 500 ? 'unreachable' : 'unexpected';
}

/**
 * @description Create an iopool API client.
 * @param {object} options - Options.
 * @param {Function} options.getApiKey - `() => string`: the API key.
 * @param {Function} [options.fetch] - fetch implementation (tests).
 * @param {string} [options.userAgent] - User-Agent header.
 * @param {string} [options.baseUrl] - API root (tests).
 * @returns {{ listPools: Function }} The client.
 * @example
 * const iopool = createIopoolClient({ getApiKey: () => key });
 * const pools = await iopool.listPools();
 */
function createIopoolClient({
  getApiKey,
  fetch = globalThis.fetch,
  userAgent = 'gladys-iopool',
  baseUrl = BASE_URL,
}) {
  /**
   * @description Every pool of the account, as the API sends them.
   * @returns {Promise<Array<object>>} The raw pools.
   */
  async function listPools() {
    const key = getApiKey() ?? '';
    if (!key) {
      throw new IopoolError('auth', 'No iopool API key is configured');
    }
    let response;
    try {
      response = await fetch(`${baseUrl}/pools`, {
        headers: { 'x-api-key': key, Accept: 'application/json', 'User-Agent': userAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new IopoolError(
        'unreachable',
        `iopool pools: ${err.name === 'TimeoutError' ? 'timeout' : err.message}`,
      );
    }
    if (!response.ok) {
      throw new IopoolError(
        kindOfStatus(response.status),
        `iopool pools: HTTP ${response.status}`,
        response.status,
      );
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new IopoolError('unexpected', 'iopool pools: the answer is not JSON', response.status);
    }
    if (!Array.isArray(body)) {
      throw new IopoolError(
        'unexpected',
        'iopool pools: the answer is not a list',
        response.status,
      );
    }
    return body;
  }

  return { listPools };
}

export { BASE_URL, IopoolError, kindOfStatus, createIopoolClient };
