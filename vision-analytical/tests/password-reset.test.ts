import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
  classifyResetToken,
  hashesMatch,
  buildResetUrl,
  RESET_TOKEN_TTL_MINUTES,
} from '../src/lib/password-reset';

test('tokens are long and never repeat', () => {
  const tokens = new Set(Array.from({ length: 200 }, () => generateResetToken()));
  assert.equal(tokens.size, 200);
  for (const token of tokens) assert.ok(token.length >= 40, `too short: ${token}`);
});

test('tokens are url-safe, so a link survives being emailed', () => {
  for (let i = 0; i < 50; i += 1) {
    assert.match(generateResetToken(), /^[A-Za-z0-9_-]+$/);
  }
});

test('the stored hash is not the token', () => {
  const token = generateResetToken();
  const hash = hashResetToken(token);
  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
  // Same input, same hash — the lookup depends on it.
  assert.equal(hashResetToken(token), hash);
});

test('different tokens hash differently', () => {
  assert.notEqual(hashResetToken(generateResetToken()), hashResetToken(generateResetToken()));
});

test('a link expires half an hour out', () => {
  const now = new Date('2026-08-14T10:00:00.000Z');
  assert.equal(RESET_TOKEN_TTL_MINUTES, 30);
  assert.equal(resetTokenExpiry(now).toISOString(), '2026-08-14T10:30:00.000Z');
});

test('a fresh token is valid', () => {
  const now = new Date();
  const record = { expiresAt: new Date(now.getTime() + 60_000), usedAt: null };
  assert.equal(classifyResetToken(record, now), 'valid');
});

test('an expired token is refused', () => {
  const now = new Date();
  assert.equal(
    classifyResetToken({ expiresAt: new Date(now.getTime() - 1), usedAt: null }, now),
    'expired',
  );
});

test('expiry is exclusive at the boundary', () => {
  const now = new Date();
  assert.equal(classifyResetToken({ expiresAt: now, usedAt: null }, now), 'expired');
});

test('a used token stays used even before it expires', () => {
  const now = new Date();
  const record = { expiresAt: new Date(now.getTime() + 600_000), usedAt: new Date() };
  // "Already used" and "expired" are different messages to a person on the phone.
  assert.equal(classifyResetToken(record, now), 'used');
});

test('hash comparison rejects a mismatch and accepts a match', () => {
  const a = hashResetToken('one');
  assert.equal(hashesMatch(a, a), true);
  assert.equal(hashesMatch(a, hashResetToken('two')), false);
  assert.equal(hashesMatch(a, 'short'), false);
});

test('the reset link points at the configured site, not the request', () => {
  const token = 'abc-123_XYZ';
  assert.equal(
    buildResetUrl('https://visionanalytical.co.in', token),
    'https://visionanalytical.co.in/reset-password?token=abc-123_XYZ',
  );
  // A trailing slash in configuration must not produce a double slash.
  assert.equal(
    buildResetUrl('https://visionanalytical.co.in/', token),
    'https://visionanalytical.co.in/reset-password?token=abc-123_XYZ',
  );
});

test('a token with url-special characters survives the round trip', () => {
  const url = buildResetUrl('https://example.com', 'a+b/c=d&e');
  assert.ok(url.includes('token=a%2Bb%2Fc%3Dd%26e'));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('token'), 'a+b/c=d&e');
});
