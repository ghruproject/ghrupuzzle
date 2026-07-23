# GHRU Puzzles

GHRU Puzzles is the delivery and assessment portal for four microbial
genomics exercises:

- Kleborate-based genotyping;
- short-read de novo assembly;
- hybrid assembly; and
- outbreak investigation with phylogeny.

The sibling `genomepuzzle` repository generates reproducible public/private
release packages. This repository publishes those packages, authenticates
participants, enforces challenge windows, accepts CSV submissions, scores
results, supports audited review, and issues QR-verifiable certificates.

## Architecture

- Next.js on Cloudflare Workers through OpenNext
- Better Auth with Google, Microsoft Entra, and Postmark magic links
- Cloudflare D1 for accounts and assessment records
- public R2 for practice inputs
- private R2 for challenge inputs, answers, submissions, and PDFs

The old checked-in manifests are retained only as a temporary practice
fallback. Challenge pages use the authenticated release API; legacy challenge
manifests and helper scripts no longer expose datasets.

## Local checks

Use Node.js 22.12 or newer:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run cf:build
python3 -m unittest discover -s tests -v
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. The Cloudflare D1
ID in `wrangler.jsonc` is deliberately a placeholder until the database is
created.

## Dataset publication

Validate a generated release without changing R2:

```bash
python3 scripts/publish_release.py \
  --release-dir ../genomepuzzle/generated/2026-pilot/typing-practice \
  --dotenv .practice-r2.env \
  --private-dotenv .private-r2.env \
  --public-url https://data.example.org
```

Review the plan and add `--apply` only when the public/challenge and private
bucket credentials have been checked. The publisher has no deletion path.
The legacy `scripts/update_dataset.py` must not be used for new releases.

## Documentation

- [Assessment platform design](docs/assessment-platform-plan.md)
- [Deployment and operations](docs/deployment-and-operations.md)

Production provisioning, OAuth credentials, Postmark webhooks, and the first
pilot remain external operational steps; no live services are changed by a
local build.

## Vercel UX preview

`vercel.json` builds an explicitly labelled demonstration version. It
simulates sign-in, enrolment, submission feedback, review, and certificate
verification without calling Cloudflare D1/R2 or saving participant data.
This is for interface testing only; the formal assessment backend remains the
Cloudflare deployment.

The current test deployment is available at
[ghrupuzzle.vercel.app](https://ghrupuzzle.vercel.app). To deploy a later
working tree after linking the Vercel project:

```bash
vercel link
vercel deploy
```
