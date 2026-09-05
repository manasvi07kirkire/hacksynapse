# Backend verification record

Verified locally on 2026-09-06 (Asia/Kolkata), Windows, Node 25.9.0. Node 22 LTS is the documented deployment/CI target; the hosted CI workflow has not been executed in this session.

## Final gate

| Command                                     | Final result                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ci`                                    | PASS: clean lockfile install, 456 packages added, 457 audited                                          |
| `npm run format:check`                      | PASS                                                                                                   |
| `npm run lint`                              | PASS: zero warnings/errors                                                                             |
| `npm run typecheck`                         | PASS: no TypeScript errors                                                                             |
| `npm test`                                  | PASS: 38 tests, 0 failed, 0 skipped                                                                    |
| `npm run test:legacy`                       | PASS: 28 compliance assertions plus 4 SEO compatibility assertions                                     |
| `npm run test:integration`                  | PASS: 12 tests, 0 failed, 0 skipped; real disposable PostgreSQL                                        |
| `npx prisma format` / `npm run db:validate` | PASS                                                                                                   |
| Migration checks                            | PASS: all 3 migrations applied to an empty database; baseline legacy fixture upgraded without deletion |
| `npm audit --audit-level=moderate`          | PASS: 0 reported vulnerabilities                                                                       |
| `npm run build`                             | PASS: Next 15.5.25 optimized build; all 16 API routes compiled                                         |
| `npm run test:smoke`                        | PASS: 10/10 production HTTP checks                                                                     |
| `npm run demo`                              | Same disposable database/E2E entrypoint as the passing integration command                             |

Prisma format/validate used dummy PostgreSQL URL configuration; these commands alone prove no live database connection. Migration/integrity tests used a real local database with random, test-only credentials. Dependency audit is the registry's advisory result at verification time, not a security certification.

The clean installation required stopping abandoned processes belonging to earlier disposable tests. The harness now shuts down its own Windows PostgreSQL cluster gracefully with `pg_ctl`. A build attempted while integration tests held Prisma's DLL failed with a Windows file lock; the subsequent build after shutdown passed. The first HTTP smoke attempt timed out during a slow local run; its final standalone run passed. No failing checks were skipped or suppressed.

## What the passing integration tests prove

1. Fresh and legacy migrations preserve legacy records, backfill deployment counters, quarantine unverified legacy status and enforce uniqueness/ownership.
2. Eight concurrent signed webhook deliveries produce one logical analysis job. Distinct deliveries for the same SHA remain deduplicated.
3. Eight concurrent distinct revisions allocate unique deployment numbers. Explicit selectors and scoped credentials cannot select another project.
4. Baseline, canonical regression, authoritative Tier A source patch, one replayed PR, deployment recovery and a combined SEO PR persist consistently.
5. An expired RUNNING lease is recoverable; the former worker cannot publish stale results.
6. Crawl failures exhaust three attempts; unverified and partial crawls are DEGRADED, never HEALTHY.
7. Every protected route method rejects missing authentication. Cross-project access, forged finding evidence and foreign scans fail safely; responses carry request IDs and private cache controls.
8. Actual HTTP transport validates DNS-pinned connections, same-origin redirects, response limits and private-address blocking.
9. Actual route handlers connect a project using a verified App JWT, ingest signed pushes, crawl a real HTTP fixture, open/reuse a remediation PR, observe recovery, scan/apply SEO, persist citation results and serve project reads. Verified reconnection enables a paused project; configuration changes with queued work are rejected.
10. An injected database publication failure rolls back graph, findings and score together.
11. Concurrent rate-limit increments enforce the configured limit. Concurrent operations cause one side effect, parameter conflicts are rejected, and degraded rechecks preserve old evidence under a new analysis identity.
12. Changes to origin, route manifest, source mapping or branch change the analysis identity. Reanalyzing the same commit creates a new baseline instead of comparing incompatible project configurations, while repeated requests under that configuration remain deduplicated.

GitHub and OpenRouter are faithful deterministic fakes in these tests. The output explicitly says `ROUTE E2E PASS` and identifies that boundary. No test merges a PR or writes to an external repository.

Unit coverage includes IPv4/IPv6 SSRF cases, URL/path normalization, exact raw HMAC verification, rule positives/negatives and partial guards, graph order/diffs, scoring, null diagnosis, exact-context patch validation, citation provenance, SEO grounding, LLM failure, authorization/CSRF and request schemas. The production HTTP smoke verifies seven rendered pages, minimal liveness and two protected endpoints. It does not verify browser interaction, layout or hydration.

## Readiness decision

- **Local demo:** verified for the documented static HTML boundary.
- **Live demo:** unverified. Supply a disposable repository/deployed site, GitHub App, PostgreSQL, optional OpenRouter model and supervised worker, then execute [the live checklist](DEMO_REGRESSION.md).
- **Production:** not established. Verify installation revocation/token expiry and rate behavior, Supabase pool/load/backup recovery, public deployment revision markers, worker restarts and alert delivery. General dynamic-source edits and repository-native builds require a compatible isolated worker and repository-specific validation commands; unsupported edits currently fail explicitly or remain draft with build status NOT_RUN.

The [traceability matrix](../PRODUCTION_WIRING_TRACKER.md) records implemented and partial requirements. The full Cartesian product of every API and every third-party failure mode is not claimed as tested.
