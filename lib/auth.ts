import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { getEnv } from './cloudflare';
import { isAdministratorEmailReserved } from './identity-policy';
import { sendMagicLinkEmail } from './postmark';

export async function createAuth() {
  const env = await getEnv();
  const socialProviders = {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET
      ? {
          microsoft: {
            clientId: env.MICROSOFT_CLIENT_ID,
            clientSecret: env.MICROSOFT_CLIENT_SECRET,
            tenantId: env.MICROSOFT_TENANT_ID || 'common',
          },
        }
      : {}),
  };
  return betterAuth({
    appName: 'GHRU Puzzles',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/magic-link': { window: 60, max: 5 },
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
        '/sign-in/social': { window: 60, max: 10 },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    socialProviders,
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            if (
              context?.path === '/sign-up/email'
              && await isAdministratorEmailReserved(env.DB, user.email)
            ) {
              throw new APIError('FORBIDDEN', {
                message: 'This email address requires administrator-assisted setup.',
              });
            }
            const name = user.name.trim().replace(/\s+/g, ' ');
            if (name.length < 2 || name.length > 120) {
              throw new APIError('BAD_REQUEST', {
                message: 'Name must be between 2 and 120 characters.',
              });
            }
            return { data: { ...user, name } };
          },
        },
        update: {
          before: async (user) => {
            if (user.name === undefined) return;
            const name = user.name.trim().replace(/\s+/g, ' ');
            if (name.length < 2 || name.length > 120) {
              throw new APIError('BAD_REQUEST', {
                message: 'Name must be between 2 and 120 characters.',
              });
            }
            return { data: { ...user, name } };
          },
        },
      },
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
