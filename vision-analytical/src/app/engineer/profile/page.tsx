import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { getCurrentUser } from '@/lib/dal';

export const metadata: Metadata = { title: 'Your Profile' };

export default async function EngineerProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
      </CardHeader>
      <CardContent>
        <ProfileForm defaultName={user.name} defaultPhone={user.phone ?? ''} defaultCompanyName={user.companyName ?? ''} email={user.email} />
      </CardContent>
    </Card>
  );
}
