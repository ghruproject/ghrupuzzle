const SETUP_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SETUP_CODE_LENGTH = 16;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const SETUP_CODE_TTL_HOURS = 24;

export function createPasswordSetupCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SETUP_CODE_LENGTH));
  const raw = Array.from(
    bytes,
    (byte) => SETUP_CODE_ALPHABET[byte & 31],
  ).join('');
  return raw.match(/.{1,4}/g)?.join('-') ?? raw;
}

export function normalisePasswordSetupCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function hashPasswordSetupCode(value: string): Promise<string> {
  const normalised = normalisePasswordSetupCode(value);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalised),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function validateParticipantPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must contain no more than ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}

export function normaliseSignInEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

export function passwordSetupExpiry(now = new Date()): string {
  return new Date(
    now.getTime() + SETUP_CODE_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

export function isPasswordSetupOriginAllowed(
  suppliedOrigin: string | null,
  publicSiteUrl: string,
): boolean {
  if (!suppliedOrigin) return true;
  try {
    return new URL(suppliedOrigin).origin === new URL(publicSiteUrl).origin;
  } catch {
    return false;
  }
}

export async function passwordSetupRateLimitKey(
  secret: string,
  request: Request,
  email: string,
  now = Date.now(),
): Promise<string> {
  const ip = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const bucket = Math.floor(now / (15 * 60 * 1000));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${secret}:${ip}:${email}`),
  );
  const identity = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `password-setup:${bucket}:${identity}`;
}
