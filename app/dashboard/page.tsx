import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAuth } from '@/lib/auth';
import { DashboardClient } from '@/components/dashboard-client';
import { defaultNameFromEmail } from '@/lib/profile';
import { privatePageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata('Participant dashboard');

export default async function DashboardPage() {
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/sign-in');
  }
  const displayName = session.user.name?.trim() || defaultNameFromEmail(session.user.email);
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <DashboardClient initialName={displayName} email={session.user.email} />
    </div>
  );
}
