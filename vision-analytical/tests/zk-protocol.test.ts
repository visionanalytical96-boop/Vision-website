import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zkChecksum,
  encodePacket,
  decodePacket,
  isAck,
  describeReply,
  decodeZkTime,
  parseAttendanceLog,
  ZK_COMMAND,
  ZK_REPLY,
} from '@/lib/biometric/zk-protocol';

/**
 * The wire format is the half of a device integration that can be tested
 * without a device, and the half where a mistake is undebuggable from the
 * outside: a wrong checksum and an unplugged terminal both present as
 * silence.
 */

test('a connect packet is framed the way the device expects', () => {
  const packet = encodePacket({ command: ZK_COMMAND.CONNECT, sessionId: 0, replyId: 0 });

  assert.equal(packet.length, 16, '8 bytes of TCP framing + 8 of header, no payload');
  assert.equal(packet.readUInt16LE(0), 0x5050);
  assert.equal(packet.readUInt16LE(2), 0x7d82);
  assert.equal(packet.readUInt32LE(4), 8, 'the length field counts the body, not the frame');
  assert.equal(packet.readUInt16LE(8), ZK_COMMAND.CONNECT);
});

test('the checksum field is zero while the checksum is computed over it', () => {
  // Getting this backwards produces a packet the device silently drops, which
  // is indistinguishable from a network fault.
  const packet = encodePacket({ command: ZK_COMMAND.CONNECT });
  const body = packet.subarray(8);

  const asSent = Buffer.from(body);
  const claimed = asSent.readUInt16LE(2);
  asSent.writeUInt16LE(0, 2);

  assert.equal(zkChecksum(asSent), claimed);
});

test('the checksum carries around rather than overflowing', () => {
  // Values chosen to push the running sum past 0xffff, which is where a
  // plain 16-bit add gives a different answer from the device's.
  const wide = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  const sum = zkChecksum(wide);

  assert.ok(sum >= 0 && sum <= 0xffff, `checksum out of range: ${sum}`);
  assert.equal(sum, zkChecksum(wide), 'stable across calls');
});

test('an odd trailing byte is included', () => {
  const even = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const odd = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  assert.notEqual(zkChecksum(even), zkChecksum(odd), 'the last byte must not be dropped');
});

test('a packet survives a round trip', () => {
  const payload = Buffer.from('~SerialNumber', 'ascii');
  const encoded = encodePacket({
    command: ZK_COMMAND.DEVICE_INFO,
    sessionId: 0x1234,
    replyId: 7,
    data: payload,
  });

  const decoded = decodePacket(encoded);
  assert.ok(decoded);
  assert.equal(decoded.command, ZK_COMMAND.DEVICE_INFO);
  assert.equal(decoded.sessionId, 0x1234);
  assert.equal(decoded.replyId, 7);
  assert.deepEqual(decoded.data, payload);
  assert.equal(decoded.totalLength, encoded.length);
});

test('a half-arrived packet returns null instead of guessing', () => {
  // TCP splits wherever it likes. A reader that treats one read as one packet
  // works on a desk and fails across a building.
  const whole = encodePacket({ command: ZK_COMMAND.CONNECT, data: Buffer.alloc(64, 7) });

  assert.equal(decodePacket(whole.subarray(0, 4)), null, 'not even a header yet');
  assert.equal(decodePacket(whole.subarray(0, whole.length - 1)), null, 'one byte short');
  assert.ok(decodePacket(whole), 'complete');
});

test('two packets in one read are separated', () => {
  const first = encodePacket({ command: ZK_COMMAND.CONNECT });
  const second = encodePacket({ command: ZK_COMMAND.EXIT, sessionId: 9 });
  const stream = Buffer.concat([first, second]);

  const a = decodePacket(stream);
  assert.ok(a);
  assert.equal(a.command, ZK_COMMAND.CONNECT);

  const b = decodePacket(stream.subarray(a.totalLength));
  assert.ok(b);
  assert.equal(b.command, ZK_COMMAND.EXIT);
  assert.equal(b.sessionId, 9);
});

test('a reply that is not a ZK packet is rejected loudly', () => {
  // Pointing the device address at a web server is a real mistake, and
  // "invalid header" is a far better clue than a parse that limps on.
  assert.throws(() => decodePacket(Buffer.from('HTTP/1.1 200 OK\r\n\r\n')), /Not a ZK packet/);
});

test('acknowledgements are told apart from failures', () => {
  assert.equal(isAck(ZK_REPLY.OK), true);
  assert.equal(isAck(ZK_REPLY.DATA), true);
  assert.equal(isAck(ZK_REPLY.ERROR), false);
  assert.equal(isAck(ZK_REPLY.UNAUTHORIZED), false);
});

test('the unauthorized reply explains itself', () => {
  // It means a comm key is set on the terminal, not that a password is wrong.
  // Without that sentence this is the error people spend an afternoon on.
  assert.match(describeReply(ZK_REPLY.UNAUTHORIZED), /communication key/i);
});

test('device timestamps decode to the right instant', () => {
  // The device counts seconds from 2000-01-01 in its own local time, with no
  // zone in the protocol. At IST (+5:30) the epoch is 2019-12-31T18:30Z.
  assert.equal(decodeZkTime(0, 330).toISOString(), '1999-12-31T18:30:00.000Z');

  // 2026-08-14 09:15:30 local, encoded the way the device packs it.
  const encoded = ((((((2026 - 2000) * 12 + (8 - 1)) * 31 + (14 - 1)) * 24 + 9) * 60 + 15) * 60) + 30;
  const decoded = decodeZkTime(encoded, 330);
  assert.equal(decoded.toISOString(), '2026-08-14T03:45:30.000Z', '09:15:30 IST');
});

test('an attendance log splits into records', () => {
  const record = (userId: string, encodedTime: number, status: number, verify: number) => {
    const chunk = Buffer.alloc(40);
    chunk.write(userId, 2, 'ascii');
    chunk[26] = verify;
    chunk.writeUInt32LE(encodedTime, 27);
    chunk[31] = status;
    return chunk;
  };

  const at = (h: number, m: number) =>
    ((((((2026 - 2000) * 12 + (8 - 1)) * 31 + (14 - 1)) * 24 + h) * 60 + m) * 60);

  const log = Buffer.concat([record('101', at(9, 2), 0, 1), record('102', at(18, 30), 1, 15)]);
  const parsed = parseAttendanceLog(log, 330);

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].userId, '101');
  assert.equal(parsed[0].verifyMode, 1, 'fingerprint');
  assert.equal(parsed[0].timestamp.toISOString(), '2026-08-14T03:32:00.000Z', '09:02 IST');
  assert.equal(parsed[1].userId, '102');
  assert.equal(parsed[1].status, 1);
});

test('a truncated final record does not lose the good ones before it', () => {
  const good = Buffer.alloc(40);
  good.write('101', 2, 'ascii');
  good.writeUInt32LE(1, 27);

  const parsed = parseAttendanceLog(Buffer.concat([good, Buffer.alloc(17)]), 330);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].userId, '101');
});

test('blank enrolment ids are skipped', () => {
  // Devices pad their log to a block size with empty records.
  assert.deepEqual(parseAttendanceLog(Buffer.alloc(120), 330), []);
});
