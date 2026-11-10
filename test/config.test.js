import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeConfig, hasApiKey, readLanguage, POLL_INTERVAL } from '../src/config.js';

test('defaults, bounds and the pasted key cleaned', () => {
  assert.deepEqual(normalizeConfig(), {
    apiKey: '',
    pollInterval: POLL_INTERVAL.default,
    language: 'auto',
  });
  const config = normalizeConfig({ api_key: ' abc\n123 ', poll_interval: '2', language: 'de' });
  assert.equal(config.apiKey, 'abc123', 'spaces and line breaks of a paste are removed');
  assert.equal(config.pollInterval, POLL_INTERVAL.min);
  assert.equal(config.language, 'de');
  assert.equal(normalizeConfig({ poll_interval: 600 }).pollInterval, POLL_INTERVAL.max);
  assert.equal(normalizeConfig({ poll_interval: '' }).pollInterval, POLL_INTERVAL.default);
  assert.equal(normalizeConfig({ language: 'it' }).language, 'auto');
  assert.equal(normalizeConfig({ api_key: 42 }).apiKey, '');
  assert.equal(normalizeConfig(null).apiKey, '');
});

test('the API key and the stored language', () => {
  assert.ok(hasApiKey(normalizeConfig({ api_key: 'x' })));
  assert.ok(!hasApiKey(normalizeConfig({ api_key: '  ' })));
  assert.equal(readLanguage({ last_language: 'es' }, 'en'), 'es');
  assert.equal(readLanguage({ last_language: 'español' }, 'en'), 'en');
  assert.equal(readLanguage(undefined, 'fr'), 'fr');
});
