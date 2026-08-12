import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canGrantAdministratorAccess,
  isAccountEmailVerified,
  isAdministratorEmailReserved,
} from '../lib/identity-policy';

test('administrator-reserved addresses cannot be claimed by public registration', async () => {
  const db = identityDatabase({
    administratorEmails: ['admin@example.org'],
    users: [],
  });
  assert.equal(await isAdministratorEmailReserved(db, ' ADMIN@example.org '), true);
  assert.equal(await isAdministratorEmailReserved(db, 'public@example.org'), false);
});

test('account confirmation accepts database booleans and integer flags', async () => {
  const db = identityDatabase({
    administratorEmails: [],
    users: [
      { id: 'confirmed-int', email: 'one@example.org', emailVerified: 1 },
      { id: 'confirmed-bool', email: 'two@example.org', emailVerified: true },
      { id: 'public', email: 'public@example.org', emailVerified: 0 },
    ],
  });
  assert.equal(await isAccountEmailVerified(db, 'confirmed-int'), true);
  assert.equal(await isAccountEmailVerified(db, 'confirmed-bool'), true);
  assert.equal(await isAccountEmailVerified(db, 'public'), false);
  assert.equal(await isAccountEmailVerified(db, 'missing'), false);
});

test('unconfirmed public accounts cannot be promoted to administrator', async () => {
  const db = identityDatabase({
    administratorEmails: [],
    users: [
      { id: 'public', email: 'public@example.org', emailVerified: 0 },
      { id: 'confirmed', email: 'confirmed@example.org', emailVerified: 1 },
    ],
  });
  assert.equal(await canGrantAdministratorAccess(db, 'public@example.org'), false);
  assert.equal(await canGrantAdministratorAccess(db, 'confirmed@example.org'), true);
  assert.equal(await canGrantAdministratorAccess(db, 'new@example.org'), true);
});

function identityDatabase({
  administratorEmails,
  users,
}: {
  administratorEmails: string[];
  users: Array<{
    id: string;
    email: string;
    emailVerified: number | boolean;
  }>;
}): D1Database {
  return {
    prepare(query: string) {
      return {
        bind(value: unknown) {
          return {
            async first() {
              const candidate = String(value).trim().toLowerCase();
              if (query.includes('administrator_email')) {
                return administratorEmails.includes(candidate) ? { email: candidate } : null;
              }
              const user = query.includes('WHERE id =')
                ? users.find((entry) => entry.id === String(value))
                : users.find((entry) => entry.email.toLowerCase() === candidate);
              return user ? { emailVerified: user.emailVerified } : null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}
