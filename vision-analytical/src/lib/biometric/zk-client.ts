import 'server-only';
import { connect, type Socket } from 'node:net';
import {
  encodePacket,
  decodePacket,
  isAck,
  describeReply,
  parseAttendanceLog,
  ZK_COMMAND,
  ZK_REPLY,
  type AttendanceRecord,
} from '@/lib/biometric/zk-protocol';

/**
 * Socket half of the ZKTeco terminal client.
 *
 * The wire format lives in zk-protocol.ts and is tested on its own; this file
 * is the part that cannot be tested without a device, so it is kept as thin as
 * possible — open, exchange, close, with a timeout on everything.
 *
 * Every failure here is reported in the operator's terms rather than the
 * socket's. "ECONNREFUSED" tells an admin nothing; "nothing is listening on
 * that port — check the device is switched on" tells them what to do next.
 */

const DEFAULT_TIMEOUT_MS = 6000;

export interface ZkConnectionOptions {
  host: string;
  port?: number;
  timeoutMs?: number;
}

export class ZkError extends Error {
  constructor(
    message: string,
    /** Whether trying again unchanged could plausibly work. */
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'ZkError';
  }
}

/** Turns a socket-level failure into something an admin can act on. */
function explainSocketError(error: NodeJS.ErrnoException, host: string, port: number): ZkError {
  switch (error.code) {
    case 'ECONNREFUSED':
      return new ZkError(
        `${host} answered but nothing is listening on port ${port}. The device is on the network but its TCP/comm port is off or set to a different number — check Comm > Ethernet on the terminal.`,
      );
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
      return new ZkError(
        `No route to ${host}. The device is on a different network from this server — put both on the same subnet, or switch the device to DHCP so the router gives it a matching address.`,
      );
    case 'ETIMEDOUT':
      return new ZkError(`${host} did not answer within the timeout. It is switched off, asleep, or on another network.`, true);
    case 'ECONNRESET':
      return new ZkError(`${host} closed the connection mid-exchange. Another program may already be connected to it — these terminals allow only one session at a time.`, true);
    default:
      return new ZkError(`${error.code ?? 'Connection failed'} talking to ${host}:${port}`);
  }
}

/**
 * One conversation with a terminal.
 *
 * Not reusable across connections on purpose: these devices allow a single
 * session, and holding one open is how the attendance software people already
 * run stops being able to reach it.
 */
class ZkSession {
  private buffer = Buffer.alloc(0);
  private sessionId = 0;
  private replyId = 0;

  private constructor(
    private readonly socket: Socket,
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs: number,
  ) {}

  static async open({ host, port = 4370, timeoutMs = DEFAULT_TIMEOUT_MS }: ZkConnectionOptions): Promise<ZkSession> {
    const socket = await new Promise<Socket>((resolve, reject) => {
      const s = connect({ host, port });
      s.setTimeout(timeoutMs);
      s.once('connect', () => {
        s.setTimeout(0);
        resolve(s);
      });
      s.once('timeout', () => {
        s.destroy();
        reject(new ZkError(`${host}:${port} did not answer within ${timeoutMs}ms.`, true));
      });
      s.once('error', (error: NodeJS.ErrnoException) => {
        s.destroy();
        reject(explainSocketError(error, host, port));
      });
    });

    const session = new ZkSession(socket, host, port, timeoutMs);
    const reply = await session.exchange(ZK_COMMAND.CONNECT);

    if (reply.command === ZK_REPLY.UNAUTHORIZED) {
      session.close();
      throw new ZkError(describeReply(ZK_REPLY.UNAUTHORIZED));
    }
    if (!isAck(reply.command)) {
      session.close();
      throw new ZkError(
        `${host}:${port} is reachable but did not answer as a biometric terminal (${describeReply(reply.command)}). Check the address points at the device and not at something else on the network.`,
      );
    }

    session.sessionId = reply.sessionId;
    return session;
  }

