# Backend hardening: discovery and implementation plan

Baseline 2026-09-05: clean Git worktree; npm lockfile; Node 25.9.0 available (no engines specified). TypeScript and production build pass. Lint prompts for configuration; no format/test/CI/migration commands exist. Prisma validation fails because DATABASE_URL is absent. No PostgreSQL/Docker tools or integration credentials are configured. The shipped schema uses SQLite, unlike the supplied PostgreSQL vision. Referenced status/tracker/demo documents and AGENTS.md are absent.

## Evidence and ordered plan

1. **Security:** all five routes are unauthenticated, trust arbitrary bodies, and leak error messages. Add mandatory operator authentication, optional project-scoped credentials, strict schemas, bounded bodies, sanitized errors, no-store, and database rate limiting. Resolve explicit selectors without fallback. Add a browser login and project selector.
2. **Crawl/detection:** URL extraction has unrestricted fetch and fabricated fallback content. Detection invents baseline regressions, counts and source locations. Implement DNS-pinned public-only fetching, bounded crawling, stable graphs, the full rule catalog, nullable diagnosis, and versioned evidence/scoring.
3. **Data/reliability:** no webhook, projects service, real pipeline, queue, graph persistence, or migration history exists. Preserve model names and serialized fields; switch the datasource to PostgreSQL for the specified Supabase deployment and transactional queue. Add baseline and hardening migrations, foreign keys, uniqueness, project counters, leases, retries, atomic publication and revision verification.
4. **Integrations:** no GitHub modules exist. PRs and validation results are invented. Add installation auth, repository checks, exact base content, strict paths/patches, deterministic PR branches, durable approvals/idempotency and honest validation. OpenRouter currently races models and fabricates success; make requested LLM operations fail closed and optional narration explicitly degrade.
5. **SEO:** scans and applies swallow database failures, accept caller suggestions, and fabricate PRs. Scope scans to projects and immutable source versions, validate suggestion provenance, approve exact batches and create/reuse one real combined PR.
6. **Verification/DX:** add tests with faithful external fakes and disposable real PostgreSQL, migration upgrade tests, CI, environment reference, worker/runbook and current-state traceability. Preserve fixture UI as a clearly labeled preview and wire live operations to authoritative IDs.

## Compatibility and rollback

Authentication, explicit project selection, asynchronous 202 analysis responses and rejection of caller-provided finding evidence are intentional security contract corrections. Update internal callers. JSON model columns remain serialized strings to limit migration scope. PostgreSQL cannot directly consume an old SQLite file: retain it unchanged, export/import reviewed project data into a new PostgreSQL database and re-analyze; never schema-push over production data. Before an upgrade, back up PostgreSQL, deploy migrations before workers/app, and stop workers before rollback. Roll back application only to a compatible version; database changes use a forward-fix migration. Do not expose the old unauthenticated backend as a rollback.

## Initial traceability

| Vision area / route                                           | Initial state                           | Risk / planned verification                                                                |
| ------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| health; projects; deployments; graph; geo; GitHub install URL | Missing                                 | Authenticated bounded reads, minimal public liveness, project isolation contracts          |
| POST run-analysis                                             | Contradictory: fixtures                 | Queue dedup, concurrent counters, ordered snapshots, atomic rollback, revision marker, E2E |
| GitHub webhook                                                | Missing                                 | Raw HMAC, invalid payload, install match, concurrent delivery dedup                        |
| POST generate-fix                                             | Contradictory: caller evidence, fake PR | Persisted finding only, stale checks, path/patch validation, tier approvals, PR replay     |
| POST citation-test                                            | Partial: fake facts/fallback            | Safe fetch, source provenance, provider unavailable/malformed/timeout                      |
| GET/POST seo-scan; POST seo-apply                             | Partial/unsafe                          | Ownership, source mapping, exact suggestions, batch conflicts/concurrency, real draft PR   |
| crawler/extraction                                            | Partial                                 | IPv4/IPv6/DNS/redirect SSRF, budgets, malformed HTML/XML/JSON-LD                           |
| graph/diff/detection/diagnosis/scoring                        | Partial/contradictory                   | Ten rules, baseline/partial/recovery, stable IDs, no guessed source or citation score      |
| database/queue/observability/configuration                    | Missing/partial                         | PostgreSQL migration, transactions, lease fencing, rate limits, redacted errors            |
| local/live demo and production proof                          | Unverifiable                            | Local faithful fakes separately from live GitHub/Supabase/site evidence                    |
