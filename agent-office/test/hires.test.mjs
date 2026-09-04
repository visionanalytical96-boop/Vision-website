import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncHires, charterToGoal } from '../src/sync-hires.mjs';
import { loadConfig } from '../src/config.mjs';
import { loadRoles } from '../src/roles.mjs';

const SCHEMA = JSON.parse(readFileSync(join(loadConfig().paths.root, 'hires', 'hire.schema.json'), 'utf8'));

/** Focused validator for the fields this generator emits (no ajv in the harness). */
function violations(manifest) {
	const out = [];
	const props = SCHEMA.properties;
	for (const key of SCHEMA.required) if (manifest[key] === undefined) out.push(`missing required: ${key}`);
	for (const [key, value] of Object.entries(manifest)) {
		const spec = props[key];
		if (!spec) {
			out.push(`additional property not allowed: ${key}`);
			continue;
		}
		if (spec.const && value !== spec.const) out.push(`${key} must be "${spec.const}"`);
		if (spec.enum && !spec.enum.includes(value)) out.push(`${key} "${value}" not in enum`);
		if (spec.maxLength && String(value).length > spec.maxLength) {
			out.push(`${key} is ${String(value).length} chars, max ${spec.maxLength}`);
		}
		if (spec.minLength && String(value).length < spec.minLength) out.push(`${key} shorter than ${spec.minLength}`);
		if (spec.pattern && !new RegExp(spec.pattern).test(String(value))) out.push(`${key} "${value}" fails pattern`);
		if (spec.maxItems && Array.isArray(value) && value.length > spec.maxItems) out.push(`${key} has too many items`);
		if (spec.type === 'array' && Array.isArray(value) && spec.items?.maxLength) {
			for (const item of value) {
				if (String(item).length > spec.items.maxLength) out.push(`${key} item "${item}" too long`);
			}
		}
	}
	return out;
}

test('every generated hire validates against the published hire@1 schema', () => {
	const outDir = mkdtempSync(join(tmpdir(), 'hires-'));
	const written = syncHires({ outDir });
	assert.equal(written.length, 10, 'the whole office should be importable');

	for (const { file } of written) {
		const manifest = JSON.parse(readFileSync(file, 'utf8'));
		assert.deepEqual(violations(manifest), [], `${file} violates the schema`);
	}
});

test('the model string is safe to put on a spawn command line', () => {
	const outDir = mkdtempSync(join(tmpdir(), 'hires-'));
	for (const { manifest } of syncHires({ outDir })) {
		assert.match(manifest.model, new RegExp(SCHEMA.properties.model.pattern));
		assert.ok(!/[;&|`$<>]/.test(manifest.model), 'shell metacharacters must never reach the command line');
	}
});

test('the hard rules survive even when a charter is too long to fit', () => {
	const company = { name: 'Test Co', tagline: 'test', territory: ['Nowhere'] };
	const role = { name: 'verbose', body: 'x\n'.repeat(5000) };
	const goal = charterToGoal(role, company);
	assert.ok(goal.length <= 4000, `goal is ${goal.length} chars`);
	assert.match(goal, /You draft, the human sends/);
	assert.match(goal, /Never invent a price/);
});

test('each desk keeps a routing tag the orchestrator can match on', () => {
	const outDir = mkdtempSync(join(tmpdir(), 'hires-'));
	const roleNames = loadRoles(loadConfig().paths.roles).map((r) => r.name);
	for (const { manifest } of syncHires({ outDir })) {
		assert.ok(roleNames.includes(manifest.capabilities[0]), `${manifest.name} lost its desk tag`);
	}
});

test('the shipped hires/ folder is in sync with the charters', () => {
	const dir = join(loadConfig().paths.root, 'hires');
	const outDir = mkdtempSync(join(tmpdir(), 'hires-'));
	for (const { file, manifest } of syncHires({ outDir })) {
		const shipped = join(dir, file.split('/').pop());
		assert.ok(existsSync(shipped), `${shipped} was never generated - run: node bin/office.mjs sync-hires`);
		assert.deepEqual(JSON.parse(readFileSync(shipped, 'utf8')), manifest, `${shipped} is stale`);
	}
	assert.ok(readdirSync(dir).includes('index.json'));
});
