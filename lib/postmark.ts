interface PostmarkConfig {
  token: string;
  from: string;
}

export async function sendMagicLinkEmail(
  config: PostmarkConfig,
  recipient: string,
  url: string,
): Promise<void> {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': config.token,
    },
    body: JSON.stringify({
      From: config.from,
      To: recipient,
      Subject: 'Sign in to GHRU Puzzles',
      TextBody: `Use this single-use link to sign in to GHRU Puzzles:\n\n${url}\n\nThe link expires in 15 minutes.`,
      HtmlBody: `<p>Use this single-use link to sign in to GHRU Puzzles:</p><p><a href="${escapeHtml(url)}">Continue to GHRU Puzzles</a></p><p>This link expires in 15 minutes.</p>`,
      MessageStream: 'outbound',
      TrackLinks: 'None',
      TrackOpens: false,
      Tag: 'authentication',
    }),
  });
  const result = (await response.json()) as { ErrorCode?: number; Message?: string };
  if (!response.ok || result.ErrorCode !== 0) {
    throw new Error(`Postmark rejected magic-link email: ${result.Message ?? response.status}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
