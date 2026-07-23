export function defaultNameFromEmail(email: string): string {
  const trimmedEmail = email.trim();
  const localPart = trimmedEmail.split('@')[0]?.trim();
  return localPart || trimmedEmail || 'Participant';
}
