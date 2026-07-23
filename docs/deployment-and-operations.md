# Deployment and assessment operations

The application is configured for Next.js 15.5, Better Auth, OpenNext,
Cloudflare Workers, D1, two R2 data buckets, and an R2 incremental build cache.
Use Node.js 22.12 or newer for local and CI builds.

Production runs as the `ghrupuzzle` Cloudflare Worker in the
`nabil@happykhan.com` account. The D1 database and three R2 buckets named below
are provisioned and bound in `wrangler.jsonc`. Vercel proxies the Worker at the
canonical public URL, `https://ghrupuzzle.vercel.app`.

## Provision Cloudflare resources

Authenticate Wrangler, then create the resources once:

```bash
npx wrangler d1 create ghrupuzzle
npx wrangler r2 bucket create ghrupuzzle-practice
npx wrangler r2 bucket create ghrupuzzle-private
npx wrangler r2 bucket create ghrupuzzle-opennext-cache
```

Copy the returned D1 database ID into `wrangler.jsonc`, then apply migrations:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

The migrations create Better Auth tables, database-backed rate limits,
rounds, releases, invitations, enrolments, submissions, scores, reviews,
certificates, email-delivery events, roles, and audit events.

## Configure secrets

Generate a Better Auth secret with at least 32 random bytes. Store production
values through `wrangler secret put`, never in `wrangler.jsonc`:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put POSTMARK_SERVER_TOKEN
npx wrangler secret put POSTMARK_WEBHOOK_SECRET
```

`BETTER_AUTH_URL` and `POSTMARK_FROM_EMAIL` are non-secret production
variables in `wrangler.jsonc`. For local development copy `.dev.vars.example`
to `.dev.vars`; this file is ignored by Git. Configure Postmark’s delivery and
bounce webhooks to:

```text
https://YOUR-DOMAIN/api/webhooks/postmark
Authorization: Bearer POSTMARK_WEBHOOK_SECRET
```

Postmark link and open tracking are disabled for sign-in messages.

## Bootstrap the first administrator

Sign in once through the application. Look up the new internal user ID, then
grant the first role directly:

```bash
npx wrangler d1 execute ghrupuzzle --remote \
  --command "SELECT id,email FROM user"

npx wrangler d1 execute ghrupuzzle --remote \
  --command "INSERT INTO user_role(user_id,role) VALUES('USER_ID','administrator')"
```

Subsequent role changes should be made through an audited administrative
workflow.

## Publish and register a release

The publisher is always a dry run unless `--apply` is supplied. The main
credentials must point to the practice bucket for practice data and the
private bucket for challenge data. Private credentials must always point to
the private bucket:

```bash
python3 scripts/publish_release.py \
  --release-dir ../genomepuzzle/generated/2026-pilot/typing-practice \
  --dotenv .practice-r2.env \
  --private-dotenv .private-r2.env \
  --public-url https://data.example.org
```

Review every planned key, then repeat with `--apply`. The manifest is uploaded
last. Existing differing objects are refused unless `--force` is explicit,
and there is no deletion path.

Register the uploaded release through `POST /api/admin/releases`. Challenge
releases require a round ID; practice releases must omit it. Registration
loads `release.json`, `COMPLETE.json`, the public manifest, submission schema
and sample sheet from R2. It refuses missing artifacts or metadata that differ
from the request, then derives the exact private answer and scoring-policy
keys used at submission time.

Only GenomePuzzle contract v2 releases are accepted. Exercise instructions,
participant columns, scorer configuration and pass threshold come from the
release bundle; do not reproduce them in deployment configuration.

## Run a challenge

1. Create a UTC-timestamped round with `POST /api/admin/rounds`.
2. For invite-only rounds, import up to 1,000 addresses per request through
   `POST /api/admin/invitations`.
3. Register all four challenge releases.
4. Confirm an enrolled test account cannot download before `opens_at`.
5. Confirm downloads work after opening and submissions fail after
   `closes_at + grace_seconds`.
6. Work the `/review` queue and record a reason for every override.
7. After closing, call `POST /api/rounds/{id}/finalize`. Scores with open
   reviews remain provisional.
8. Issue certificates only when all four modules have final passing scores.

Practice releases are available to every authenticated account and return
detailed comparison feedback. Challenge responses return totals only; private
answer details remain in D1/private R2.

## Certificate operations

`POST /api/certificates/issue` creates a PDF in private R2 and a random public
verification code. Pass `supersedesId` to reissue; the previous certificate
is retained and marked revoked as “Reissued”.

`POST /api/certificates/{id}/revoke` requires an administrator and a reason.
The QR target `/verify/{publicCode}` is deliberately public and shows current
valid/revoked state without exposing an email address.

## Verification before deployment

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run cf:build
python3 -m unittest discover -s tests -v
```

The current npm audit reports advisories inherited from the latest supported
Next.js/Better Auth dependency line for which npm does not offer a
non-breaking fixed version. Re-run the audit immediately before deployment
and upgrade when patched releases are available. The unused Fomantic UI
dependency and its vulnerable build-time dependency tree have been removed.
