import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { NewServiceRequestForm } from '@/components/forms/NewServiceRequestForm';
import { getSession } from '@/lib/dal';
import { getCustomerLinkableAmcContracts } from '@/lib/data/portal';

export const metadata: Metadata = { title: 'New Service Request' };

export default async function NewServiceRequestPage() {
  const session = await getSession();
  const amcContracts = session ? await getCustomerLinkableAmcContracts(session.userId) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raise a service request</CardTitle>
        <CardDescription>We&rsquo;ll assign an engineer and keep you updated here.</CardDescription>
      </CardHeader>
      <CardContent>
        <NewServiceRequestForm amcContracts={amcContracts} />
      </CardContent>
    </Card>
  );
}
