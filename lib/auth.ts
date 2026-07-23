import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { getEnv } from './cloudflare';
import { sendMagicLinkEmail } from './postmark';

export async function createAuth() {
  const env = await getEnv();
  return betterAuth({
    appName: 'GHRU Puzzles',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/magic-link': { window: 60, max: 5 },
        '/sign-in/social': { window: 60, max: 10 },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 15,
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(
            { token: env.POSTMARK_SERVER_TOKEN, from: env.POSTMARK_FROM_EMAIL },
            email,
            url,
          );
        },
      }),
      nextCookies(),
    ],
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;
