# Backend operations

## Setup and migration

Use Node 22 LTS and `npm ci`. Copy `.env.example` to `.env`, configure PostgreSQL runtime pooling and a direct/session-pooler migration URL, and generate a random operator key. On Supabase use the transaction pooler with `pgbouncer=true` for Prisma 5 runtime connections. Tune `connection_limit` for the number of API instances/workers and your connection budget. Migrations use DIRECT_URL. Keep TLS enabled on public database connections.

Run `npm run db:migrate` then `npm run db:validate`. Never use `db:push` for production; that legacy command is only for disposable development databases. Before migrating an existing installation, back up the DB. Migration 001 is a PostgreSQL baseline of the original models; 002 adds ownership/job/version constraints and backfills deployment counters; 003 adds owner/status/score checks and graph endpoint integrity. New records require project ownership; unowned legacy scans/citations remain unreadable by scoped APIs. Duplicate repository names, deployment numbers, snapshots or finding types make migration fail for manual reconciliation instead of silently deleting data.

An existing SQLite file cannot be migrated in place with the PostgreSQL migrations. Retain it unchanged, provision a fresh PostgreSQL DB, review/export/import project configuration, then run real analyses. Imported fixture deployments are not live evidence. For an existing PostgreSQL DB matching the baseline, verify a schema diff and use `prisma migrate resolve --applied 202609050001_baseline` before deploying later migrations. Never mark an incompatible schema as applied.

Rollback: stop workers, keep a database backup and the previous compatible app artifact. The old unauthenticated prototype is not a safe rollback. Added columns are compatible with the hardened app; reverse data changes through a reviewed forward-fix migration. Do not remove ownership/unique constraints to make a migration pass. Reconnect paused projects after verifying installation permissions.

## Worker and recovery

Run `npm run dev` for the UI and, in another terminal, `npm run worker`. In production build/start the API separately and supervise the worker on a persistent Node host. Vercel API handlers enqueue work; they do not run an unawaited background worker.

State flow: QUEUED -> RUNNING -> HEALTHY/REGRESSION/DEGRADED/FAILED/CANCELLED. Jobs use a three-minute lease, heartbeat every 30 seconds, per-project serialization and an analysis deadline. Transient crawl/provider failures retry with bounded exponential backoff/jitter, at most three attempts. Completed publications cannot be overwritten by stale workers. Terminal jobs remain visible in `/api/jobs`; use POST action `retry` only after correcting the cause. `cancel` invalidates a queued/running job. `recheck` with an Idempotency-Key reanalyzes a completed degraded revision under a new explicit analysis identity without erasing previous evidence.

Configure the target site to emit `X-SearchOps-Sha` with the full deployed commit on every monitored HTML page. Short readiness polling handles brief lag; longer lag remains visibly DEGRADED. Recheck after the target serves the commit. An old, forced or diverged history does not become a false regression comparison.

## GitHub and OpenRouter

GitHub App permissions: repository metadata read, contents read/write, pull requests read/write and commit statuses read/write. Subscribe to push, installation and installation_repositories. Set the webhook URL to `/api/webhooks/github`, application/json, and a random shared webhook secret. Install only on the intended repository. The installation ID is verified through the installation token's actual repository access during connection and subsequent operations. No OAuth callback is needed for the operator setup; the operator completes installation and enters its ID. PAT fallback requires SEARCHOPS_ALLOW_PAT=true outside production only.

Set OPENROUTER_API_KEY and an explicit OPENROUTER_MODEL for requested model features. Model absence/failure is not replaced with a fake answer. Optional narration degrades with recorded status; deterministic findings persist. `mode:"heuristic"` is an explicitly selected SEO mode grounded in visible source text. There is no automatic paid-model fallback or model race.

## Monitoring, incident checks and retention

Collect structured JSON logs by request/job/project ID. Logs allow-list codes, outcomes, durations and attempts; they exclude secrets, page text, provider bodies and source patches. Track oldest QUEUED job age, RUNNING lease age, terminal failure count, duration, degradation rate, DB latency, HTTP 429, and GitHub status-write failures. Alert if queued age exceeds five minutes, workers stop heartbeating, or a project repeatedly fails. Configure the actual host's alert destination before live use.

For an incident: obtain X-Request-Id; find the matching sanitized event; inspect the authorized project's job status/errorCode; check worker availability and DB pool pressure; inspect site version marker; verify GitHub installation access/default branch; retry only after correcting the cause. Use readiness for DB connectivity and health for process liveness. Neither endpoint exposes secret presence.

Run `node --env-file=.env --import tsx scripts/maintenance.ts` daily to remove expired rate buckets. Retain operation keys and webhook delivery identities as long as their project is active so retention cannot reopen duplicate operations. Snapshot/source retention is operator-controlled: archive with access control, then delete whole obsolete deployments/scans only after review; cascade rules remove dependent graph/findings. Keep the newest comparable completed deployment and all active remediation/scan records. No automatic deletion of evidence is enabled by default.

The clean test harness creates random disposable databases under ignored `.test-data`, never uses supplied credentials, and stops its own PostgreSQL process. On Windows the bundled `pg_ctl` requests a graceful shutdown. Retained test directories may be removed after confirming their server has stopped; never point this harness at a production URL.
