// The OpenNext worker is generated during `npm run cf:build`.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore generated build output is unavailable before the first Cloudflare build
import handler from './.open-next/worker.js';
import { sendChallengeOpeningReminders } from './lib/challenge-reminders';
import type { CloudflareEnv } from './lib/cloudflare';

export default {
  fetch: handler.fetch,
  async scheduled(
    _event: ScheduledController,
    env: CloudflareEnv,
    context: ExecutionContext,
  ): Promise<void> {
    context.waitUntil(sendChallengeOpeningReminders(env).then(() => undefined));
  },
} satisfies ExportedHandler<CloudflareEnv>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore generated build output is unavailable before the first Cloudflare build
export { DOQueueHandler, DOShardedTagCache } from './.open-next/worker.js';
