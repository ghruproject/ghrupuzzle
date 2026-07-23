interface PostmarkConfig {
  token: string;
  from: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  tag: string;
}

export async function sendMagicLinkEmail(
  config: PostmarkConfig,
  recipient: string,
  url: string,
): Promise<void> {
  await sendEmail(config, {
    to: recipient,
    subject: 'Sign in to GHRU Puzzles',
    textBody: `Use this single-use link to sign in to GHRU Puzzles:\n\n${url}\n\nThe link expires in 15 minutes.`,
    htmlBody: `<p>Use this single-use link to sign in to GHRU Puzzles:</p><p><a href="${escapeHtml(url)}">Continue to GHRU Puzzles</a></p><p>This link expires in 15 minutes.</p>`,
    tag: 'authentication',
  });
}

export async function sendChallengeOpeningEmail(
  config: PostmarkConfig,
  recipient: string,
  challengeUrl: string,
  dateLabel: string,
): Promise<string | null> {
  return sendEmail(config, {
    to: recipient,
    subject: 'The GHRU Challenge is now open',
    textBody: `The GHRU Challenge is now open and runs ${dateLabel}.\n\nSign in, review the challenge information, and begin when you are ready:\n${challengeUrl}\n\nYou received this one-off reminder because you registered for GHRU Challenge updates.`,
    htmlBody: `<p>The GHRU Challenge is now open and runs <strong>${escapeHtml(dateLabel)}</strong>.</p><p><a href="${escapeHtml(challengeUrl)}">Open the GHRU Challenge</a></p><p>You received this one-off reminder because you registered for GHRU Challenge updates.</p>`,
    tag: 'challenge-opening',
  });
}

async function sendEmail(
  config: PostmarkConfig,
  message: EmailMessage,
): Promise<string | null> {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': config.token,
    },
    body: JSON.stringify({
      From: config.from,
      To: message.to,
      Subject: message.subject,
      TextBody: message.textBody,
      HtmlBody: message.htmlBody,
      MessageStream: 'outbound',
      TrackLinks: 'None',
      TrackOpens: false,
      Tag: message.tag,
    }),
  });
  const result = (await response.json()) as {
    ErrorCode?: number;
    Message?: string;
    MessageID?: string;
  };
  if (!response.ok || result.ErrorCode !== 0) {
    throw new Error(`Postmark rejected email: ${result.Message ?? response.status}`);
  }
  return result.MessageID ?? null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
