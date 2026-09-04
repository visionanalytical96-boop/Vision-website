#!/usr/bin/env node
/**
 * Validate our hire manifests against Munder Difflin's own validator, rather than a
 * hand-copied schema - a manifest that passes here is one the app will actually accept.
 *
 *   git clone --depth 1 https://github.com/chaitanyagiri/munder-difflin /tmp/munder-difflin
 *   node --experimental-strip-types validate-hires.mjs
 *   MD_REPO=/path/to/munder-difflin node --experimental-strip-types validate-hires.mjs
 *
 * The flag lets Node 22 read the upstream .ts source directly, so nothing needs building.
 * Exits non-zero if any manifest would be rejected by the app.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));

// Upstream is bundled by electron-vite, so its internal imports carry no extension.
// Node's resolver needs one; add it for relative specifiers that resolve to a .ts file.
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith('.') && !/\.[mc]?[jt]s$/.test(specifier)) {
			try {
				return nextResolve(`${specifier}.ts`, context);
			} catch {
				// fall through to the original specifier
			}
		}
		return nextResolve(specifier, context);
	},
});

const CANDIDATES = [
	process.env.MD_REPO,
	join(HERE, '../../..', 'munder-difflin'),
	'/opt/munder-difflin',
	`${process.env.HOME ?? ''}/munder-difflin`,
	`${process.env.HOME ?? ''}/chaitanyagiri/munder-difflin`,
	'/tmp/munder-difflin',
].filter(Boolean);

const repo = CANDIDATES.map((p) => resolve(p)).find((p) => existsSync(join(p, 'src/shared/hire.ts')));
if (!repo) {
	console.error('Could not find a munder-difflin checkout. Clone it, or set MD_REPO:\n');
	console.error('  git clone --depth 1 https://github.com/chaitanyagiri/munder-difflin /tmp/munder-difflin');
	console.error('  MD_REPO=/tmp/munder-difflin node validate-hires.mjs\n');
	console.error('Looked in:');
	for (const p of CANDIDATES) console.error(`  ${resolve(p)}`);
	process.exit(2);
}

const { validateHireManifest } = await import(pathToFileURL(join(repo, 'src/shared/hire.ts')).href);
console.log(`validator: ${join(repo, 'src/shared/hire.ts')}\n`);

let bad = 0;
const files = readdirSync(HERE).filter((f) => f.endsWith('.hire.json')).sort();
for (const file of files) {
	const result = validateHireManifest(JSON.parse(readFileSync(join(HERE, file), 'utf8')));
	console.log(`${result.ok ? 'VALID  ' : 'INVALID'} ${file}${result.ok ? '' : ' -> ' + result.errors.join('; ')}`);
	if (!result.ok) bad++;
}

console.log(bad ? `\n${bad} of ${files.length} INVALID` : `\nAll ${files.length} manifests validate against the shipped munder-difflin validator.`);
process.exit(bad ? 1 : 0);
