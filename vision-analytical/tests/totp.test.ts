import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  base32Encode,
  base32Decode,
  hotp,
  totp,
  verifyTotp,
  generateSecret,
  buildOtpauthUri,
  formatSecretForDisplay,
  generateRecoveryCodes,
} from '../src/lib/totp';

// "12345678901234567890" — the shared secret every RFC 4226/6238 vector uses.
const RFC_SECRET_ASCII = Buffer.from('12345678901234567890');
const RFC_SECRET_BASE32 = base32Encode(RFC_SECRET_ASCII);

test('base32 round-trips', () => {
  for (const value of ['', 'a', 'ab', 'abc', 'abcd', 'abcde', 'hello world']) {
    assert.equal(base32Decode(base32Encode(Buffer.from(value))).toString(), value);
  }
});

test('base32 matches the known encoding of the RFC secret', () => {
  assert.equal(RFC_SECRET_BASE32, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
});

test('base32 ignores padding, spaces and the dashes we print', () => {
  const secret = generateSecret();
  const pretty = formatSecretForDisplay(secret);
  assert.deepEqual(base32Decode(pretty), base32Decode(secret));
});

test('base32 rejects a character outside the alphabet', () => {
  assert.throws(() => base32Decode('ABC1'), /Not a base32 character/);
});

test('HOTP matches the RFC 4226 test vectors', () => {
  // Appendix D, the canonical eight.
  const expected = [
    '755224', '287082', '359152', '969429', '338314',
    '254676', '287922', '162583', '399871', '520489',
  ];
  expected.forEach((code, counter) => {
    assert.equal(hotp(RFC_SECRET_ASCII, counter, { digits: 6 }), code, `counter ${counter}`);
  });
});

test('TOTP matches the RFC 6238 test vectors', () => {
  // Appendix B, SHA-1 rows, as 8-digit codes.
  const vectors: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ];
  for (const [seconds, code] of vectors) {
    assert.equal(totp(RFC_SECRET_BASE32, seconds * 1000, { digits: 8 }), code, `t=${seconds}`);
  }
});

test('the current code verifies', () => {
  const secret = generateSecret();
  const now = Date.now();
  assert.equal(verifyTotp(secret, totp(secret, now), now), true);
});

test('a code from the previous or next step still verifies', () => {
  // Phone clocks drift, and a code typed at :29 arrives at :31.
  const secret = generateSecret();
  const now = Date.now();
  assert.equal(verifyTotp(secret, totp(secret, now - 30_000), now), true);
  assert.equal(verifyTotp(secret, totp(secret, now + 30_000), now), true);
});

test('a code two steps away is refused', () => {
  const secret = generateSecret();
  const now = Date.now();
  assert.equal(verifyTotp(secret, totp(secret, now - 90_000), now), false);
});

test('another account�s code does not open this one', () => {
  const now = Date.now();
  assert.equal(verifyTotp(generateSecret(), totp(generateSecret(), now), now), false);
});

test('malformed input is refused rather than throwing', () => {
  const secret = generateSecret();
  for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 56 78', '<script>']) {
    assert.equal(verifyTotp(secret, bad), false, `should refuse ${JSON.stringify(bad)}`);
  }
});

test('spaces around a pasted code are tolerated', () => {
  const secret = generateSecret();
  const now = Date.now();
  const code = totp(secret, now);
  assert.equal(verifyTotp(secret, ` ${code} `, now), true);
});

test('secrets are not reused between accounts', () => {
  const secrets = new Set(Array.from({ length: 50 }, () => generateSecret()));
  assert.equal(secrets.size, 50);
});

test('the otpauth URI carries what an authenticator app needs', () => {
  const uri = buildOtpauthUri({
    secret: 'GEZDGNBVGY3TQOJQ',
    account: 'vishal@visionanalytical.co.in',
    issuer: 'Vision Analytical',
  });
  assert.ok(uri.startsWith('otpauth://totp/'));
  assert.ok(uri.includes('secret=GEZDGNBVGY3TQOJQ'));
  assert.ok(uri.includes('issuer=Vision+Analytical'));
  assert.ok(uri.includes('digits=6'));
  assert.ok(uri.includes('period=30'));
  // The label is what distinguishes this entry in a list of many.
  assert.ok(uri.includes(encodeURIComponent('Vision Analytical:vishal@visionanalytical.co.in')));
});

test('recovery codes are unique and readable', () => {
  const codes = generateRecoveryCodes(10);
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  for (const code of codes) {
    // No 0/O or 1/l — these get read off paper and typed by hand.
    assert.match(code, /^[23456789abcdefghjkmnpqrstuvwxyz]{5}-[23456789abcdefghjkmnpqrstuvwxyz]{5}$/);
  }
});
