/**
 * Packet encoding for ZKTeco-family attendance terminals.
 *
 * Team Office Z9000, ZKTeco, eSSL and Realand devices all speak this over TCP
 * on port 4370. There is no official specification; the framing below follows
 * the de-facto one every open implementation agrees on.
 *
 * Deliberately pure — no sockets. The wire format is the part that is easy to
 * get subtly wrong and impossible to debug from a failing device ("no
 * response" looks the same whether the checksum is wrong or the cable is
 * out), so it is separated to be tested directly. The socket half lives in
 * zk-client.ts.
 */

export const ZK_COMMAND = {
  CONNECT: 1000,
  EXIT: 1001,
  AUTH: 1102,
  /** Read one device parameter by name (~SerialNumber, FirmwareVersion, ...). */
  DEVICE_INFO: 11,
  /** Request the attendance log. */
  ATTLOG: 13,
  GET_TIME: 201,
  PREPARE_DATA: 1500,
  DATA: 1501,
  FREE_DATA: 1502,
} as const;

export const ZK_REPLY = {
  OK: 2000,
  ERROR: 2001,
  DATA: 2002,
  UNAUTHORIZED: 2005,
} as const;

/** Fixed bytes that open every TCP frame, before the payload length. */
const TCP_MAGIC_1 = 0x5050;
const TCP_MAGIC_2 = 0x7d82;
const TCP_HEADER_BYTES = 8;
const USHRT_MAX = 0xffff;

/**
 * The device's checksum: 16-bit one's-complement sum over the packet, with an
 * odd trailing byte added on its own.
 *
 * Written to match the devices rather than to be elegant — the end-around
 * carry and the final negation are both load-bearing, and a packet with the
 * wrong checksum is discarded silently.
 */
export function zkChecksum(data: Buffer): number {
  let sum = 0;
  let i = 0;

  for (; i + 1 < data.length; i += 2) {
    sum += data.readUInt16LE(i);
    if (sum > USHRT_MAX) sum -= USHRT_MAX;
  }
  if (i < data.length) {
    sum += data[i];
  }
  while (sum > USHRT_MAX) sum -= USHRT_MAX;

  sum = ~sum;
  while (sum < 0) sum += USHRT_MAX;

  return sum & USHRT_MAX;
}

export interface ZkPacket {
  command: number;
  sessionId: number;
  replyId: number;
  data: Buffer;
}

/** Build one command packet, TCP framing included. */
export function encodePacket({ command, sessionId, replyId, data = Buffer.alloc(0) }: Partial<ZkPacket> & { command: number }): Buffer {
  const body = Buffer.alloc(8 + data.length);
  body.writeUInt16LE(command, 0);
  body.writeUInt16LE(0, 2); // checksum field zeroed while it is computed
  body.writeUInt16LE(sessionId ?? 0, 4);
  body.writeUInt16LE(replyId ?? 0, 6);
  data.copy(body, 8);

  body.writeUInt16LE(zkChecksum(body), 2);

  const frame = Buffer.alloc(TCP_HEADER_BYTES + body.length);
  frame.writeUInt16LE(TCP_MAGIC_1, 0);
  frame.writeUInt16LE(TCP_MAGIC_2, 2);
  frame.writeUInt32LE(body.length, 4);
  body.copy(frame, TCP_HEADER_BYTES);

  return frame;
}

export interface DecodedPacket extends ZkPacket {
  /** Bytes consumed, so a caller can find the next packet in the stream. */
  totalLength: number;
}

/**
 * Read one packet from the front of a buffer.
 *
 * Returns null when the buffer does not yet hold a whole packet — TCP splits
 * where it likes, and a reader that assumes one read is one packet works on a
 * desk and fails across a warehouse.
 */
