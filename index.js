// -----------------------------------------------------------------------------
// Entry point of the iopool external integration.
//
// Brings the pools of an iopool account into Gladys:
//   - a device per pool (water temperature, pH, redox, recommended
//     filtration, action required, pool mode), offered on the Discovery
//     screen (see src/device.js);
//   - scene triggers: new measure, action required, pool mode changed,
//     filtration advice changed, measures stopped;
//   - a scene action: read a pool;
//   - a dashboard widget: the pool water at a glance.
//
// iopool has no local API: the integration reads the official iopool public
// API on its own timer, with the API key of the iopool app.
//
// This file only wires the SDK client: the handlers are in src/app.js.
//
// Environment variables provided by the Gladys supervisor:
//   GLADYS_HOST_API_URL / GLADYS_INTEGRATION_TOKEN / GLADYS_INTEGRATION_SELECTOR
// The SDK reads them automatically: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const gladys = new GladysIntegration();
createApp(gladys);

// --- Startup -----------------------------------------------------------------------
logger.info(`Starting the iopool integration ${version}...`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
