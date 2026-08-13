import type { Metadata } from 'next';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { DeviceForm } from '@/components/team/DeviceForm';
import { PunchImportForm } from '@/components/team/PunchImportForm';
import { getBiometricDevices, getUnprocessedPunches } from '@/lib/data/team';
import { deleteBiometricDevice, testBiometricDevice, processPendingPunches } from '@/lib/actions/admin-team';
import { formatDateTime } from '@/lib/format';
import { punchDirectionMeta } from '@/lib/team-labels';

export const metadata: Metadata = { title: 'Device Settings' };
export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const [devices, pending] = await Promise.all([getBiometricDevices(), getUnprocessedPunches(50)]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Attendance devices</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Devices sit on your LAN and are reached over TCP/IP. Test connection tells you whether the device is
          reachable at that address and port — the thing that is actually wrong most of the time.
        </p>
      </div>

      {devices.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Device</TableHeaderCell>
              <TableHeaderCell>Address</TableHeaderCell>
              <TableHeaderCell>Punches</TableHeaderCell>
              <TableHeaderCell>Last check</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell>
                  {device.name}
                  <p className="text-xs text-muted">
                    {device.model}
                    {device.serialNumber ? ` · ${device.serialNumber}` : ''}
                  </p>
                  {!device.isActive && (
                    <Badge tone="neutral" className="mt-1">
                      Disabled
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {device.host}:{device.port}
                </TableCell>
                <TableCell className="tabular-nums">{device._count.punches}</TableCell>
                <TableCell>
                  {device.lastSyncAt ? (
                    <>
                      <Badge tone={device.lastSyncOk ? 'success' : 'danger'}>
                        {device.lastSyncOk ? 'Reachable' : 'Unreachable'}
                      </Badge>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(device.lastSyncAt)}</p>
                      {device.lastSyncNote && <p className="text-xs text-muted">{device.lastSyncNote}</p>}
                    </>
                  ) : (
                    <span className="text-xs text-muted">Never tested</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <form action={testBiometricDevice}>
                      <input type="hidden" name="id" value={device.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Test connection
                      </Button>
                    </form>
                    <form action={deleteBiometricDevice}>
                      <input type="hidden" name="id" value={device.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Remove ${device.name}? Punches already imported from it are kept.`}
                        className="text-xs text-danger hover:underline"
                      >
                        Remove
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a device</CardTitle>
        </CardHeader>
        <CardContent>
          <DeviceForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import punches</CardTitle>
          <CardDescription>
            Export the punch log from the device software and upload it here. Rows are matched to employees by their
            biometric device ID, and re-uploading an overlapping export can&apos;t create duplicates — the same scan is
            rejected by the database, not by guesswork.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PunchImportForm devices={devices.map((device) => ({ id: device.id, name: device.name }))} />
          <div className="rounded-lg bg-surface-muted p-4 text-sm text-muted">
            <p className="font-medium text-foreground">Expected columns</p>
            <p className="mt-1">
              A device ID, a timestamp and optionally a direction — for example{' '}
              <code className="text-xs">User ID, Date Time, Status</code>. Column order is read from the header row
              when one is present. Times are read as office-clock time.
            </p>
          </div>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Punches waiting to be processed</CardTitle>
            <CardDescription>
              Usually a device ID that isn&apos;t mapped to anyone yet. Set the biometric ID on that employee, then run
              this again — the punch is kept until it can be matched, not discarded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={processPendingPunches}>
              <Button type="submit" variant="outline" size="sm">
                Match and process
              </Button>
            </form>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Device ID</TableHeaderCell>
                  <TableHeaderCell>Punched at</TableHeaderCell>
                  <TableHeaderCell>Direction</TableHeaderCell>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pending.map((punch) => (
                  <TableRow key={punch.id}>
                    <TableCell className="tabular-nums">{punch.biometricId}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(punch.punchedAt)}</TableCell>
                    <TableCell>{punchDirectionMeta[punch.direction]}</TableCell>
                    <TableCell>
                      {punch.employee?.name ?? <Badge tone="warning">Not mapped</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted">{punch.device?.name ?? punch.importNote ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About automatic sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            Pulling records straight off the device needs its manufacturer&apos;s binary protocol over TCP. That adapter
            is not written yet, because it can&apos;t be tested honestly without the hardware on the network — and an
            attendance importer that has never talked to a real device is worse than none.
          </p>
          <p>
            The path around it is complete: import produces exactly the same punch rows, through the same parser,
            duplicate detection and attendance engine. When the adapter lands it feeds the same pipeline, and nothing
            else has to change.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
