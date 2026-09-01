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

const SITE_URL = 'https://ghrupuzzle.vercel.app';
const EMAIL_LOGO_URL = `${SITE_URL}/email-logo.png`;

export async function sendMagicLinkEmail(
  config: PostmarkConfig,
  recipient: string,
  url: string,
): Promise<void> {
  await sendEmail(config, {
    to: recipient,
    subject: 'Your GHRUPUZZLES sign-in link',
    textBody: [
      'Sign in to GHRUPUZZLES',
      '',
      'Use this secure, single-use link to sign in:',
      url,
      '',
      'The link expires in 15 minutes and can only be used once.',
      '',
      'If you did not request this email, you can safely ignore it.',
    ].join('\n'),
    htmlBody: renderBrandedEmail({
      preheader: 'Your secure GHRUPUZZLES sign-in link expires in 15 minutes.',
      eyebrow: 'Secure sign in',
      heading: 'Sign in to GHRUPUZZLES',
      introduction:
        'Use the button below to access your participant dashboard. This link is tied to your email address.',
      buttonLabel: 'Continue to GHRUPUZZLES',
      buttonUrl: url,
      noticeTitle: 'Single-use link',
      notice:
        'For your security, this link expires in 15 minutes and stops working after it has been used.',
      closing: 'If you did not request this email, you can safely ignore it.',
    }),
    tag: 'authentication',
  });
}

export async function sendPasswordResetEmail(
  config: PostmarkConfig,
  recipient: string,
  url: string,
): Promise<void> {
  await sendEmail(config, {
    to: recipient,
    subject: 'Reset your GHRUPUZZLES password',
    textBody: [
      'Reset your GHRUPUZZLES password',
      '',
      'Use this secure, single-use link to choose a new password:',
      url,
      '',
      'The link expires in one hour and can only be used once.',
      '',
      'If you did not request this email, you can safely ignore it.',
    ].join('\n'),
    htmlBody: renderBrandedEmail({
      preheader: 'Your GHRUPUZZLES password-reset link expires in one hour.',
      eyebrow: 'Account recovery',
      heading: 'Reset your password',
      introduction: 'Use the button below to choose a new password for your GHRUPUZZLES account.',
      buttonLabel: 'Reset password',
      buttonUrl: url,
      noticeTitle: 'Single-use link',
      notice: 'For your security, this link expires in one hour and stops working after it has been used.',
      closing: 'If you did not request this email, you can safely ignore it.',
    }),
    tag: 'password-reset',
  });
}

export async function sendChallengeOpeningEmail(
  config: PostmarkConfig,
  recipient: string,
  challengeUrl: string,
  challengeTitle: string,
  dateLabel: string,
): Promise<string | null> {
  return sendEmail(config, {
    to: recipient,
    subject: `${challengeTitle} is now open`,
    textBody: `${challengeTitle} is now open and runs ${dateLabel}.\n\nSign in and begin when you are ready:\n${challengeUrl}\n\nYou received this one-off reminder because you registered for this challenge.`,
    htmlBody: renderBrandedEmail({
      preheader: `${challengeTitle} is now open.`,
      eyebrow: 'Challenge open',
      heading: `${challengeTitle} is now open`,
      introduction: `The challenge runs ${dateLabel}. Sign in and begin when you are ready.`,
      buttonLabel: 'Open the challenge',
      buttonUrl: challengeUrl,
      noticeTitle: 'Opening-day reminder',
      notice: 'You received this one-off email because you signed up for this challenge.',
      closing: 'Good luck with the challenge.',
    }),
    tag: 'challenge-opening',
  });
}

