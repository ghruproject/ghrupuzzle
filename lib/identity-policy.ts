export async function isAdministratorEmailReserved(
  db: D1Database,
  email: string,
): Promise<boolean> {
  const row = await db.prepare(
    'SELECT email FROM administrator_email WHERE email = ? COLLATE NOCASE LIMIT 1',
  )
    .bind(email.trim().toLowerCase())
    .first();
  return Boolean(row);
}

export async function isAccountEmailVerified(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  const row = await db.prepare(
    'SELECT emailVerified FROM user WHERE id = ? LIMIT 1',
  )
    .bind(userId)
    .first<{ emailVerified: number | boolean }>();
  return row?.emailVerified === true || Number(row?.emailVerified ?? 0) === 1;
}

export async function canGrantAdministratorAccess(
  db: D1Database,
  email: string,
): Promise<boolean> {
  const row = await db.prepare(
    'SELECT emailVerified FROM user WHERE email = ? COLLATE NOCASE LIMIT 1',
  )
    .bind(email.trim().toLowerCase())
    .first<{ emailVerified: number | boolean }>();
  if (!row) return true;
  return row.emailVerified === true || Number(row.emailVerified) === 1;
}
