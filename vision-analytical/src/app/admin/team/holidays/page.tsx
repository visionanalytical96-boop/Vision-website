import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { HolidayForm } from '@/components/team/HolidayForm';
import { getHolidays, getHolidayYears } from '@/lib/data/team';
import { deleteHoliday } from '@/lib/actions/admin-team';
import { formatDate } from '@/lib/format';
import { weekdayName } from '@/lib/team-labels';

export const metadata: Metadata = { title: 'Holidays' };
export const dynamic = 'force-dynamic';

export default async function HolidaysPage({ searchParams }: PageProps<'/admin/team/holidays'>) {
  const params = await searchParams;
  const requested = Array.isArray(params.year) ? params.year[0] : params.year;
  const year = requested && /^\d{4}$/.test(requested) ? Number(requested) : new Date().getUTCFullYear();

  const [holidays, years] = await Promise.all([getHolidays(year), getHolidayYears()]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a holiday</CardTitle>
          <CardDescription>
            A day on the calendar changes how attendance is judged: nobody is marked absent, and anyone who does come in
            has their hours counted as overtime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HolidayForm defaultYear={year} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {years.map((value) => (
          <Link
            key={value}
            href={`/admin/team/holidays?year=${value}`}
            className={buttonVariants({ variant: value === year ? 'primary' : 'outline', size: 'sm' })}
          >
            {value}
          </Link>
        ))}
      </div>

      {holidays.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted">
          No holidays on the {year} calendar yet.
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Day</TableHeaderCell>
              <TableHeaderCell>Holiday</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell className="whitespace-nowrap">{formatDate(holiday.date)}</TableCell>
                <TableCell className="text-muted">{weekdayName(holiday.date.getUTCDay())}</TableCell>
                <TableCell>{holiday.name}</TableCell>
                <TableCell>
                  <Badge tone={holiday.isOptional ? 'neutral' : 'info'}>
                    {holiday.isOptional ? 'Optional' : 'Company holiday'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <form action={deleteHoliday}>
                    <input type="hidden" name="id" value={holiday.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Remove ${holiday.name} from the calendar? Attendance already recorded for that day keeps its status.`}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </ConfirmSubmitButton>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="text-sm text-muted">
        Only the three national holidays with fixed dates are seeded. Festival dates move with the lunar calendar every
        year, so they are added here rather than guessed.
      </p>
    </div>
  );
}
