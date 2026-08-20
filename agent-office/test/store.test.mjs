import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, matches, daysUntil } from '../src/store.mjs';
import { loadConfig } from '../src/config.mjs';

function store(name = 'test-store') {
	process.env.OFFICE_OUT_DIR = mkdtempSync(join(tmpdir(), 'office-out-'));
	return new Store(loadConfig(), name);
}

test('reads only real collections, and refuses a traversal', () => {
	const s = store();
	assert.ok(s.read('leads').length > 0);
	assert.throws(() => s.read('../../etc/passwd'), /Invalid collection/);
	assert.throws(() => s.read('nope'), /No such collection/);
});

test('a single-object collection is normalised to an array', () => {
	assert.equal(store().read('company').length, 1);
});

test('matches does contains-matching, including dot paths', () => {
	const row = { id: 'a', city: 'Pune', contact: { role: 'QC Head' } };
	assert.equal(matches(row, { city: 'pune' }), true);
	assert.equal(matches(row, { 'contact.role': 'qc' }), true);
	assert.equal(matches(row, { city: 'Nashik' }), false);
	assert.equal(matches(row, {}), true);
	assert.equal(matches(row, { missing: 'x' }), false);
});

test('daysUntil is signed and tolerates rubbish', () => {
	const now = new Date('2026-08-20T00:00:00Z');
	assert.equal(daysUntil('2026-08-30T00:00:00Z', now), 10);
	assert.equal(daysUntil('2026-08-10T00:00:00Z', now), -10);
	assert.equal(daysUntil('not-a-date', now), null);
});

test('artifacts round-trip and review verdicts are stamped onto them', () => {
	const s = store();
	const file = s.writeArtifact('email', 'AMC renewal - Suvira', '- status: draft (unreviewed)\n\nbody text');
	assert.match(s.readArtifact(file), /body text/);

	s.annotateArtifact(file, 'revise', ['Line 3 price is not in the pricebook']);
	const after = readFileSync(file, 'utf8');
	assert.match(after, /- status: reviewed - revise/);
	assert.match(after, /Line 3 price is not in the pricebook/);
});

test('a draft outside the drafts directory cannot be read or annotated', () => {
	const s = store();
	assert.throws(() => s.readArtifact('/etc/passwd'), /No such draft|escapes/);
});

test('the ledger is append-only JSONL and reads back', () => {
	const s = store();
	s.ledger({ type: 'a' });
	s.ledger({ type: 'b' });
	const rows = s.readLedger();
	assert.deepEqual(rows.map((r) => r.type), ['a', 'b']);
	assert.ok(rows[0].ts && rows[0].runId);
});
