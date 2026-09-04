#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../src/config.mjs';
import { loadRoles, toolsFor } from '../src/roles.mjs';
import { runOffice, loadShift } from '../src/orchestrator.mjs';
import { buildTools } from '../src/tools.mjs';
import { Store } from '../src/store.mjs';
import { log } from '../src/log.mjs';

const USAGE = `
Vision Analytical - agent office

  office run [options]        Run the office until the queue drains
  office roles                List the clones and what each may touch
  office shifts               List the preset shifts
  office inbox                Show drafts waiting for a human, newest first
  office doctor               Check config, data, roles and provider readiness
  office sync-agents          Mirror the roles into .claude/agents/ as subagents
  office sync-hires           Generate Munder Difflin hire manifests into hires/

Run options
  --goal "<text>"     Hand a goal to the chief of staff, who plans and delegates
  --shift <name>      Run a preset shift instead (daily, renewals, service, newbiz)
  --only <a,b>        Only run these roles; other work items are skipped
  --concurrency <n>   Clones working at once (default from office.config.json)
  --budget <n>        Max work items for the whole run
  --live              Turn off dry-run. Drafts are still files; nothing is sent.

Environment
  ANTHROPIC_API_KEY   Required for real runs. Without it the office runs on the
                      offline stub provider, which exercises the full machinery
                      (tools, handoffs, review gate, ledger) with no model calls.
  OFFICE_PROVIDER     anthropic | stub
  OFFICE_OUT_DIR      Where runs and drafts are written (default agent-office/out)
`;

function parseArgs(argv) {
	const args = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token.startsWith('--')) {
			args._.push(token);
			continue;
		}
		const key = token.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) args[key] = true;
		else {
			args[key] = next;
			i++;
		}
	}
	return args;
}

