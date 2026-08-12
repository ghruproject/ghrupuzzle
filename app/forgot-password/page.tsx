import { ForgotPasswordForm } from '@/components/forgot-password-form';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Reset password',
  'Request a secure password-reset link for your GHRU Puzzles account.',
);

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
