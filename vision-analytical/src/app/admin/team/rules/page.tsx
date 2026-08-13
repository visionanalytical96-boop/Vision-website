import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { AttendanceRuleForm } from '@/components/team/AttendanceRuleForm';
import { getAttendanceRule, getAttendancePolicy } from '@/lib/data/team';

export const metadata: Metadata = { title: 'Attendance Rules' };
export const dynamic = 'force-dynamic';

export default async function AttendanceRulesPage() {
  const [rule, policy] = await Promise.all([getAttendanceRule(), getAttendancePolicy()]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Attendance rules</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          These decide whether a day counts as present, late or half. Changing them affects days recorded from now on —
          the minutes already stored on past days are left alone, so a rule change cannot rewrite a month that payroll
          has already paid.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working day</CardTitle>
          <CardDescription>
            Times are the office clock in {policy.timezone}. The server runs UTC, so the zone is stored rather than
            assumed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceRuleForm rule={rule} fallback={policy} />
        </CardContent>
      </Card>
    </div>
  );
}
