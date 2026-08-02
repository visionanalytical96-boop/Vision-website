/**
 * Extracts the content arrays out of standalone/BharatStay.html and writes them
 * as JSON into src/content/. The HTML file stays the human-friendly source the
 * user already knows how to edit; the JSON is what seeds the database.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'standalone/BharatStay.html'), 'utf8');

/** Grab `const NAME = ...;` up to the line that starts the next top-level const. */
function block(name, endMarker) {
  const start = html.search(new RegExp(`^const ${name}\\s*=`, 'm'));
  if (start < 0) throw new Error(`missing const ${name}`);
  const end = html.indexOf(endMarker, start);
  if (end < 0) throw new Error(`missing end marker ${endMarker} after ${name}`);
  return html.slice(start, end);
}

const source = [
  block('COORDS', 'const ADMIN_LOGIN'),
  block('DESTS', 'const AMEN_POOL'),
  block('AMEN_POOL', 'const HSEEDS'),
  block('HSEEDS', 'const HOTELS'),
  block('HOTELS', 'const CABS'),
  block('CABS', 'const PKGS'),
  block('PKGS', 'const ACTS'),
  block('ACTS', 'const RESTAURANTS'),
  block('RESTAURANTS', 'const REVIEWS'),
  block('REVIEWS', 'const ADMIN = {'),
  block('WK_SPOTS', 'function weekendView'),
].join('\n');

// `const` bindings stay lexical inside the vm, so hand them out explicitly.
const exportNames = ['COORDS', 'DESTS', 'HOTELS', 'RESTAURANTS', 'PKGS', 'ACTS', 'CABS', 'REVIEWS', 'WK_SPOTS', 'WK_LINE', 'WK_PLANS'];
const ctx = vm.createContext({});
vm.runInContext(`${source}\nglobalThis.__out = { ${exportNames.join(', ')} };`, ctx);
const data = ctx.__out;

const out = (file, data) => {
  const path = resolve(root, 'src/content', file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file.padEnd(20)} ${Array.isArray(data) ? data.length : Object.keys(data).length} entries`);
};

out('coords.json', data.COORDS);
out('destinations.json', data.DESTS);
out('stays.json', data.HOTELS);
out('restaurants.json', data.RESTAURANTS);
out('packages.json', data.PKGS);
out('activities.json', data.ACTS);
out('cabs.json', data.CABS);
out('reviews.json', data.REVIEWS.map((r, i) => ({
  id: 'rv' + i, name: r[0], city: r[1], stars: r[2], kind: r[3], text: r[4], tone: r[5], emoji: r[6],
})));
out('weekend.json', { line: data.WK_LINE, spots: data.WK_SPOTS, plans: data.WK_PLANS });
