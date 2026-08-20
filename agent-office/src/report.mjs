/** Human-facing run report: what the office did, what needs a person, what it cost. */
export function renderRunReport({ config, run, processed, goal, shift, queue }) {
	const lines = [];
	const push = (...s) => lines.push(...s);

	push(`# ${config.company} - agent office run ${run.runId}`, '');
	push(`- when: ${new Date().toISOString()}`);
	push(`- trigger: ${shift ? `shift "${shift}"` : `goal "${goal ?? 'daily desk'}"`}`);
	push(`- provider: ${config.provider}${config.provider === 'stub' ? ' (offline - no model calls)' : ''}`);
	push(`- mode: ${config.dryRun ? 'DRY RUN (nothing sent)' : 'LIVE'}`);
	push(`- work items processed: ${processed}${queue.spent ? ' (budget spent)' : ''}`);
	push(`- tokens: ${run.usage.input} in / ${run.usage.output} out`, '');

	push('## Needs a human', '');
	if (run.escalations.length) {
		for (const e of run.escalations) {
			push(`- **[${e.severity}] ${e.reason}** - raised by ${e.author}${e.related_id ? ` (${e.related_id})` : ''}`);
			if (e.detail) push(`  ${e.detail}`);
		}
	} else {
		push('- Nothing escalated.');
	}
	push('');

	push('## Drafts awaiting send', '');
	if (run.drafts.length) {
		const verdicts = new Map(run.reviews.map((r) => [r.file, r]));
		for (const d of run.drafts) {
			const v = verdicts.get(d.file);
			push(`- [${v ? v.verdict : 'unreviewed'}] **${d.kind}** - ${d.title} _(by ${d.author})_`);
			push(`  \`${d.file}\``);
			if (v?.issues?.length) for (const i of v.issues) push(`  - fix: ${i}`);
		}
	} else {
		push('- No drafts produced.');
	}
	push('');

	push('## Tasks for the team', '');
	if (run.tasks.length) {
		for (const t of run.tasks) push(`- ${t.owner}: ${t.title} (due in ${t.due_in_days}d) - from ${t.author}`);
	} else {
		push('- None.');
	}
	push('');

	push('## Who did what', '');
	for (const r of run.results) {
		push(`### ${r.role} - ${r.item.id}`);
		push(`_${r.item.task}_`, '');
		if (r.error) {
			push(`**Failed:** ${r.error}`, '');
			continue;
		}
		const env = r.envelope ?? {};
		push(env.summary ?? '(no summary)', '');
		for (const f of env.findings ?? []) push(`- ${f}`);
		if (env.next_actions?.length) {
			push('', 'Next:');
			for (const n of env.next_actions) push(`- ${n}`);
		}
		push('', `steps: ${r.steps} | confidence: ${env.confidence ?? 'n/a'}`, '');
	}

	return lines.join('\n');
}