export async function sendCertificateIssuedEmail(
  config: PostmarkConfig,
  recipient: string,
  participantName: string,
  roundTitle: string,
  dashboardUrl: string,
  verificationUrl: string,
): Promise<string | null> {
  return sendEmail(config, {
    to: recipient,
    subject: `Your GHRUPUZZLES ${roundTitle} certificate`,
    textBody: [
      `Congratulations, ${participantName}.`,
      '',
      `Your achievement certificate for ${roundTitle} is ready.`,
      '',
      'Sign in to view and download your certificate:',
      dashboardUrl,
      '',
      'Your certificate can also be verified publicly:',
      verificationUrl,
    ].join('\n'),
    htmlBody: renderBrandedEmail({
      preheader: `Your ${roundTitle} achievement certificate is ready.`,
      eyebrow: 'Achievement certificate',
      heading: 'Your certificate is ready',
      introduction: `Congratulations, ${participantName}. Your achievement certificate for ${roundTitle} is now available in your participant dashboard.`,
      buttonLabel: 'View and download certificate',
      buttonUrl: dashboardUrl,
      noticeTitle: 'Public verification',
      notice: `Your certificate has a unique verification record at ${verificationUrl}`,
      closing: 'Thank you for taking part in GHRUPUZZLES.',
    }),
    tag: 'certificate-issued',
  });
}

interface BrandedEmailContent {
  preheader: string;
  eyebrow: string;
  heading: string;
  introduction: string;
  buttonLabel: string;
  buttonUrl: string;
  noticeTitle: string;
  notice: string;
  closing: string;
}

export function renderBrandedEmail(content: BrandedEmailContent): string {
  const buttonUrl = escapeHtml(content.buttonUrl);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(content.heading)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .email-body { padding: 32px 24px !important; }
        .email-header { padding: 24px !important; }
        .email-button { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f1f5f9; color:#1e293b; font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(content.preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f1f5f9;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table class="email-shell" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:600px; background:#ffffff; border:1px solid #dbe3ed; border-radius:16px; overflow:hidden;">
            <tr>
              <td class="email-header" style="padding:28px 36px; background:#0f172a;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-right:14px; vertical-align:middle;">
                      <img src="${EMAIL_LOGO_URL}" width="48" height="48" alt="" style="display:block; width:48px; height:48px; border:0; border-radius:10px;">
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:20px; line-height:24px; font-weight:800; letter-spacing:0.8px; color:#f8fafc;">GHRUPUZZLES</div>
                      <div style="margin-top:3px; font-size:13px; line-height:18px; color:#9fb0c5;">Microbial genome benchmarking exercises</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-body" style="padding:42px 44px 38px;">
                <div style="margin-bottom:12px; font-size:12px; line-height:18px; font-weight:800; letter-spacing:1.8px; text-transform:uppercase; color:#0d9488;">
                  ${escapeHtml(content.eyebrow)}
                </div>
                <h1 style="margin:0 0 18px; font-size:30px; line-height:38px; color:#0f172a; font-weight:800;">
                  ${escapeHtml(content.heading)}
                </h1>
                <p style="margin:0 0 28px; font-size:16px; line-height:25px; color:#475569;">
                  ${escapeHtml(content.introduction)}
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                  <tr>
                    <td style="border-radius:10px; background:#14b8a6;">
                      <a class="email-button" href="${buttonUrl}" style="display:inline-block; padding:14px 22px; border-radius:10px; color:#071b1b; font-size:16px; line-height:20px; font-weight:800; text-decoration:none;">
                        ${escapeHtml(content.buttonLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin:0 0 26px; background:#ecfdfb; border:1px solid #99f6e4; border-radius:10px;">
                  <tr>
                    <td style="padding:16px 18px; font-size:14px; line-height:22px; color:#315b58;">
                      <strong style="color:#134e4a;">${escapeHtml(content.noticeTitle)}</strong><br>
                      ${escapeHtml(content.notice)}
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 22px; font-size:14px; line-height:22px; color:#64748b;">
                  ${escapeHtml(content.closing)}
                </p>
                <p style="margin:0; padding-top:20px; border-top:1px solid #e2e8f0; font-size:12px; line-height:19px; color:#94a3b8;">
                  Button not working? Copy and paste this address into your browser:<br>
                  <a href="${buttonUrl}" style="color:#0d9488; text-decoration:underline; word-break:break-all;">${buttonUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; line-height:18px; color:#64748b;">
                <a href="${SITE_URL}" style="color:#0d9488; font-weight:700; text-decoration:none;">ghrupuzzle.vercel.app</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