  /** Send one command and wait for the matching reply. */
  private exchange(command: number, data?: Buffer): Promise<{ command: number; sessionId: number; data: Buffer }> {
    this.replyId = (this.replyId + 1) & 0xffff;
    const packet = encodePacket({ command, sessionId: this.sessionId, replyId: this.replyId, data });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new ZkError(`${this.host} accepted the connection but did not reply within ${this.timeoutMs}ms.`, true));
      }, this.timeoutMs);

      const onData = (chunk: Buffer) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        let decoded;
        try {
          decoded = decodePacket(this.buffer);
        } catch (error) {
          cleanup();
          reject(new ZkError(error instanceof Error ? error.message : 'Unreadable reply'));
          return;
        }
        // Partial packet: TCP splits where it likes, so wait for the rest.
        if (!decoded) return;

        this.buffer = this.buffer.subarray(decoded.totalLength);
        cleanup();
        resolve(decoded);
      };

      const onError = (error: NodeJS.ErrnoException) => {
        cleanup();
        reject(explainSocketError(error, this.host, this.port));
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.socket.off('data', onData);
        this.socket.off('error', onError);
      };

      this.socket.on('data', onData);
      this.socket.on('error', onError);
      this.socket.write(packet);
    });
  }

  /**
   * Read one named parameter — "~SerialNumber", "FirmwareVersion",
   * "~DeviceName", "MAC", "~Platform".
   *
   * Replies come back as `Name=Value`; some firmwares omit the name, so the
   * value is taken from after the first `=` when there is one.
   */
  async readParameter(name: string): Promise<string | null> {
    const reply = await this.exchange(ZK_COMMAND.DEVICE_INFO, Buffer.from(name, 'ascii'));
    if (!isAck(reply.command)) return null;

    const text = reply.data.toString('ascii').replace(/\0+$/, '').trim();
    const equals = text.indexOf('=');
    const value = equals === -1 ? text : text.slice(equals + 1);
    return value.trim() || null;
  }

  /**
   * Pull the attendance log.
   *
   * The device answers either with the records inline, or with PREPARE_DATA
   * announcing a size and the bytes following in DATA frames. Both shapes are
   * in the wild on devices sold as the same model, so both are handled.
   */
  async readAttendance(timeZoneOffsetMinutes = 330): Promise<AttendanceRecord[]> {
    const reply = await this.exchange(ZK_COMMAND.ATTLOG);
    if (!isAck(reply.command)) {
      throw new ZkError(`Device refused to hand over the attendance log (${describeReply(reply.command)}).`);
    }

    let payload = reply.data;

    if (reply.command === ZK_REPLY.DATA && payload.length >= 4) {
      // Inline: the records are already here.
      return parseAttendanceLog(payload, timeZoneOffsetMinutes);
    }

    if (payload.length >= 4) {
      const expected = payload.readUInt32LE(0);
      const chunks: Buffer[] = [];
      let received = 0;

      while (received < expected) {
        const frame = await this.exchange(ZK_COMMAND.DATA);
        if (!isAck(frame.command) || frame.data.length === 0) break;
        chunks.push(frame.data);
        received += frame.data.length;
      }
      payload = Buffer.concat(chunks);
    }

    return parseAttendanceLog(payload, timeZoneOffsetMinutes);
  }

  async close(): Promise<void> {
    try {
      await this.exchange(ZK_COMMAND.EXIT);
    } catch {
      // Already gone — the point of EXIT is to free the device's single
      // session slot, and a failure here means it is free anyway.
    } finally {
      this.socket.destroy();
    }
  }
}

export interface DeviceIdentity {
  serialNumber: string | null;
  firmwareVersion: string | null;
  deviceName: string | null;
  macAddress: string | null;
  platform: string | null;
}

export interface ProbeResult {
  ok: boolean;
  message: string;
  roundTripMs: number;
  identity?: DeviceIdentity;
}

/**
 * Handshake with a terminal and read who it says it is.
 *
 * This is what "Test connection" should mean. Opening a socket only proves
 * something is listening on the port — a web server, a printer, the wrong
 * device entirely — and reporting that as success is how an admin ends up
 * trusting a link that was never going to sync.
 */
export async function probeDevice(options: ZkConnectionOptions): Promise<ProbeResult> {
  const startedAt = Date.now();
  let session: ZkSession | null = null;

  try {
    session = await ZkSession.open(options);

    const [serialNumber, firmwareVersion, deviceName, macAddress, platform] = await Promise.all([
      session.readParameter('~SerialNumber').catch(() => null),
      session.readParameter('FirmwareVersion').catch(() => null),
      session.readParameter('~DeviceName').catch(() => null),
      session.readParameter('MAC').catch(() => null),
      session.readParameter('~Platform').catch(() => null),
    ]);

    return {
      ok: true,
      roundTripMs: Date.now() - startedAt,
      message: serialNumber
        ? `Connected. ${deviceName ?? 'Device'} — serial ${serialNumber}${firmwareVersion ? `, firmware ${firmwareVersion}` : ''}.`
        : 'Connected, but the device did not report its serial number.',
      identity: { serialNumber, firmwareVersion, deviceName, macAddress, platform },
    };
  } catch (error) {
    return {
      ok: false,
      roundTripMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  } finally {
    await session?.close();
  }
}

/** Fetch the attendance log, closing the session whatever happens. */
export async function fetchAttendance(
  options: ZkConnectionOptions,
  timeZoneOffsetMinutes = 330,
): Promise<AttendanceRecord[]> {
  const session = await ZkSession.open(options);
  try {
    return await session.readAttendance(timeZoneOffsetMinutes);
  } finally {
    await session.close();
  }
}

export interface DiscoveredDevice {
  host: string;
  port: number;
  identity?: DeviceIdentity;
  message: string;
}

/**
 * Sweep a /24 for terminals.
 *
 * Every address is probed with a short timeout and a capped number in flight:
 * 254 simultaneous sockets is enough to have the kernel start refusing them,
 * and the failures then look like absent devices.
 *
 * Only a real handshake counts as a find. A port scan alone would report
 * anything that happens to listen on 4370.
 */
export async function discoverDevices(
  subnetPrefix: string,
  { port = 4370, timeoutMs = 900, concurrency = 32 }: { port?: number; timeoutMs?: number; concurrency?: number } = {},
): Promise<DiscoveredDevice[]> {
  const hosts = Array.from({ length: 254 }, (_, index) => `${subnetPrefix}.${index + 1}`);
  const found: DiscoveredDevice[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < hosts.length) {
      const host = hosts[cursor++];
      const result = await probeDevice({ host, port, timeoutMs });
      if (result.ok) {
        found.push({ host, port, identity: result.identity, message: result.message });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, hosts.length) }, worker));
  return found.sort((a, b) => a.host.localeCompare(b.host, undefined, { numeric: true }));
}

/**
 * The /24 prefixes this server itself sits on.
 *
 * Scanning what the machine is actually connected to beats asking an admin to
 * type a subnet — the address they know is usually the device's old one, which
 * is exactly the thing that is wrong.
 */
export async function localSubnetPrefixes(): Promise<string[]> {
  const { networkInterfaces } = await import('node:os');
  const prefixes = new Set<string>();

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      prefixes.add(address.address.split('.').slice(0, 3).join('.'));
    }
  }

  return [...prefixes];
}