async function cmdRun(args) {
	const overrides = {};
	if (args.concurrency) overrides.limits = { concurrency: Number(args.concurrency) };
	if (args.budget) overrides.limits = { ...(overrides.limits ?? {}), maxWorkItems: Number(args.budget) };
	if (args.live) overrides.dryRun = false;

	const config = loadConfig(overrides);
	const only = typeof args.only === 'string' ? args.only.split(',').map((s) => s.trim()) : undefined;

	log.title(`${config.company} agent office`);
	log.info(
		`provider=${config.provider}${config.provider === 'stub' ? ' (offline stub - set ANTHROPIC_API_KEY for real runs)' : ''} | mode=${config.dryRun ? 'dry-run' : 'live'} | concurrency=${config.limits.concurrency} | budget=${config.limits.maxWorkItems}`,
	);

	const started = Date.now();
	const result = await runOffice({
		config,
		goal: typeof args.goal === 'string' ? args.goal : undefined,
		shift: typeof args.shift === 'string' ? args.shift : undefined,
		only,
	});

	log.title('Run complete');
	log.info(`${result.processed} work item(s) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
	log.info(
		`${result.run.drafts.length} draft(s), ${result.run.reviews.filter((r) => r.verdict === 'approve').length} approved, ${result.run.escalations.length} escalation(s), ${result.run.tasks.length} task(s)`,
	);
	if (result.budgetSpent) log.warn('Work-item budget was spent - some delegated work may not have run.');
	for (const e of result.run.escalations) log.warn(`[${e.severity}] ${e.reason} (${e.author})`);
	log.ok(`report: ${result.reportFile}`);
	log.info(`ledger: ${join(result.runDir, 'ledger.jsonl')}`);
	if (result.run.drafts.length) log.info('review them with: node bin/office.mjs inbox');
}

function cmdRoles() {
	const config = loadConfig();
	const roles = loadRoles(config.paths.roles);
	const store = new Store(config, 'inspect');
	const allTools = buildTools({
		config,
		store,
		item: { id: 'inspect', role: 'inspect' },
		run: { drafts: [], tasks: [], escalations: [], reviews: [], roleNames: [], enqueue: () => null },
	});

	log.title(`The office - ${roles.length} clones`);
	for (const role of roles) {
		const granted = toolsFor(role, allTools).map((t) => t.name);
		log.plain(`\n  ${role.name}  [${role.tier}]`);
		log.plain(`    ${role.title}`);
		log.plain(`    tools: ${granted.join(', ')}`);
	}
	log.plain('');
}

function cmdShifts() {
	const config = loadConfig();
	const file = join(config.paths.data, 'shifts.json');
	const shifts = JSON.parse(readFileSync(file, 'utf8'));
	log.title('Shifts');
	for (const [name, shift] of Object.entries(shifts)) {
		log.plain(`\n  ${name}  (${shift.items.length} seed item(s))`);
		log.plain(`    ${shift.description}`);
		for (const item of shift.items) log.plain(`    - ${item.role}: ${item.task.slice(0, 84)}`);
	}
	log.plain('');
}

function cmdInbox() {
	const config = loadConfig();
	if (!existsSync(config.paths.drafts)) {
		log.info('No drafts yet. Run the office first.');
		return;
	}
	const files = readdirSync(config.paths.drafts)
		.filter((f) => f.endsWith('.md'))
		.map((f) => join(config.paths.drafts, f))
		.sort()
		.reverse();

	log.title(`Inbox - ${files.length} draft(s)`);
	for (const file of files) {
		const head = readFileSync(file, 'utf8').split('\n').slice(0, 12);
		const title = head.find((l) => l.startsWith('# '))?.slice(2) ?? '(untitled)';
		const status = head.find((l) => l.startsWith('- status:'))?.replace('- status:', '').trim() ?? 'unknown';
		const author = head.find((l) => l.startsWith('- author:'))?.replace('- author:', '').trim() ?? '?';
		log.plain(`\n  [${status}] ${title}`);
		log.plain(`    by ${author} - ${file}`);
	}
	log.plain('');
}

function cmdDoctor() {
	const config = loadConfig();
	const problems = [];
	log.title('Office check');

	try {
		const store = new Store(config, 'doctor');
		const collections = store.collections();
		log.ok(`data: ${collections.length} collection(s) - ${collections.join(', ')}`);
		for (const name of ['company', 'leads', 'customers', 'instruments', 'amc-contracts', 'service-tickets', 'pricebook', 'engineers']) {
			if (!collections.includes(name)) problems.push(`missing collection: ${name}`);
			else store.read(name);
		}

		const roles = loadRoles(config.paths.roles);
		const allTools = buildTools({
			config,
			store,
			item: { id: 'doctor', role: 'doctor' },
			run: { drafts: [], tasks: [], escalations: [], reviews: [], roleNames: [], enqueue: () => null },
		});
		for (const role of roles) toolsFor(role, allTools);
		log.ok(`roles: ${roles.length} loaded, all tool grants resolve`);

		const shifts = JSON.parse(readFileSync(join(config.paths.data, 'shifts.json'), 'utf8'));
		for (const [name, shift] of Object.entries(shifts)) {
			for (const item of shift.items) {
				if (!roles.some((r) => r.name === item.role)) problems.push(`shift "${name}" routes to unknown role "${item.role}"`);
			}
			loadShift(config, name);
		}
		log.ok(`shifts: ${Object.keys(shifts).length} valid`);
	} catch (error) {
		problems.push(error.message);
	}

	if (config.provider === 'stub') log.warn('provider: stub (offline). Set ANTHROPIC_API_KEY for real runs.');
	else log.ok(`provider: ${config.provider}`);
	log.ok(`mode: ${config.dryRun ? 'dry-run - nothing is sent' : 'LIVE'}`);

	if (problems.length) {
		for (const p of problems) log.err(p);
		process.exitCode = 1;
	} else {
		log.ok('no problems found');
	}
}

async function main() {
	const [command, ...rest] = process.argv.slice(2);
	const args = parseArgs(rest);

	switch (command) {
		case 'run':
			return await cmdRun(args);
		case 'roles':
			return cmdRoles();
		case 'shifts':
			return cmdShifts();
		case 'inbox':
			return cmdInbox();
		case 'doctor':
			return cmdDoctor();
		case 'sync-hires': {
			const { syncHires } = await import('../src/sync-hires.mjs');
			return syncHires();
		}
		case 'sync-agents': {
			const { syncClaudeAgents } = await import('../src/sync-claude-agents.mjs');
			return syncClaudeAgents();
		}
		case undefined:
		case 'help':
		case '--help':
		case '-h':
			return log.plain(USAGE);
		default:
			log.err(`Unknown command: ${command}`);
			log.plain(USAGE);
			process.exitCode = 1;
	}
}

main().catch((error) => {
	log.err(error.stack ?? String(error));
	process.exitCode = 1;
});
