import { buildTools, toolSchemas } from './tools.mjs';
import { toolsFor, modelFor } from './roles.mjs';
import { log } from './log.mjs';

/** Pull the JSON envelope out of a final answer; tolerate prose around it. */
export function parseEnvelope(text) {
	const fenced = /```json\s*([\s\S]*?)```/i.exec(text);
	const candidate = fenced?.[1] ?? text;
	try {
		const parsed = JSON.parse(candidate.trim());
		return typeof parsed === 'object' && parsed !== null ? parsed : { summary: text };
	} catch {
		const brace = candidate.indexOf('{');
		const close = candidate.lastIndexOf('}');
		if (brace !== -1 && close > brace) {
			try {
				return JSON.parse(candidate.slice(brace, close + 1));
			} catch {
				/* fall through to prose */
			}
		}
		return { summary: text.trim().slice(0, 2000), unstructured: true };
	}
}

function systemPrompt({ role, charter, config }) {
	return [
		`You are the ${role.name} clone in the ${config.company} agent office - ${role.title}.`,
		'',
		charter,
		'',
		'## Your charter',
		'',
		role.body,
		'',
		'## How you finish',
		'',
		'Do the work with your tools first, then reply with ONE fenced ```json block and nothing else:',
		'{"summary": "<=3 sentences on what you did and what it means",',
		' "findings": ["concrete facts you established, each citing a record id where one exists"],',
		' "next_actions": ["what should happen next, and who owns it"],',
		' "confidence": "low|medium|high"}',
		'',
		'Rules that outrank your charter:',
		'- Never invent a price, a lead time, a serial number or a compliance claim. If it is not in a record, say so or escalate.',
		'- Every figure you state must trace to a tool result. Cite the record id inline.',
		'- Drafts are drafts. Nothing you write is sent to a customer; a human reviews everything.',
		'- Prefer one good handoff over guessing outside your specialism.',
	].join('\n');
}

function userPrompt(item) {
	return [
		`Work item: ${item.id}`,
		`Task: ${item.task}`,
		item.context ? `Context from ${item.createdBy ?? 'the desk'}:\n${item.context}` : null,
		item.payload ? `Payload:\n${JSON.stringify(item.payload, null, 2)}` : null,
		'',
		'Begin.',
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Run one clone to completion: a bounded tool-use loop that ends in a JSON envelope.
 * @returns {Promise<{ok:boolean, envelope:any, steps:number, usage:{input:number,output:number}, error?:string}>}
 */
export async function runAgent({ role, item, ctx }) {
	const { config, store, client, charter } = ctx;
	const allTools = buildTools({ ...ctx, item });
	const tools = toolsFor(role, allTools);
	const byName = new Map(tools.map((t) => [t.name, t]));
	const model = modelFor(role, config);

	const messages = [{ role: 'user', content: userPrompt(item) }];
	const usage = { input: 0, output: 0 };
	store.ledger({ type: 'item_start', role: role.name, itemId: item.id, task: item.task, model });

	for (let step = 1; step <= config.limits.maxStepsPerAgent; step++) {
		let result;
		try {
			result = await client({
				model,
				system: systemPrompt({ role, charter, config }),
				messages,
				tools: toolSchemas(tools),
				maxTokens: config.limits.maxTokensPerAgent,
			});
		} catch (error) {
			store.ledger({ type: 'item_error', role: role.name, itemId: item.id, error: String(error.message) });
			return { ok: false, envelope: null, steps: step, usage, error: String(error.message) };
		}

		usage.input += result.usage.input;
		usage.output += result.usage.output;

		if (result.stopReason !== 'tool_use' || result.toolUses.length === 0) {
			const envelope = parseEnvelope(result.text);
			store.ledger({ type: 'item_done', role: role.name, itemId: item.id, envelope, steps: step, usage });
			return { ok: true, envelope, steps: step, usage };
		}

		messages.push({ role: 'assistant', content: result.blocks.length ? result.blocks : blocksFrom(result) });

		const results = [];
		for (const call of result.toolUses) {
			const tool = byName.get(call.name);
			let content;
			let isError = false;
			try {
				content = tool ? String(await tool.handler(call.input)) : `Tool ${call.name} is not available to you.`;
				if (!tool) isError = true;
			} catch (error) {
				content = `Tool error: ${error.message}`;
				isError = true;
			}
			log.tool(role.name, `${call.name}(${summarise(call.input)})`);
			store.ledger({ type: 'tool_call', role: role.name, itemId: item.id, tool: call.name, input: call.input, isError });
			results.push({ type: 'tool_result', tool_use_id: call.id, content, is_error: isError });
		}
		messages.push({ role: 'user', content: results });
	}

	store.ledger({ type: 'item_exhausted', role: role.name, itemId: item.id, steps: config.limits.maxStepsPerAgent });
	return {
		ok: false,
		envelope: { summary: 'Step budget exhausted before the clone produced a summary.' },
		steps: config.limits.maxStepsPerAgent,
		usage,
		error: 'step-budget-exhausted',
	};
}

/** The stub provider returns no raw blocks; rebuild them so the transcript stays valid. */
function blocksFrom(result) {
	return result.toolUses.map((t) => ({ type: 'tool_use', id: t.id, name: t.name, input: t.input }));
}

function summarise(input) {
	const s = Object.entries(input ?? {})
		.map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
		.join(', ');
	return s.length > 90 ? `${s.slice(0, 90)}...` : s;
}
