// -----------------------------------------------------------------------------
// Configuration of the iopool integration.
//
// Fields of the config_schema:
//   - `api_key`        the personal API key of the iopool app (a `secret`:
//                      never sent back to the UI, never logged);
//   - `poll_interval`  how often the iopool API is read, in minutes;
//   - `language`       language of the texts Gladys does not ask for in a
//                      language (feature names, pool modes, scene
//                      summaries): `auto` follows the language of the last
//                      widget request.
//
// Internal key, outside the config_schema (never shown in the UI):
//   - `last_language`  language of the last widget request, kept for the
//                      texts after a restart.
// -----------------------------------------------------------------------------

import { isLanguage } from './i18n.js';

// The iopool EcO probe sends a measure about once an hour (more often in live
// mode): reading every 10 minutes catches it soon, at 144 requests a day.
const POLL_INTERVAL = { min: 5, max: 60, default: 10 };
const AUTO_LANGUAGE = 'auto';
const INTERNAL_KEYS = { language: 'last_language' };

/**
 * @description Read a bounded number field, falling back to its default.
 * @param {unknown} raw - The raw value (the form can send numbers as strings).
 * @param {{ min: number, max: number, default: number }} bounds - The bounds.
 * @returns {number} The value.
 * @example
 * readNumber('30', POLL_INTERVAL); // -> 30
 */
function readNumber(raw, bounds) {
  const value = Number(raw ?? bounds.default);
  if (raw === '' || !Number.isFinite(value)) {
    return bounds.default;
  }
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

/**
 * @description Normalize the raw config object from the host API.
 * @param {object} [rawConfig] - The raw config values.
 * @returns {{ apiKey: string, pollInterval: number, language: string }}
 * The config (poll interval in minutes, language 'auto' or a language code).
 * @example
 * normalizeConfig({ api_key: ' abc ' }); // -> { apiKey: 'abc', pollInterval: 10, language: 'auto' }
 */
function normalizeConfig(rawConfig = {}) {
  const config = rawConfig ?? {};
  return {
    // A pasted key often carries a space or a line break: never part of a key.
    apiKey: typeof config.api_key === 'string' ? config.api_key.replace(/\s+/g, '') : '',
    pollInterval: readNumber(config.poll_interval, POLL_INTERVAL),
    language: isLanguage(config.language) ? config.language : AUTO_LANGUAGE,
  };
}

/**
 * @description Whether the account can be read.
 * @param {object} config - A normalized config.
 * @returns {boolean} True with an API key.
 */
const hasApiKey = (config) => Boolean(config.apiKey);

/**
 * @description Read the stored language of the last request.
 * @param {object} [rawConfig] - The raw config values.
 * @param {string} fallback - The language to keep when nothing valid is stored.
 * @returns {string} The language.
 * @example
 * readLanguage({ last_language: 'fr' }, 'en'); // -> 'fr'
 */
function readLanguage(rawConfig, fallback) {
  const language = (rawConfig ?? {})[INTERNAL_KEYS.language];
  return typeof language === 'string' && /^[a-z]{2}$/.test(language) ? language : fallback;
}

export { POLL_INTERVAL, AUTO_LANGUAGE, INTERNAL_KEYS, normalizeConfig, hasApiKey, readLanguage };
