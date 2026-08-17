export function authCallbackURL(returnTo: string): string {
  const fragmentIndex = returnTo.indexOf('#');
  const callbackURL = fragmentIndex === -1
    ? returnTo
    : returnTo.slice(0, fragmentIndex);
  return callbackURL || '/dashboard';
}
