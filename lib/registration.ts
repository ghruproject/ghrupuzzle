type RegistrationError = {
  code?: string;
  message?: string;
  status?: number;
  statusCode?: number;
};

export function normaliseRegistrationEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function registrationErrorMessage(error: RegistrationError): string {
  const code = error.code?.toUpperCase();
  const message = error.message?.toLowerCase() ?? '';
  const status = error.status ?? error.statusCode;

  if (code === 'INVALID_EMAIL' || message.includes('invalid email')) {
    return 'Enter a valid email address.';
  }
  if (code === 'PASSWORD_TOO_SHORT' || message.includes('password too short')) {
    return 'Use at least 12 characters for the password.';
  }
  if (code === 'PASSWORD_TOO_LONG' || message.includes('password too long')) {
    return 'Use no more than 128 characters for the password.';
  }
  if (
    code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ||
    code === 'USER_ALREADY_EXISTS' ||
    message.includes('already exists')
  ) {
    return 'An account already exists for this email address. Sign in or reset your password.';
  }
  if (status === 429 || code === 'TOO_MANY_REQUESTS' || message.includes('too many')) {
    return 'Too many signup attempts. Wait one minute and try again.';
  }
  if (message.includes('name') && (message.includes('character') || message.includes('length'))) {
    return 'Enter your name using 2–120 characters.';
  }

  return 'That account could not be created. Try again, or contact a GHRU Puzzles administrator if the problem continues.';
}
