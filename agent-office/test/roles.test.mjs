import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter, loadRoles, toolsFor, modelFor } from '../src/roles.mjs';
import { loadConfig } from '../src/config.mjs';
import { buildTools } from '../src/tools.mjs';
import { Store } from '../src/store.mjs';

test('parseFrontmatter reads scalars and lists', () => {
	const { meta, body } = parseFrontmatter('---\nname: x\ntools: [a, b]\n---\nCharter text');
	assert.equal(meta.name, 'x');
	assert.deepEqual(meta.tools, ['a', 'b']);
	assert.equal(body, 'Charter text');
});

test('parseFrontmatter tolerates a file with no frontmatter', () => {
	const { meta, body } = parseFrontmatter('just a charter');
	assert.deepEqual(meta, {});
	assert.equal(body, 'just a charter');
});

test('every shipped role loads and grants only real tools', () => {
	const config = loadConfig();
	const roles = loadRoles(config.paths.roles);
	assert.ok(roles.length >= 8, 'the office should have a full bench');

	const store = new Store(config, 'test-roles');
	const allTools = buildTools({
		config,
		store,
		item: { id: 't', role: 't' },
		run: { drafts: [], tasks: [], escalations: [], reviews: [], roleNames: [], enqueue: () => null },
	});
	for (const role of roles) {
		assert.doesNotThrow(() => toolsFor(role, allTools), `${role.name} grants a tool that does not exist`);
		assert.ok(role.body.length > 200, `${role.name} charter is too thin to steer a model`);
		assert.ok(modelFor(role, config), `${role.name} resolves no model`);
	}
});

test('only the quotation desk may state a price, and only the reviewer may review', () => {
	const roles = loadRoles(loadConfig().paths.roles);
	const byName = Object.fromEntries(roles.map((r) => [r.name, r]));
	assert.ok(byName.quotation.tools.includes('pricebook_lookup'));
	assert.ok(!byName['outreach-writer'].tools.includes('pricebook_lookup'), 'the writer must not source its own figures');
	assert.deepEqual(
		roles.filter((r) => r.tools.includes('record_review')).map((r) => r.name),
		['reviewer'],
	);
});

test('duplicate role names are rejected', () => {
	const dir = mkdtempSync(join(tmpdir(), 'roles-'));
	writeFileSync(join(dir, 'a.md'), '---\nname: dup\ntitle: A\n---\nbody a');
	writeFileSync(join(dir, 'b.md'), '---\nname: dup\ntitle: B\n---\nbody b');
	assert.throws(() => loadRoles(dir), /Duplicate role name/);
});

test('a role with an empty charter is rejected', () => {
	const dir = mkdtempSync(join(tmpdir(), 'roles-'));
	writeFileSync(join(dir, 'a.md'), '---\nname: hollow\ntitle: A\n---\n');
	assert.throws(() => loadRoles(dir), /empty charter/);
});
