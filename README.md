# SearchOps

SearchOps watches deployed discoverability signals through search and AI-answer lenses. It records deterministic regressions, source evidence and versioned scores, then opens reviewed remediation or SEO pull requests. It never merges a PR.

The backend is prepared for a bounded static-site demo. Local proof uses real PostgreSQL/HTTP plus faithful GitHub/OpenRouter fakes; live integration and broad production readiness are not claimed. See [current status](PROJECT_STATUS.md) and [supported architecture](PRODUCTION_BACKEND_VISION.md).

## Run the local verification demo

Use Node 22 LTS (the implementation was also tested on the provided Node 25.9.0 environment).

```sh
npm ci
npm test
npm run test:legacy
npm run demo
```

The demo provisions a disposable PostgreSQL instance and exercises signed webhooks, concurrency, baseline/regression/recovery, PR replay, SEO and citation routes. It needs no external credentials and never uses your production database. Windows requires the standard PostgreSQL process/shutdown utilities available to the test process.

## Connect real services

Copy `.env.example` to `.env`, configure PostgreSQL/Supabase, GitHub App and an operator key. Configure OpenRouter only for requested model features. Then run:

```sh
npm run db:migrate
npm run db:validate
npm run dev
```

In a second terminal:

```sh
npm run worker
```

Visit `/connect` to sign in and verify a project; `/watch` shows real deployment state. The original Field Manual scenarios remain labeled UI previews. The target must emit `X-SearchOps-Sha` with its full deployed SHA; otherwise analysis is visibly degraded. Set a page-to-source mapping such as `{"/":"index.html"}` for exact source remediation/SEO edits.

Production API hosting and the persistent worker are separate processes. SQLite files from the original prototype must be retained/exported and imported into a new PostgreSQL database; do not point PostgreSQL migrations at SQLite or use destructive schema push as a production migration strategy.

## Verification and operations

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:legacy
npm run test:integration
npm run db:validate
npm audit --audit-level=moderate
npm run build
npm run test:smoke
```

[Demo runbook](docs/DEMO_REGRESSION.md) · [API contracts](docs/API_CONTRACTS.md) · [Migration/worker/incident guide](docs/OPERATIONS.md) · [Requirement traceability](PRODUCTION_WIRING_TRACKER.md) · [Initial audit](docs/BACKEND_AUDIT.md)
