#!/usr/bin/env node
/**
 * Manual generation from the command line.
 *
 *   node scripts/generate.mjs                       # next item by rotation
 *   node scripts/generate.mjs --product 1 --template 3 --format story
 *   node scripts/generate.mjs --all-templates --product 1
 */
import { bootstrap } from '../src/bootstrap.js';
import { closeDatabase } from '../src/db/database.js';
import { products, templates } from '../src/db/repositories.js';
import { generate, generateNext } from '../src/engine/generator.js';
import { closeChromium, detectBackends } from '../src/render/renderer.js';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

await bootstrap({ quiet: true });
const { backends } = await detectBackends();
console.log('Render backends:', backends.map((b) => b.name).join(' → '));

try {
  if (has('all-templates')) {
    const productId = Number(flag('product'));
    const product = products.find(productId);
    if (!product) throw new Error('Pass a valid --product <id>');
    for (const template of templates.list({ activeOnly: true })) {
      const t0 = Date.now();
      try {
        const out = await generate({ productId, templateId: template.id, origin: 'manual' });
        console.log(`✓ ${template.slug.padEnd(28)} ${String(Date.now() - t0).padStart(5)}ms  ${out.content.file_name}`);
      } catch (err) {
        console.log(`✗ ${template.slug.padEnd(28)} ${err.message}`);
      }
    }
  } else if (flag('product') && flag('template')) {
    const out = await generate({
      productId: Number(flag('product')),
      templateId: Number(flag('template')),
      formatPreset: flag('format'),
      outputFormat: flag('output'),
      origin: 'manual',
    });
    console.log('Generated:', out.content.file_name, `(${out.backend}, ${out.content.file_size} bytes)`);
  } else {
    const out = await generateNext({ origin: 'manual' });
    if (!out) console.log('No eligible product/template combination was found.');
    else console.log('Generated:', out.content.file_name);
  }
} finally {
  await closeChromium();
  closeDatabase();
}
