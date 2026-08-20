import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnvelope, runAgent } from '../src/worker.mjs';
import { loadConfig } from '../src/config.mjs';
import { Store } from '../src/store.mjs';

function ctx(client, overrides = {}) {
	process.env.OFFICE_OUT_DIR = mkdtempSync(join(tmpdir(), 'office-out-'));
	const config = loadConfig({ limits: { maxStepsPerAgent: 3, maxTokensPerAgent: 100 }, ...overrides });
	const store = new Store(config, 'test-worker');
	const run = {
		drafts: [],
		tasks: [],
		escalations: [],
		reviews: [],
		roleNames: ['quotation', 'reviewer'],
		enqueue: () => ({ id: 'wi_099' }),
	};
	return { config, store, client, charter: 'test charter', run };
}

const role = {
	name: 'quotation',
	title: 'Quotation Desk',
	tier: 'worker',
	tools: ['pricebook_lookup', 'save_draft'],
	body: 'Quote from the pricebook only.',
};
const item = { id: 'wi_001', role: 'quotation', task: 'Quote a gold AMC.' };

test('parseEnvelope reads a fenced block, bare JSON, and falls back to prose', () => {
	assert.equal(parseEnvelope('```json\n{"summary":"a"}\n```').summary, 'a');
	assert.equal(parseEnvelope('{"summary":"b"}').summary, 'b');
	assert.equal(parseEnvelope('here you go:\n{"summary":"c"}\nthanks').summary, 'c');
	const prose = parseEnvelope('no json at all');
	assert.equal(prose.unstructured, true);
	assert.equal(prose.summary, 'no json at all');
});

test('runAgent executes a tool then returns the envelope', async () => {
	const calls = [];
	const client = async (input) => {
		calls.push(input);
		if (calls.length === 1) {
			return {
				stopReason: 'tool_use',
				blocks: [{ type: 'tool_use', id: 'tu_1', name: 'pricebook_lookup', input: { query: 'gold AMC' } }],
				text: '',
				toolUses: [{ id: 'tu_1', name: 'pricebook_lookup', input: { query: 'gold AMC' } }],
				usage: { input: 10, output: 5 },
			};
		}
		return {
			stopReason: 'end_turn',
			blocks: [],
			text: '```json\n{"summary":"done","confidence":"high"}\n```',
			toolUses: [],
			usage: { input: 3, output: 2 },
		};
	};

	const result = await runAgent({ role, item, ctx: ctx(client) });
	assert.equal(result.ok, true);
	assert.equal(result.envelope.summary, 'done');
	assert.equal(result.steps, 2);
	assert.equal(result.usage.input, 13);
	// The tool result must be fed back as a user turn, or the model is answering blind.
	const secondTurn = calls[1].messages.at(-1);
	assert.equal(secondTurn.role, 'user');
	assert.equal(secondTurn.content[0].type, 'tool_result');
	assert.match(secondTurn.content[0].content, /AMC-GOLD-HPLC/);
});

test('a clone cannot call a tool its role was not granted', async () => {
	const seen = [];
	const client = async (input) => {
		seen.push(input.tools.map((t) => t.name));
		return {
			stopReason: 'end_turn',
			blocks: [],
			text: '{"summary":"ok"}',
			toolUses: [],
			usage: { input: 0, output: 0 },
		};
	};
	await runAgent({ role, item, ctx: ctx(client) });
	assert.deepEqual(seen[0], ['pricebook_lookup', 'save_draft']);
	assert.ok(!seen[0].includes('record_review'), 'a worker must not hold the review gate');
});

test('a tool error comes back as a tool_result instead of killing the run', async () => {
	let turn = 0;
	const client = async () => {
		turn++;
		if (turn === 1) {
			return {
				stopReason: 'tool_use',
				blocks: [{ type: 'tool_use', id: 'tu_1', name: 'pricebook_lookup', input: {} }],
				text: '',
				toolUses: [{ id: 'tu_1', name: 'pricebook_lookup', input: {} }],
				usage: { input: 0, output: 0 },
			};
		}
		return { stopReason: 'end_turn', blocks: [], text: '{"summary":"recovered"}', toolUses: [], usage: { input: 0, output: 0 } };
	};
	const result = await runAgent({ role, item, ctx: ctx(client) });
	assert.equal(result.ok, true);
	assert.equal(result.envelope.summary, 'recovered');
});

test('the step budget stops a clone that never stops calling tools', async () => {
	const client = async () => ({
		stopReason: 'tool_use',
		blocks: [{ type: 'tool_use', id: 'tu', name: 'pricebook_lookup', input: { query: 'x' } }],
		text: '',
		toolUses: [{ id: 'tu', name: 'pricebook_lookup', input: { query: 'x' } }],
		usage: { input: 1, output: 1 },
	});
	const result = await runAgent({ role, item, ctx: ctx(client) });
	assert.equal(result.ok, false);
	assert.equal(result.error, 'step-budget-exhausted');
	assert.equal(result.steps, 3);
});

test('an API failure is reported, not thrown', async () => {
	const client = async () => {
		throw new Error('Anthropic 401: bad key');
	};
	const result = await runAgent({ role, item, ctx: ctx(client) });
	assert.equal(result.ok, false);
	assert.match(result.error, /401/);
});
