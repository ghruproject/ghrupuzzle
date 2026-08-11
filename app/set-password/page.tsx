import { PasswordSetupForm } from '@/components/password-setup-form';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Set password',
  'Use an administrator-issued code to set or reset a GHRU Puzzles password.',
);

export default function SetPasswordPage() {
  return <PasswordSetupForm />;
}
