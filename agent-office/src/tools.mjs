import { matches, daysUntil } from './store.mjs';

/**
 * The office toolbelt. Every tool is local-file backed and side-effect free outside
 * `out/`, so a full autonomous run can never touch a customer, a CRM or an inbox.
 * `handoff` is what makes this an office rather than a single agent: any clone can
 * put work on a colleague's desk.
 */

const truncate = (value, max = 8000) => {
	const s = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
	return s.length > max ? `${s.slice(0, max)}\n...[truncated ${s.length - max} chars]` : s;
};

/** @returns {Array<{name:string,description:string,input_schema:any,handler:Function}>} */
export function buildTools(ctx) {
	const { store, config, item, run } = ctx;

	return [
		{
			name: 'list_records',
			description:
				'List records from an office dataset. Collections: leads, instruments, amc-contracts, service-tickets, pricebook, engineers, company. Optional filter does a case-insensitive contains match on any field (dot paths allowed).',
			input_schema: {
				type: 'object',
				properties: {
					collection: { type: 'string' },
					filter: { type: 'object', additionalProperties: { type: 'string' } },
					limit: { type: 'integer', minimum: 1, maximum: 50 },
				},
				required: ['collection'],
			},
			handler: ({ collection, filter, limit = 10 }) => {
				const rows = store.read(collection).filter((r) => matches(r, filter));
				return truncate({ collection, total: rows.length, items: rows.slice(0, limit) });
			},
		},
		{
			name: 'get_record',
			description: 'Fetch one full record by id from a collection.',
			input_schema: {
				type: 'object',
				properties: { collection: { type: 'string' }, id: { type: 'string' } },
				required: ['collection', 'id'],
			},
			handler: ({ collection, id }) => {
				const row = store.read(collection).find((r) => r.id === id);
				return row ? truncate(row) : `No record ${id} in ${collection}.`;
			},
		},
		{
			name: 'expiring_contracts',
			description:
				'AMC/CMC contracts whose end date falls within the given window in days. Use this instead of scanning all contracts by hand.',
			input_schema: {
				type: 'object',
				properties: { within_days: { type: 'integer', minimum: 1, maximum: 365 } },
				required: ['within_days'],
			},
			handler: ({ within_days }) => {
				const rows = store
					.read('amc-contracts')
					.map((c) => ({ ...c, days_to_expiry: daysUntil(c.end_date) }))
					.filter((c) => c.days_to_expiry !== null && c.days_to_expiry <= within_days)
					.sort((a, b) => a.days_to_expiry - b.days_to_expiry);
				return truncate({ within_days, total: rows.length, items: rows });
			},
		},
		{
			name: 'pricebook_lookup',
			description:
				'Search the pricebook for instruments, spares, consumables, AMC tiers and qualification services. Never quote a figure that did not come from here.',
			input_schema: {
				type: 'object',
				properties: { query: { type: 'string' }, category: { type: 'string' } },
				required: ['query'],
			},
			handler: ({ query, category }) => {
				const q = String(query).toLowerCase();
				const rows = store
					.read('pricebook')
					.filter((p) => !category || String(p.category).toLowerCase() === String(category).toLowerCase())
					.filter((p) =>
						[p.sku, p.name, p.category, p.brand].filter(Boolean).some((f) => String(f).toLowerCase().includes(q)),
					);
				return rows.length
					? truncate({ query, items: rows.slice(0, 15) })
					: `No pricebook entry matches "${query}". Do not invent a price - escalate or ask.`;
			},
		},
		{
			name: 'save_draft',
			description:
				'Save a deliverable for human review (email, quotation, service plan, report). It is written to disk only - nothing is ever sent.',
			input_schema: {
				type: 'object',
				properties: {
					kind: { type: 'string', enum: ['email', 'whatsapp', 'quotation', 'service-plan', 'report', 'note'] },
					title: { type: 'string' },
					body: { type: 'string' },
					recipient: { type: 'string' },
					related_id: { type: 'string' },
				},
				required: ['kind', 'title', 'body'],
			},
			handler: (input) => {
				const header = [
					`# ${input.title}`,
					'',
					`- kind: ${input.kind}`,
					`- author: ${item.role}`,
					`- run: ${store.runId}`,
					`- work item: ${item.id}`,
					input.recipient ? `- recipient: ${input.recipient}` : null,
					input.related_id ? `- related: ${input.related_id}` : null,
					`- status: draft (unreviewed)`,
					'',
					'---',
					'',
				]
					.filter(Boolean)
					.join('\n');
				const file = store.writeArtifact(input.kind, input.title, header + input.body);
				run.drafts.push({
					file,
					kind: input.kind,
					title: input.title,
					author: item.role,
					itemId: item.id,
					relatedId: input.related_id,
				});
				store.ledger({ type: 'draft', role: item.role, itemId: item.id, kind: input.kind, file });
				return `Draft saved: ${file}. It is queued for review by the reviewer role.`;
			},
		},
		{
			name: 'read_draft',
			description: 'Read back a draft produced earlier in this run, by its file path. Reviewers use this.',
			input_schema: {
				type: 'object',
				properties: { file: { type: 'string' } },
				required: ['file'],
			},
			handler: ({ file }) => truncate(store.readArtifact(file)),
		},
		{
			name: 'record_review',
			description:
				'Record a review verdict on a draft. approve = ready for a human to send as-is; revise = fixable, list the issues; reject = do not send, say why.',
			input_schema: {
				type: 'object',
				properties: {
					file: { type: 'string' },
					verdict: { type: 'string', enum: ['approve', 'revise', 'reject'] },
					issues: { type: 'array', items: { type: 'string' } },
					note: { type: 'string' },
				},
				required: ['file', 'verdict'],
			},
			handler: ({ file, verdict, issues = [], note }) => {
				// Stamp the draft first: a verdict on a file we cannot open must fail loudly
				// rather than leave a phantom approval on the run record.
				store.annotateArtifact(file, verdict, issues, note);
				const review = { file, verdict, issues, note, reviewer: item.role, itemId: item.id };
				run.reviews.push(review);
				store.ledger({ type: 'review', role: item.role, ...review });
				return `Review recorded: ${verdict}${issues.length ? ` (${issues.length} issue(s))` : ''}.`;
			},
		},
		{
			name: 'create_task',
			description: 'Put a task on a human colleague\'s list (service engineer visit, callback, document chase).',
			input_schema: {
				type: 'object',
				properties: {
					title: { type: 'string' },
					owner: { type: 'string' },
					due_in_days: { type: 'integer', minimum: 0, maximum: 180 },
					detail: { type: 'string' },
					related_id: { type: 'string' },
				},
				required: ['title', 'owner', 'due_in_days'],
			},
			handler: (input) => {
				const task = { ...input, author: item.role, itemId: item.id };
				run.tasks.push(task);
				store.ledger({ type: 'task', role: item.role, ...task });
				return `Task recorded for ${input.owner}, due in ${input.due_in_days} day(s).`;
			},
		},
		{
			name: 'escalate',
			description:
				'Raise something a human must decide: pricing beyond policy, a compliance risk, an unhappy customer, missing data. Escalating is never a failure.',
			input_schema: {
				type: 'object',
				properties: {
					reason: { type: 'string' },
					severity: { type: 'string', enum: ['low', 'medium', 'high'] },
					detail: { type: 'string' },
					related_id: { type: 'string' },
				},
				required: ['reason', 'severity'],
			},
			handler: (input) => {
				const esc = { ...input, author: item.role, itemId: item.id };
				run.escalations.push(esc);
				store.ledger({ type: 'escalation', role: item.role, ...esc });
				return `Escalated (${input.severity}) to the human desk. Continue with what you can still do.`;
			},
		},
		{
			name: 'handoff',
			description: `Hand work to another clone in the office. Use when the next step belongs to a different specialism. Give them everything they need - they do not see your conversation. Colleagues: ${run.roleNames.filter((n) => n !== item.role).join(', ')}.`,
			input_schema: {
				type: 'object',
				properties: {
					to_role: { type: 'string' },
					task: { type: 'string' },
					context: { type: 'string' },
					priority: { type: 'string', enum: ['low', 'normal', 'high'] },
				},
				required: ['to_role', 'task'],
			},
			handler: (input) => {
				if (!run.roleNames.includes(input.to_role)) {
					return `No such colleague: ${input.to_role}. The office is: ${run.roleNames.join(', ')}.`;
				}
				if ((item.depth ?? 0) >= config.limits.maxHandoffDepth) {
					return `Handoff depth limit (${config.limits.maxHandoffDepth}) reached - finish your own summary instead and escalate if a human is needed.`;
				}
				const queued = run.enqueue({
					role: input.to_role,
					task: input.task,
					context: input.context,
					priority: input.priority ?? 'normal',
					depth: (item.depth ?? 0) + 1,
					parentId: item.id,
					createdBy: item.role,
				});
				return queued
					? `Handed off to ${input.to_role} as ${queued.id}.`
					: 'Office work-item budget is spent; summarise instead of delegating.';
			},
		},
	];
}

/** Strip handlers so the array can be sent to the API. */
export function toolSchemas(tools) {
	return tools.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}
