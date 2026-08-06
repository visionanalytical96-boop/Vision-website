import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { NewServiceRequestForm } from '@/components/forms/NewServiceRequestForm';

export const metadata: Metadata = { title: 'New Service Request' };

export default function NewServiceRequestPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Raise a service request</CardTitle>
        <CardDescription>We&rsquo;ll assign an engineer and keep you updated here.</CardDescription>
      </CardHeader>
      <CardContent>
        <NewServiceRequestForm />
      </CardContent>
    </Card>
  );
}
