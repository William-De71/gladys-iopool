// Builds the widget contents of the illustrations with the integration's own
// code: node gen.mjs <repo> <out.json> (run by render.sh)
//
// Two "Pool water" cards on a made-up summer week (fixed date, seeded
// randomness): a balanced pool, and a pool whose redox fell while the pH
// drifted up, for which iopool asks for an action.
// The chart of a card reads the history Gladys keeps for the feature: here
// the history is made up, the content around it is the real one.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, out] = process.argv.slice(2);
const load = (path) => import(pathToFileURL(`${repo}/${path}`).href);
const { buildPoolWidget, readPoolSettings } = await load('src/widgets.js');
const { idsOf } = await load('src/device.js');
const { LANGUAGES, t } = await load('src/i18n.js');
const manifest = JSON.parse(readFileSync(`${repo}/gladys-assistant-integration.json`, 'utf8'));

// Tuesday 14 July 2026, 18:00 in Paris.
const NOW = Date.parse('2026-07-14T16:00:00Z');
const HOUR = 3600000;
const gladys = {
  externalIds: (type, id) => {
    const device = `ext:iopool:${type}:${id}`;
    return { device, feature: (key) => `${device}:${key}` };
  },
};

// mulberry32: the same "random" history on every run.
function random(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// One point an hour over the last 7 days.
function history(seed, value) {
  const next = random(seed);
  const points = [];
  for (let h = 7 * 24; h >= 0; h -= 1) {
    const at = NOW - h * HOUR;
    points.push({ t: new Date(at).toISOString(), v: Math.round(value(at, next) * 100) / 100 });
  }
  return points;
}
// Water warms in the afternoon (peak around 17:00 in Paris, 15:00 UTC).
const daily = (at) => Math.sin(((new Date(at).getUTCHours() - 9) / 24) * 2 * Math.PI);

const CARDS = {
  balanced: {
    pool: {
      id: '1aaa22b3-ccc4-4567-d888-e999ff000000',
      title: 'Garden',
      mode: 'STANDARD',
      actionRequired: false,
      filtrationHours: 6.5,
      stale: false,
      measure: {
        measuredAt: NOW - 42 * 60000,
        temperature: 27.3,
        ph: 7.24,
        orp: 712,
        mode: 'standard',
        isValid: true,
      },
    },
    settings: { chart: 'temperature', interval: 'last-week' },
    feature: 'featureTemperature',
    history: history(
      7,
      (at, next) => 26 + 1.2 * daily(at) + ((at - NOW) / (7 * 24 * HOUR)) * -1.5 + next() * 0.2,
    ),
  },
  alert: {
    pool: {
      id: '2bbb33c4-ddd5-4678-e999-f000aa111111',
      title: 'Terrace',
      mode: 'STANDARD',
      actionRequired: true,
      filtrationHours: 8,
      stale: false,
      measure: {
        measuredAt: NOW - 2 * HOUR,
        temperature: 29.1,
        ph: 7.81,
        orp: 541,
        mode: 'live',
        isValid: true,
      },
    },
    settings: { chart: 'orp', interval: 'last-week' },
    feature: 'featureOrp',
    history: history(
      11,
      (at, next) => 700 - 160 * (1 - (NOW - at) / (7 * 24 * HOUR)) + next() * 15,
    ),
  },
};

const contents = {};
for (const language of LANGUAGES) {
  contents[language] = {};
  for (const [name, card] of Object.entries(CARDS)) {
    const content = buildPoolWidget({
      pool: card.pool,
      language,
      now: NOW,
      pollMinutes: 10,
      settings: readPoolSettings(card.settings),
      featureId: idsOf(gladys, card.pool.id).feature,
    });
    // The front reads the history of a device-bound chart from Gladys, and
    // names the series after the feature.
    content.components = content.components.map((component) =>
      component.type === 'chart'
        ? { ...component, series: [{ name: t(card.feature, language), points: card.history }] }
        : component,
    );
    contents[language][name] = content;
  }
}
const widget = manifest.widgets.find((w) => w.key === 'pool');
writeFileSync(
  out,
  JSON.stringify({ now: NOW, card: { icon: widget.icon, label: widget.label }, contents }),
);
