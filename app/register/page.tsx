import { RegistrationForm } from '@/components/registration-form';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Create account',
  'Create a GHRU Puzzles participant account with an email address and password.',
);

export default function RegisterPage() {
  return <RegistrationForm />;
}
