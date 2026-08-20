import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildTools } from '../src/tools.mjs';
import { Store } from '../src/store.mjs';
import { loadConfig } from '../src/config.mjs';

function harness(item = { id: 'wi_001', role: 'amc-renewal', depth: 0 }) {
	process.env.OFFICE_OUT_DIR = mkdtempSync(join(tmpdir(), 'office-out-'));
	const config = loadConfig();
	const store = new Store(config, 'test-tools');
	const queued = [];
	const run = {
		drafts: [],
		tasks: [],
		escalations: [],
		reviews: [],
		roleNames: ['amc-renewal', 'outreach-writer', 'reviewer'],
		enqueue: (i) => {
			queued.push(i);
			return { id: `wi_${queued.length + 100}` };
		},
	};
	const tools = buildTools({ config, store, item, run });
	return { tools: Object.fromEntries(tools.map((t) => [t.name, t])), run, queued, store, config };
}

test('pricebook_lookup refuses to let a clone invent a price', async () => {
	const { tools } = harness();
	assert.match(await tools.pricebook_lookup.handler({ query: 'gold AMC' }), /AMC-GOLD-HPLC/);
	assert.match(await tools.pricebook_lookup.handler({ query: 'mass spectrometer teleporter' }), /Do not invent a price/);
});

test('expiring_contracts finds the window and sorts by urgency', async () => {
	const { tools } = harness();
	const out = JSON.parse(await tools.expiring_contracts.handler({ within_days: 90 }));
	assert.ok(out.total > 0);
	const days = out.items.map((c) => c.days_to_expiry);
	assert.deepEqual(days, [...days].sort((a, b) => a - b));
	assert.ok(days[0] < 0, 'the lapsed contract must surface first');
});

test('handoff routes only to real colleagues', async () => {
	const { tools, queued } = harness();
	assert.match(await tools.handoff.handler({ to_role: 'outreach-writer', task: 'write it' }), /Handed off/);
	assert.equal(queued[0].depth, 1);
	assert.match(await tools.handoff.handler({ to_role: 'legal-department', task: 'sue them' }), /No such colleague/);
	assert.equal(queued.length, 1);
});

test('handoff depth is capped so clones cannot delegate in circles', async () => {
	const { tools, queued } = harness({ id: 'wi_009', role: 'amc-renewal', depth: 3 });
	assert.match(await tools.handoff.handler({ to_role: 'outreach-writer', task: 'go' }), /depth limit/);
	assert.equal(queued.length, 0);
});

test('a saved draft is a file and is attributed to its work item', async () => {
	const { tools, run } = harness();
	const message = await tools.save_draft.handler({ kind: 'email', title: 'Renewal - Suvira', body: 'Text.' });
	assert.match(message, /queued for review/);
	assert.equal(run.drafts.length, 1);
	assert.equal(run.drafts[0].itemId, 'wi_001');
	assert.equal(run.drafts[0].author, 'amc-renewal');
});

test('escalations and tasks are recorded for the human desk', async () => {
	const { tools, run } = harness();
	await tools.escalate.handler({ reason: 'Multi-year AMC rate not in pricebook', severity: 'medium' });
	await tools.create_task.handler({ title: 'Call Dr. Kulkarni', owner: 'Service desk lead', due_in_days: 1 });
	assert.equal(run.escalations[0].severity, 'medium');
	assert.equal(run.tasks[0].owner, 'Service desk lead');
});

test('list_records filters and caps what a clone can pull into context', async () => {
	const { tools } = harness();
	const nashik = JSON.parse(await tools.list_records.handler({ collection: 'customers', filter: { city: 'Nashik' } }));
	assert.equal(nashik.total, 1);
	const capped = JSON.parse(await tools.list_records.handler({ collection: 'pricebook', limit: 2 }));
	assert.equal(capped.items.length, 2);
	assert.ok(capped.total > 2);
});

test('a verdict on a draft that does not exist is refused, not recorded', async () => {
	const { tools, run } = harness({ id: 'wi_002', role: 'reviewer', depth: 1 });
	await assert.rejects(
		async () => await tools.record_review.handler({ file: 'not-a-real-draft.md', verdict: 'approve' }),
		/No such draft/,
	);
	assert.equal(run.reviews.length, 0, 'a phantom approval must never reach the run record');
});
