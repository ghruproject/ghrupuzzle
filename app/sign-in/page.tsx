import { SignInForm } from '@/components/sign-in-form';
import { getEnv } from '@/lib/cloudflare';
import { privatePageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata(
  'Sign in',
  'Sign in to submit practice results, participate in challenges and access certificates.',
);

export default async function SignInPage() {
  const env = await getEnv();
  return (
    <SignInForm
      googleEnabled={Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)}
      microsoftEnabled={Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET)}
    />
  );
}
