import type { Metadata } from 'next';
import { NewEngineerForm } from '@/components/forms/NewEngineerForm';

export const metadata: Metadata = { title: 'New Engineer' };

export default function NewEngineerPage() {
  return <NewEngineerForm />;
}
