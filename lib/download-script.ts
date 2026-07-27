import type { ParticipantDownloadFile } from './participant-files';

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function tokenMessage(releaseId: string, filename: string, expiresAt: number): string {
  return `${releaseId}\n${filename}\n${expiresAt}`;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createParticipantDownloadToken(
  secret: string,
  releaseId: string,
  filename: string,
  expiresAt: number,
): Promise<string> {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    encoder.encode(tokenMessage(releaseId, filename, expiresAt)),
  );
  return `${expiresAt}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyParticipantDownloadToken(
  secret: string,
  releaseId: string,
  filename: string,
  token: string,
  now = Date.now(),
): Promise<boolean> {
  const [expiresText, signatureText, extra] = token.split('.');
  const expiresAt = Number(expiresText);
  if (extra !== undefined || !Number.isSafeInteger(expiresAt) || expiresAt < now) return false;
  try {
    const normalized = signatureText.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const signature = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    return crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      signature,
      encoder.encode(tokenMessage(releaseId, filename, expiresAt)),
    );
  } catch {
    return false;
  }
}

export function participantFileUrl(
  publicOrigin: string,
  releaseId: string,
  filename: string,
  token?: string,
): string {
  const url = new URL(
    `/api/releases/${encodeURIComponent(releaseId)}/files/${encodeURIComponent(filename)}`,
    publicOrigin,
  );
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

export function buildBulkDownloadScript(options: {
  tool: 'curl' | 'wget';
  releaseId: string;
  files: ParticipantDownloadFile[];
  fileUrl: (filename: string) => string;
}): string {
  const directory = options.releaseId.replace(/[^A-Za-z0-9._-]/g, '_');
  const hasChecksums = options.files.some((file) => file.sha256);
  const verificationFunction = hasChecksums
    ? [
        'verify_sha256() {',
        '  local file_path="$1"',
        '  local expected_sha256="$2"',
        '  if command -v sha256sum >/dev/null 2>&1; then',
        '    printf \'%s  %s\\n\' "$expected_sha256" "$file_path" | sha256sum -c - >/dev/null 2>&1',
        '  elif command -v shasum >/dev/null 2>&1; then',
        '    printf \'%s  %s\\n\' "$expected_sha256" "$file_path" | shasum -a 256 -c - >/dev/null 2>&1',
        '  else',
        "    echo 'No SHA-256 checker was found. Install sha256sum or use a system with shasum.' >&2",
        '    return 1',
        '  fi',
        '}',
        '',
      ]
    : [];
  const downloadFunction =
    options.tool === 'curl'
      ? [
          'download_file() {',
          '  local output="$1"',
          '  local url="$2"',
          '  local expected_sha256="$3"',
          '  local temporary="${output}.part"',
          '  local attempt',
          '  if [ -f "$output" ] && { [ -z "$expected_sha256" ] || verify_sha256 "$output" "$expected_sha256"; }; then',
          '    echo "Already verified: $output"',
          '    return 0',
          '  fi',
          '  for attempt in 1 2 3 4 5 6; do',
          '    if curl --fail --location --retry 2 --retry-delay 2 --connect-timeout 30 --output "$temporary" "$url" \\',
          '      && { [ -z "$expected_sha256" ] || verify_sha256 "$temporary" "$expected_sha256"; }; then',
          '      mv -f "$temporary" "$output"',
          '      echo "Downloaded and verified: $output"',
          '      return 0',
          '    fi',
          '    rm -f "$temporary"',
          '    echo "Retrying $output after a failed or incomplete download (attempt $attempt of 6)." >&2',
          '    sleep 2',
          '  done',
          '  echo "Could not download and verify $output." >&2',
          '  return 1',
          '}',
          '',
        ]
      : [
          'download_file() {',
          '  local output="$1"',
          '  local url="$2"',
          '  local expected_sha256="$3"',
          '  local temporary="${output}.part"',
          '  local attempt',
          '  if [ -f "$output" ] && { [ -z "$expected_sha256" ] || verify_sha256 "$output" "$expected_sha256"; }; then',
          '    echo "Already verified: $output"',
          '    return 0',
          '  fi',
          '  for attempt in 1 2 3 4 5 6; do',
          '    if wget --tries=3 --timeout=30 --output-document="$temporary" "$url" \\',
          '      && { [ -z "$expected_sha256" ] || verify_sha256 "$temporary" "$expected_sha256"; }; then',
          '      mv -f "$temporary" "$output"',
          '      echo "Downloaded and verified: $output"',
          '      return 0',
          '    fi',
          '    rm -f "$temporary"',
          '    echo "Retrying $output after a failed or incomplete download (attempt $attempt of 6)." >&2',
          '    sleep 2',
          '  done',
          '  echo "Could not download and verify $output." >&2',
          '  return 1',
          '}',
          '',
        ];
  const downloadLines = options.files.map((file) => {
    const output = shellQuote(file.filename);
    const url = shellQuote(options.fileUrl(file.filename));
    return `download_file ${output} ${url} ${shellQuote(file.sha256 ?? '')}`;
  });
  const checksumLines = options.files
    .filter((file) => file.sha256)
    .map((file) => `${file.sha256}  ${file.filename}`);
  const checksumBlock = checksumLines.length
    ? [
        '',
        "cat > checksums.sha256 <<'GHRUPUZZLES_CHECKSUMS'",
        ...checksumLines,
        'GHRUPUZZLES_CHECKSUMS',
        '',
        'if command -v sha256sum >/dev/null 2>&1; then',
        '  sha256sum -c checksums.sha256',
        'elif command -v shasum >/dev/null 2>&1; then',
        '  shasum -a 256 -c checksums.sha256',
        'else',
        "  echo 'Downloads complete, but no SHA-256 checker was found.' >&2",
        "  echo 'Install sha256sum or run: shasum -a 256 -c checksums.sha256' >&2",
        '  exit 1',
        'fi',
        "echo 'Downloads and SHA-256 verification complete.'",
      ]
    : ['', "echo 'Downloads complete.'"];

  return [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    `mkdir -p ${shellQuote(directory)}`,
    `cd ${shellQuote(directory)}`,
    '',
    ...verificationFunction,
    ...downloadFunction,
    ...downloadLines,
    ...checksumBlock,
    '',
  ].join('\n');
}
