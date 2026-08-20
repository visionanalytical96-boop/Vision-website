import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkQueue } from '../src/queue.mjs';

test('high priority work is taken first, FIFO within a priority', () => {
	const q = new WorkQueue(10);
	q.push({ role: 'a', task: 'normal one' });
	q.push({ role: 'b', task: 'urgent', priority: 'high' });
	q.push({ role: 'c', task: 'later', priority: 'low' });
	q.push({ role: 'd', task: 'normal two' });

	assert.deepEqual(
		q.take(4).map((i) => i.task),
		['urgent', 'normal one', 'normal two', 'later'],
	);
});

test('the budget caps the whole run, not each take', () => {
	const q = new WorkQueue(2);
	assert.ok(q.push({ role: 'a', task: '1' }));
	assert.ok(q.push({ role: 'a', task: '2' }));
	assert.equal(q.push({ role: 'a', task: '3' }), null, 'a spent budget must refuse new work');
	assert.equal(q.spent, true);
});

test('ids are stable and sequential', () => {
	const q = new WorkQueue(5);
	assert.equal(q.push({ role: 'a', task: '1' }).id, 'wi_001');
	assert.equal(q.push({ role: 'a', task: '2' }).id, 'wi_002');
});
