import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from './store.mjs';
import { WorkQueue } from './queue.mjs';
import { loadRoles } from './roles.mjs';
import { createClient } from './llm.mjs';
import { runAgent } from './worker.mjs';
import { renderRunReport } from './report.mjs';
import { log } from './log.mjs';

/** Company facts every clone is briefed with, so no role has to guess who it works for. */
export function buildCharter(cfg, store) {
	const company = store.read('company')[0];
	return [
		'## The firm',
		'',
		`${company.name} - ${company.tagline}`,
		`Territory: ${company.territory.join(', ')}.`,
		`Lines: ${company.lines.join('; ')}.`,
		`Brands serviced: ${company.brands.join(', ')}.`,
		`Customers: ${company.customer_segments.join(', ')}.`,
		'',
		'## Voice',
		'',
		company.voice,
		'',
		'## Standing policy',
		'',
		`- Quotes above INR ${cfg.policy.quoteApprovalThresholdInr?.toLocaleString('en-IN')} need a human sign-off - escalate, do not send.`,
		`- Discount ceiling without approval: ${cfg.policy.discountCeilingPct}%.`,
		`- AMC renewal outreach starts ${cfg.policy.amcRenewalLookaheadDays} days before expiry.`,
		`- Service SLA response: critical ${cfg.policy.serviceSlaHours?.critical}h, high ${cfg.policy.serviceSlaHours?.high}h, normal ${cfg.policy.serviceSlaHours?.normal}h.`,
		'- Qualification (IQ/OQ/PQ) claims must match the customer\'s regulatory regime; never assert a compliance outcome we cannot evidence.',
		cfg.dryRun ? '- DRY RUN: every output is a draft on disk. Nothing reaches a customer.' : '',
	]
		.filter(Boolean)
		.join('\n');
}

/** Read a named shift (a preset list of seed work items) from data/shifts.json. */
export function loadShift(cfg, name) {
	const file = join(cfg.paths.data, 'shifts.json');
	if (!existsSync(file)) throw new Error('data/shifts.json is missing');
	const shifts = JSON.parse(readFileSync(file, 'utf8'));
	const shift = shifts[name];
	if (!shift) throw new Error(`Unknown shift "${name}". Available: ${Object.keys(shifts).join(', ')}`);
	return shift;
}

/**
 * Run the office until the queue drains or the budget is spent.
 * @param {{config:any, goal?:string, shift?:string, only?:string[]}} opts
 */
export async function runOffice({ config, goal, shift, only }) {
	const runId = `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}-${randomUUID().slice(0, 6)}`;
	const store = new Store(config, runId);
	const roles = loadRoles(config.paths.roles);
	const byName = new Map(roles.map((r) => [r.name, r]));
	const client = createClient(config.provider);
	const charter = buildCharter(config, store);
	const queue = new WorkQueue(config.limits.maxWorkItems);

	const run = {
		runId,
		roleNames: roles.map((r) => r.name),
		drafts: [],
		tasks: [],
		escalations: [],
		reviews: [],
		results: [],
		usage: { input: 0, output: 0 },
		enqueue: (item) => queue.push(item),
	};

	store.ledger({ type: 'run_start', goal, shift, provider: config.provider, dryRun: config.dryRun, roles: run.roleNames });

	// Seed the queue: an explicit shift, or a goal handed to the chief of staff to break down.
	if (shift) {
		const preset = loadShift(config, shift);
		for (const seed of preset.items) queue.push({ ...seed, createdBy: 'shift:' + shift });
		log.info(`Shift "${shift}" seeded ${preset.items.length} work item(s): ${preset.description}`);
	} else {
		queue.push({
			role: 'chief-of-staff',
			task: goal ?? 'Run the daily desk: decide what the office should work on today and delegate it.',
			priority: 'high',
			createdBy: 'desk',
		});
	}

	const concurrency = Math.max(1, Number(config.limits.concurrency) || 1);
	let processed = 0;

	while (queue.size > 0) {
		const batch = queue.take(concurrency).filter((item) => {
			if (only?.length && !only.includes(item.role)) {
				log.info(`skipped ${item.id} (${item.role}) - filtered out by --only`);
				return false;
			}
			return true;
		});
		if (!batch.length) continue;

		await Promise.all(
			batch.map(async (item) => {
				const role = byName.get(item.role);
				if (!role) {
					log.err(`${item.id}: no such role "${item.role}"`);
					store.ledger({ type: 'item_unroutable', itemId: item.id, role: item.role });
					return;
				}
				log.step(role.name, `${item.id} ${item.task.slice(0, 78)}`);
				const result = await runAgent({ role, item, ctx: { config, store, client, charter, run } });
				processed++;
				run.usage.input += result.usage.input;
				run.usage.output += result.usage.output;
				run.results.push({ item, role: role.name, ...result });

				if (result.error) log.err(`${role.name} ${item.id}: ${result.error}`);
				else log.ok(`${role.name} ${item.id}: ${String(result.envelope?.summary ?? '').slice(0, 90)}`);

				// Anything a clone drafts goes to the reviewer before it can reach the human inbox.
				// Match on itemId, not array position - clones run concurrently and share run.drafts.
				if (role.name !== 'reviewer') {
					for (const draft of run.drafts.filter((d) => d.itemId === item.id)) {
						queue.push({
							role: 'reviewer',
							task: `Review the ${draft.kind} draft "${draft.title}" written by ${draft.author}.`,
							context: `File: ${draft.file}`,
							payload: { file: draft.file, kind: draft.kind },
							priority: 'high',
							depth: (item.depth ?? 0) + 1,
							parentId: item.id,
							createdBy: 'review-gate',
						});
					}
				}
			}),
		);
	}

	store.ledger({ type: 'run_end', processed, drafts: run.drafts.length, escalations: run.escalations.length, usage: run.usage });
	const report = renderRunReport({ config, run, processed, goal, shift, queue });
	const reportFile = store.writeSummary('report.md', report);
	return { runId, run, processed, reportFile, runDir: store.runDir, budgetSpent: queue.spent };
}