export function decodePacket(buffer: Buffer): DecodedPacket | null {
  if (buffer.length < TCP_HEADER_BYTES) return null;
  if (buffer.readUInt16LE(0) !== TCP_MAGIC_1 || buffer.readUInt16LE(2) !== TCP_MAGIC_2) {
    throw new Error('Not a ZK packet: the reply did not start with the expected header');
  }

  const bodyLength = buffer.readUInt32LE(4);
  if (buffer.length < TCP_HEADER_BYTES + bodyLength) return null;
  if (bodyLength < 8) throw new Error(`ZK packet too short: ${bodyLength} bytes`);

  const body = buffer.subarray(TCP_HEADER_BYTES, TCP_HEADER_BYTES + bodyLength);

  return {
    command: body.readUInt16LE(0),
    sessionId: body.readUInt16LE(4),
    replyId: body.readUInt16LE(6),
    data: Buffer.from(body.subarray(8)),
    totalLength: TCP_HEADER_BYTES + bodyLength,
  };
}

/** Whether a reply means the command succeeded. */
export function isAck(command: number): boolean {
  return command === ZK_REPLY.OK || command === ZK_REPLY.DATA;
}

/**
 * The device's own words for a failure.
 *
 * "Unauthorized" is by far the most common and the least self-explanatory —
 * it means the terminal has a comm key set and the request did not carry it,
 * not that the account is wrong.
 */
export function describeReply(command: number): string {
  switch (command) {
    case ZK_REPLY.OK:
      return 'OK';
    case ZK_REPLY.DATA:
      return 'OK (data follows)';
    case ZK_REPLY.UNAUTHORIZED:
      return 'Device refused the connection: it has a communication key set. Enter it in the device settings, or clear it on the terminal under Comm > Security.';
    case ZK_REPLY.ERROR:
      return 'Device rejected the command';
    default:
      return `Unexpected reply ${command}`;
  }
}

/**
 * Timestamps arrive as seconds packed into a single integer, counted from
 * 2000-01-01 in the device's own local time — there is no zone in the
 * protocol. The caller supplies the offset the device is configured for.
 */
export function decodeZkTime(encoded: number, timeZoneOffsetMinutes = 330): Date {
  let value = encoded;
  const second = value % 60;
  value = (value - second) / 60;
  const minute = value % 60;
  value = (value - minute) / 60;
  const hour = value % 24;
  value = (value - hour) / 24;
  const day = (value % 31) + 1;
  value = (value - (day - 1)) / 31;
  const month = (value % 12) + 1;
  value = (value - (month - 1)) / 12;
  const year = value + 2000;

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - timeZoneOffsetMinutes * 60_000);
}

export interface AttendanceRecord {
  /** The employee's enrolment number on the device, as a string. */
  userId: string;
  timestamp: Date;
  /** Device-specific: 0 in / 1 out / 4 overtime-in, and vendor variations. */
  status: number;
  /** 1 fingerprint, 2 password, 15 face, and so on. */
  verifyMode: number;
}

/** One record in the attendance log, as the device lays it out. */
const ATTENDANCE_RECORD_BYTES = 40;

/**
 * Split the attendance blob into records.
 *
 * A short tail is ignored rather than throwing: a device that returns a
 * partial final record should still hand over the thousands of good ones
 * before it.
 */
export function parseAttendanceLog(data: Buffer, timeZoneOffsetMinutes = 330): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  for (let offset = 0; offset + ATTENDANCE_RECORD_BYTES <= data.length; offset += ATTENDANCE_RECORD_BYTES) {
    const chunk = data.subarray(offset, offset + ATTENDANCE_RECORD_BYTES);

    // Bytes 2..25 hold the enrolment id as a null-padded string.
    const userId = chunk.subarray(2, 26).toString('ascii').replace(/\0.*$/, '').trim();
    if (!userId) continue;

    records.push({
      userId,
      verifyMode: chunk[26],
      timestamp: decodeZkTime(chunk.readUInt32LE(27), timeZoneOffsetMinutes),
      status: chunk[31],
    });
  }

  return records;
}
