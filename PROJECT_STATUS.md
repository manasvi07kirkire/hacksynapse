# Current backend status

The original prototype had five unauthenticated API routes, fixture-backed analysis, fabricated patch/PR results, SQLite and no migrations or automated quality gates.

The backend now has authenticated/scoped routes, PostgreSQL migrations and durable jobs, safe fetch-first crawling, deterministic findings/versioned scores, GitHub App operations, source-bound remediation/SEO apply, real provider error handling, a live project UI and automated unit/database/API/demo tests.

Local demo verification uses real disposable PostgreSQL and HTTP with faithful external fakes. Live GitHub, Supabase, OpenRouter, deployed revision markers and hosted worker supervision remain unverified because credentials/infrastructure were not supplied. Do not label this repository broadly production-ready based on the fake-service tests.

Supported source boundary: static HTML remediation and SEO, plus a restricted literal TypeScript canonical edit as a draft. General dynamic source transformations and native build/browser validation require a suitable isolated worker and repository-specific checks. The original Field Manual screens are labeled previews; `/watch` and selected-project graph/Advisor/citation operations use actual persisted data.

See [traceability](PRODUCTION_WIRING_TRACKER.md), [vision](PRODUCTION_BACKEND_VISION.md), and [demo runbook](docs/DEMO_REGRESSION.md). Verification commands and recorded results are in [verification](docs/VERIFICATION.md).
