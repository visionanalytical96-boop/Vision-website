const RANK = { high: 0, normal: 1, low: 2 };

/**
 * Priority FIFO with a hard budget. The budget is what stops an office of clones
 * handing work to each other forever.
 */
export class WorkQueue {
	/** @param {number} budget */
	constructor(budget) {
		this.budget = budget;
		this.pending = [];
		this.all = [];
		this.seq = 0;
	}

	/** @returns {{id:string}|null} null when the budget is spent */
	push(item) {
		if (this.all.length >= this.budget) return null;
		const full = {
			id: `wi_${String(++this.seq).padStart(3, '0')}`,
			priority: 'normal',
			depth: 0,
			createdBy: 'desk',
			...item,
		};
		this.pending.push(full);
		this.all.push(full);
		return full;
	}

	/** Take up to `n` items, highest priority first, insertion order within a priority. */
	take(n = 1) {
		this.pending.sort((a, b) => (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1));
		return this.pending.splice(0, n);
	}

	get size() {
		return this.pending.length;
	}

	get spent() {
		return this.all.length >= this.budget;
	}
}
