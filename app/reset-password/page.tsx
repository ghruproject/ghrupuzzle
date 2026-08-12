import { ResetPasswordForm } from '@/components/reset-password-form';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Choose a new password',
  'Choose a new password for your GHRU Puzzles account.',
);

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
