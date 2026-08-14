'use client';

import { useActionState } from 'react';
import { Radar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { scanForBiometricDevices, type DeviceScanState } from '@/lib/actions/admin-team';

/**
 * Finds terminals on the networks this server is attached to.
 *
 * Deliberately reports what it searched as well as what it found. "Nothing
 * found" on its own is ambiguous — it could mean the device is off, or that
 * the server never looked at the network the device is on, which is the more
 * common and much less obvious case.
 */
export function DeviceScanner({ defaultSubnet }: { defaultSubnet?: string }) {
  const [state, formAction, pending] = useActionState<DeviceScanState | undefined, FormData>(
    scanForBiometricDevices,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="subnet" className="text-xs font-medium text-muted">
            Network to search
          </label>
          <Input
            id="subnet"
            name="subnet"
            placeholder="192.168.1"
            defaultValue={defaultSubnet}
            className="h-9 w-40 font-mono text-sm"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          {pending ? 'Scanning…' : 'Scan for devices'}
        </Button>
      </div>
      <p className="text-xs text-muted">
        The first three parts of the device&apos;s address — the same as this server&apos;s. Leave blank to search
        whatever networks the app container is on, though inside Docker those are usually not your LAN. Takes up to a
        minute; only devices that answer the protocol count.
      </p>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      {state?.scanned && (
        <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm">
          <p className="text-xs text-muted">
            Searched <span className="font-mono">{state.scanned.join(', ')}</span> on port 4370.
          </p>

          {state.found && state.found.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {state.found.map((device) => (
                <li key={`${device.host}:${device.port}`} className="text-foreground">
                  <span className="font-mono">
                    {device.host}:{device.port}
                  </span>
                  <span className="block text-xs text-muted">{device.label}</span>
                  <span className="block text-xs text-muted">
                    Copy this address into the Add a device form below.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 space-y-2 text-muted">
              <p className="font-medium text-foreground">No terminals answered on the range above.</p>
              <p>
                The usual cause is that the device sits on a different network from this server — a terminal left on an
                address from a previous install cannot be reached however correct the settings here are.
              </p>
              <p>
                On the terminal: <span className="font-medium text-foreground">Menu &gt; Comm &gt; Ethernet</span>, turn
                DHCP on, and restart it. The router then puts it on the same network as this server and it will show up
                in the next scan.
              </p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
