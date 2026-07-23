import { getEnv } from '@/lib/cloudflare';
import { loadPublicChallengeSchedule } from '@/lib/challenge-data';
import { jsonError } from '@/lib/assessment';

export async function GET(): Promise<Response> {
  try {
    const env = await getEnv();
    const schedule = await loadPublicChallengeSchedule(env.DB);
    return Response.json(schedule, {
      headers: {
        'cache-control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
