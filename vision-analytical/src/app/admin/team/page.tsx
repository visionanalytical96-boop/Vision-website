import type { Metadata } from 'next';
import Link from 'next/link';
import {
  UsersRound,
  UserCheck,
  UserX,
  CalendarOff,
  Clock,
  Fingerprint,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { getTeamDashboard } from '@/lib/data/team';
import { formatDate, formatDateTime } from '@/lib/format';
import { DayCloseButton } from '@/components/team/DayCloseButton';

export const metadata: Metadata = { title: 'Team' };
export const dynamic = 'force-dynamic';

export default async function TeamDashboardPage() {
  const board = await getTeamDashboard();
  const { today, headcount } = board;
  const marked = headcount.total - today.notMarked;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {formatDate(new Date(`${board.dayKey}T00:00:00Z`))}
            {board.holidayName ? ` · ${board.holidayName}` : board.isDayOff ? ' · Weekly off' : ''}
          </p>
          <p className="mt-1 text-sm text-muted">
            {headcount.total === 0
              ? 'No employees on record yet.'
              : `${marked} of ${headcount.total} marked today · ${headcount.office} office, ${headcount.field} field`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/team/attendance" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Attendance register
          </Link>
          <Link href="/admin/team/employees/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            Add employee
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees" value={headcount.total} icon={<UsersRound className="h-5 w-5" />} />
        <StatCard
          label="Present today"
          value={today.present + today.late + today.halfDay}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard label="Absent today" value={today.absent} icon={<UserX className="h-5 w-5" />} />
        <StatCard label="On leave today" value={today.onLeave} icon={<CalendarOff className="h-5 w-5" />} />
      </div>

      {/* An unmarked day is not an absent day. Saying so, rather than counting
          the gap as absence, is what keeps the number on this page true. */}
      {headcount.total > 0 && today.notMarked > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {today.notMarked} {today.notMarked === 1 ? 'employee has' : 'employees have'} no attendance for{' '}
                  {board.dayKey}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Nobody is counted absent until the day is closed. Import from the device, mark them by hand, or close
                  the day to fill the gaps.
                </p>
              </div>
            </div>
            <DayCloseButton dayKey={board.dayKey} count={today.notMarked} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today at a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { label: 'On time', value: today.present, tone: 'success' as const },
              { label: 'Late', value: today.late, tone: 'warning' as const },
              { label: 'Half day', value: today.halfDay, tone: 'warning' as const },
              { label: 'Absent', value: today.absent, tone: 'danger' as const },
              { label: 'On leave', value: today.onLeave, tone: 'info' as const },
              { label: 'Not marked', value: today.notMarked, tone: 'neutral' as const },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-muted">{row.label}</span>
                <Badge tone={row.tone} className="tabular-nums">
                  {row.value}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Away today</CardTitle>
            <CardDescription>Approved leave covering {board.dayKey}.</CardDescription>
          </CardHeader>
          <CardContent>
            {board.onLeaveToday.length === 0 ? (
              <p className="text-sm text-muted">Nobody is on approved leave today.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {board.onLeaveToday.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3">
                    <span className="text-foreground">{person.name}</span>
                    <span className="text-xs text-muted">{person.leaveType}</span>
                  </li>
                ))}
              </ul>
            )}
            {board.pendingLeave > 0 && (
              <Link
                href="/admin/team/leave"
                className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline dark:text-secondary"
              >
                {board.pendingLeave} request{board.pendingLeave === 1 ? '' : 's'} waiting
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance devices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {board.devices.total === 0 ? (
              <>
                <p className="text-muted">No device configured yet.</p>
                <Link
                  href="/admin/team/devices"
                  className="inline-flex items-center gap-1 text-primary hover:underline dark:text-secondary"
                >
                  <Fingerprint className="h-4 w-4" />
                  Add a device
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Reachable</span>
                  <Badge tone={board.devices.online === board.devices.total ? 'success' : 'warning'}>
                    {board.devices.online} of {board.devices.total}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Last sync</span>
                  <span className="text-foreground">
                    {board.devices.lastSyncAt ? formatDateTime(board.devices.lastSyncAt) : 'Never'}
                  </span>
                </div>
                {board.unprocessedPunches > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Punches waiting</span>
                    <Badge tone="warning" className="tabular-nums">
                      {board.unprocessedPunches}
                    </Badge>
                  </div>
                )}
                <Link
                  href="/admin/team/devices"
                  className="inline-flex items-center gap-1 text-primary hover:underline dark:text-secondary"
                >
                  Device settings
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming holidays</CardTitle>
          </CardHeader>
          <CardContent>
            {board.upcomingHolidays.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing left on the calendar this year.{' '}
                <Link href="/admin/team/holidays" className="text-primary hover:underline dark:text-secondary">
                  Add holidays
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {board.upcomingHolidays.map((holiday) => (
                  <li key={holiday.id} className="flex items-center justify-between gap-3">
                    <span className="text-foreground">{holiday.name}</span>
                    <span className="text-xs text-muted">
                      {formatDate(holiday.date)}
                      {holiday.isOptional ? ' · optional' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent attendance changes</CardTitle>
            <CardDescription>Every edit to an attendance record is logged.</CardDescription>
          </CardHeader>
          <CardContent>
            {board.recentEdits.length === 0 ? (
              <p className="text-sm text-muted">No attendance has been edited yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {board.recentEdits.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    <div>
                      <p className="text-foreground">{entry.summary}</p>
                      <p className="text-xs text-muted">
                        {entry.actorLabel} · {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/team/activity"
              className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline dark:text-secondary"
            >
              Full activity log
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
