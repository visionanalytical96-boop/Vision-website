import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * All agent I/O funnels through here. Reads are confined to `paths.data`, writes to
 * `paths.out`. Nothing an agent produces leaves the box - a draft is a file, never a send.
 */
export class Store {
	/** @param {import('./config.mjs').OfficeConfig} cfg @param {string} runId */
	constructor(cfg, runId) {
		this.cfg = cfg;
		this.runId = runId;
		this.runDir = join(cfg.paths.runs, runId);
		this.cache = new Map();
	}

	/** Created on first write, so read-only commands leave no directories behind. */
	#ensureRunDir() {
		mkdirSync(this.runDir, { recursive: true });
		return this.runDir;
	}

	#ensureDraftsDir() {
		mkdirSync(this.cfg.paths.drafts, { recursive: true });
		return this.cfg.paths.drafts;
	}

	/** @param {string} collection */
	read(collection) {
		if (!/^[a-z0-9-]+$/.test(collection)) throw new Error(`Invalid collection: ${collection}`);
		if (this.cache.has(collection)) return this.cache.get(collection);

		const file = resolve(this.cfg.paths.data, `${collection}.json`);
		if (!file.startsWith(this.cfg.paths.data)) throw new Error('Path escapes the data directory');
		if (!existsSync(file)) throw new Error(`No such collection: ${collection}`);

		const parsed = JSON.parse(readFileSync(file, 'utf8'));
		const rows = Array.isArray(parsed) ? parsed : (parsed.items ?? [parsed]);
		this.cache.set(collection, rows);
		return rows;
	}

	collections() {
		return readdirSync(this.cfg.paths.data)
			.filter((f) => f.endsWith('.json'))
			.map((f) => f.replace(/\.json$/, ''));
	}

	/** Append a structured event to the run ledger (JSONL, append-only). */
	ledger(event) {
		const line = JSON.stringify({ ts: new Date().toISOString(), runId: this.runId, ...event });
		appendFileSync(join(this.#ensureRunDir(), 'ledger.jsonl'), `${line}\n`);
		return line;
	}

	/** Persist an agent artifact for human review; returns its relative path. */
	writeArtifact(kind, name, body) {
		const safe = `${kind}--${name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 90);
		const stamp = String(Date.now()).slice(-6);
		const file = join(this.#ensureDraftsDir(), `${safe}-${stamp}.md`);
		writeFileSync(file, body);
		appendFileSync(join(this.#ensureRunDir(), 'artifacts.jsonl'), `${JSON.stringify({ kind, name, file })}\n`);
		return file;
	}

	/** Read an artifact back, refusing anything outside the drafts directory. */
	readArtifact(file) {
		const full = resolve(this.cfg.paths.drafts, file.replace(/^.*\/drafts\//, ''));
		if (!full.startsWith(this.cfg.paths.drafts)) throw new Error('Path escapes the drafts directory');
		if (!existsSync(full)) throw new Error(`No such draft: ${file}`);
		return readFileSync(full, 'utf8');
	}

	/** Stamp a review verdict onto a draft so the human inbox shows it. */
	annotateArtifact(file, verdict, issues = [], note) {
		const full = resolve(this.cfg.paths.drafts, file.replace(/^.*\/drafts\//, ''));
		if (!full.startsWith(this.cfg.paths.drafts)) throw new Error('Path escapes the drafts directory');
		if (!existsSync(full)) throw new Error(`No such draft: ${file}`);
		const body = readFileSync(full, 'utf8').replace(
			'- status: draft (unreviewed)',
			`- status: reviewed - ${verdict}`,
		);
		const footer = [
			'',
			'---',
			'',
			`## Review: ${verdict.toUpperCase()}`,
			...issues.map((i) => `- ${i}`),
			note ? `\n${note}` : '',
		].join('\n');
		writeFileSync(full, body + footer);
		return full;
	}

	writeSummary(name, body) {
		const file = join(this.#ensureRunDir(), name);
		writeFileSync(file, body);
		return file;
	}

	readLedger() {
		const file = join(this.runDir, 'ledger.jsonl');
		if (!existsSync(file)) return [];
		return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
	}
}

/** Case-insensitive contains-match across a record's stringified values. */
export function matches(record, filter = {}) {
	return Object.entries(filter).every(([key, want]) => {
		if (want === undefined || want === null || want === '') return true;
		const have = key.split('.').reduce((acc, k) => acc?.[k], record);
		if (have === undefined) return false;
		return String(have).toLowerCase().includes(String(want).toLowerCase());
	});
}

export function daysUntil(dateStr, now = new Date()) {
	const then = new Date(dateStr);
	if (Number.isNaN(then.getTime())) return null;
	return Math.round((then.getTime() - now.getTime()) / 86_400_000);
}
