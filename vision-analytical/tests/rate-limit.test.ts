import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isWithinRateLimit,
  recordAttempt,
  clearRateLimit,
} from '../src/lib/rate-limit-buckets';

const WINDOW = 60_000;
const key = () => `test:${Math.random()}`;

test('checking the limit does not spend an attempt', () => {
  const k = key();
  // The login bug: check and increment were one call, so ten correct sign-ins
  // locked the account out with the right password.
  for (let i = 0; i < 50; i += 1) {
    assert.equal(isWithinRateLimit(k, 3, WINDOW), true);
  }
});

test('recorded attempts count towards the limit', () => {
  const k = key();
  recordAttempt(k, WINDOW);
  recordAttempt(k, WINDOW);
  assert.equal(isWithinRateLimit(k, 3, WINDOW), true);
  recordAttempt(k, WINDOW);
  assert.equal(isWithinRateLimit(k, 3, WINDOW), false);
});

test('proving who you are clears the record', () => {
  const k = key();
  for (let i = 0; i < 5; i += 1) recordAttempt(k, WINDOW);
  assert.equal(isWithinRateLimit(k, 3, WINDOW), false);

  clearRateLimit(k);
  assert.equal(isWithinRateLimit(k, 3, WINDOW), true);
});

test('a window that has passed starts the count again', () => {
  const k = key();
  recordAttempt(k, -1);
  assert.equal(isWithinRateLimit(k, 1, WINDOW), true);
});
