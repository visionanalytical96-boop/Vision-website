#!/usr/bin/env node
/**
 * Runs a single scheduler tick and exits — for driving the engine from system
 * cron or an n8n Schedule Trigger instead of the in-process ticker.
 *
 *   node scripts/run-scheduler.mjs
 */
import { bootstrap } from '../src/bootstrap.js';
import { closeDatabase } from '../src/db/database.js';
import { tick } from '../src/engine/scheduler.js';
import { closeChromium } from '../src/render/renderer.js';

await bootstrap({ quiet: true });
try {
  const results = await tick();
  console.log(`Generated : ${results.generated.length}`);
  console.log(`Published : ${results.published.length}`);
  console.log(`Due items : ${results.dueProcessed.length}`);
  if (results.errors.length) {
    console.error('Errors    :', results.errors.join(' | '));
    process.exitCode = 1;
  }
} finally {
  await closeChromium();
  closeDatabase();
}
