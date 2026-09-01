import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AdminRoundCompletionPage } from '@/components/admin-round-completion-page';
import { createAuth } from '@/lib/auth';
import { getEnv } from '@/lib/cloudflare';
import { hasAdministratorAccess } from '@/lib/assessment';
import { getAdminRoundCompletion } from '@/lib/admin-round-completion';
import { privatePageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata('Challenge completion');

export default async function AdminRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const returnTo = `/admin/rounds/${encodeURIComponent(id)}`;
  const session = await (await createAuth()).api.getSession({ headers: await headers() });
  if (!session) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);

  const env = await getEnv();
  if (!(await hasAdministratorAccess(env.DB, session.user.email))) redirect('/dashboard');
  const completion = await getAdminRoundCompletion(env.DB, id);
  if (!completion) notFound();

  return <AdminRoundCompletionPage initialData={completion} />;
}
