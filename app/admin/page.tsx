import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';
import { createAuth } from '@/lib/auth';
import { getEnv } from '@/lib/cloudflare';
import { hasAdministratorAccess } from '@/lib/assessment';
import { privatePageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata('Administration');

export default async function AdminPage() {
  const session = await (await createAuth()).api.getSession({
    headers: await headers(),
  });
  if (!session) redirect('/sign-in?returnTo=%2Fadmin');

  const env = await getEnv();
  if (!(await hasAdministratorAccess(env.DB, session.user.email))) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminDashboard administratorName={session.user.name} />
    </div>
  );
}
