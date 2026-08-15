'use client';

import { useActionState } from 'react';
import { updateProfile, type ProfileFormState } from '@/lib/actions/profile';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: ProfileFormState = {};

interface ProfileFormProps {
  defaultName: string;
  defaultPhone: string;
  defaultCompanyName: string;
  email: string;
}

export function ProfileForm({ defaultName, defaultPhone, defaultCompanyName, email }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField label="Email" htmlFor="email">
        <Input id="email" value={email} disabled />
      </FormField>
      <FormField label="Name" htmlFor="name" error={state.errors?.name} required>
        <Input id="name" name="name" defaultValue={defaultName} required />
      </FormField>
      <FormField label="Company" htmlFor="companyName" error={state.errors?.companyName}>
        <Input id="companyName" name="companyName" defaultValue={defaultCompanyName} />
      </FormField>
      <FormField label="Phone" htmlFor="phone" error={state.errors?.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={defaultPhone} />
      </FormField>

      {state.success && <p className="text-sm text-success">Profile updated.</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  );
}
