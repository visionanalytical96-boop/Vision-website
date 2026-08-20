import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runOffice, buildCharter, loadShift } from '../src/orchestrator.mjs';
import { loadConfig } from '../src/config.mjs';
import { Store } from '../src/store.mjs';

function offlineConfig(overrides = {}) {
	process.env.OFFICE_OUT_DIR = mkdtempSync(join(tmpdir(), 'office-out-'));
	process.env.OFFICE_PROVIDER = 'stub';
	return loadConfig(overrides);
}

test('the charter briefs every clone on the firm and the standing policy', () => {
	const config = offlineConfig();
	const charter = buildCharter(config, new Store(config, 'test-charter'));
	assert.match(charter, /Vision Analytical/);
	assert.match(charter, /Maharashtra/);
	assert.match(charter, /15,00,000/, 'the approval threshold must be stated in INR formatting');
	assert.match(charter, /DRY RUN/);
});

test('a shift runs end to end and every draft passes the review gate exactly once', async () => {
	const config = offlineConfig();
	const result = await runOffice({ config, shift: 'daily' });

	assert.ok(result.processed >= 4, 'the daily shift seeds four desks');
	assert.ok(result.run.drafts.length > 0, 'a day of work should produce drafts');
	for (const draft of result.run.drafts) {
		const reviews = result.run.reviews.filter((r) => r.file === draft.file);
		assert.equal(reviews.length, 1, `${draft.title} was reviewed ${reviews.length} times, expected once`);
	}
	assert.ok(
		result.run.results.every((r) => r.role !== 'reviewer' || r.item.createdBy === 'review-gate'),
		'the reviewer is only ever woken by the gate',
	);
});

test('the run report and ledger are written for a human to audit', async () => {
	const config = offlineConfig();
	const result = await runOffice({ config, shift: 'service' });

	assert.ok(existsSync(result.reportFile));
	const report = readFileSync(result.reportFile, 'utf8');
	assert.match(report, /agent office run/);
	assert.match(report, /## Needs a human/);
	assert.match(report, /## Drafts awaiting send/);
	assert.match(report, /## Who did what/);

	const ledger = readFileSync(join(result.runDir, 'ledger.jsonl'), 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l));
	assert.equal(ledger[0].type, 'run_start');
	assert.equal(ledger.at(-1).type, 'run_end');
	assert.ok(ledger.some((e) => e.type === 'tool_call'), 'every tool call must be on the record');
	assert.ok(ledger.every((e) => e.ts && e.runId));
});

test('a goal is planned and delegated by the chief of staff', async () => {
	const config = offlineConfig({ limits: { maxWorkItems: 12 } });
	const result = await runOffice({ config, goal: 'Save the lapsed Nashik contract.' });

	assert.equal(result.run.results[0].role, 'chief-of-staff');
	assert.ok(result.processed > 1, 'the planner must delegate, not work alone');
	assert.ok(
		result.run.results.some((r) => r.item.createdBy === 'chief-of-staff'),
		'delegated work should be attributed to the planner',
	);
});

test('the work-item budget bounds a runaway office', async () => {
	const config = offlineConfig({ limits: { maxWorkItems: 3, concurrency: 1 } });
	const result = await runOffice({ config, shift: 'daily' });
	assert.ok(result.processed <= 3, `processed ${result.processed} items with a budget of 3`);
	assert.equal(result.budgetSpent, true);
});

test('--only keeps the run to the desks you asked for', async () => {
	const config = offlineConfig();
	const result = await runOffice({ config, shift: 'daily', only: ['amc-renewal'] });
	assert.ok(result.run.results.every((r) => r.role === 'amc-renewal'));
});

test('shifts are named presets and an unknown one fails loudly', () => {
	const config = offlineConfig();
	assert.ok(loadShift(config, 'daily').items.length >= 1);
	assert.throws(() => loadShift(config, 'nightshift'), /Unknown shift/);
});
