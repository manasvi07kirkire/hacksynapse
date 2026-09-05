# API contracts

All non-health, non-webhook routes require `x-searchops-key` or the operator session. Never send keys in query strings. All private responses use `Cache-Control: no-store, private` and `X-Request-Id`. Errors preserve `{error: string}` and add `{code, requestId}`; private details and provider errors are not returned. JSON writes require application/json and at most 64 KiB. Webhooks permit 1 MiB.

Authenticated requests have a database-backed per-actor/route fixed-minute rate limit, normally 60/minute, with 5/minute for model/PR operations and 10/minute for job/project operations. Signed webhooks are limited to 300/minute globally. Ingress should additionally cap unauthenticated request volume; no forwarded IP header is trusted as identity.

## Selectors

Use `projectId` (or canonical `owner/repo`). Supplying both requires both to match. No implicit latest-project fallback exists. Explicit local demo mode may omit the selector only with exactly one enabled project. A scoped project credential can supply its own implicit project. Another project's identifier returns 404. Unknown body fields are rejected.

| Route                     | Method        | Request                                                                                               | Result                                                                                                      |
| ------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| /api/health               | GET           | none, public                                                                                          | `{status:"ok"}`; liveness only                                                                              |
| /api/readiness            | GET           | auth                                                                                                  | DB connectivity; no configuration inventory                                                                 |
| /api/session              | POST / DELETE | POST operator key in header                                                                           | Set/remove HttpOnly session; browser writes verify Origin                                                   |
| /api/projects             | GET           | limit <=100, cursor                                                                                   | `{projects,nextCursor}`; scoped credentials see only their project                                          |
| /api/projects             | POST          | operator; repo, siteUrl, routeManifest <=50, installId, optional defaultBranch/sourceMap              | GitHub/site verification and project upsert                                                                 |
| /api/deployments          | GET           | selector; optional deployNumber, limit <=100, cursor                                                  | `{project,deployments,deployment,nextCursor}`; bounded findings/remediations                                |
| /api/graph                | GET           | selector; optional deployNumber                                                                       | `{snapshot}`; graph volume bounded by crawl budgets                                                         |
| /api/geo                  | GET           | selector                                                                                              | latest score and citation test                                                                              |
| /api/run-analysis         | POST          | selector; optional full sha/baseSha                                                                   | **202** `{jobId,deploymentId,status}`; polls through deployments/jobs                                       |
| /api/jobs                 | GET           | selector                                                                                              | most recent 50 jobs, no raw payloads                                                                        |
| /api/jobs                 | POST          | selector, jobId, action=retry/cancel/recheck                                                          | validated transition; recheck needs Idempotency-Key and creates a new analysis for a completed degraded job |
| /api/generate-fix         | POST          | selector, findingId                                                                                   | validated patch/PR or explicit conflict/unsupported-source error; automatic replay per finding              |
| /api/remediation-approval | POST          | operator; selector, findingId                                                                         | durable approval and audit record; no patch-validation bypass                                               |
| /api/citation-test        | POST          | selector, url, query, optional expectedFacts <=20; Idempotency-Key                                    | real provider result and persisted grounding checks                                                         |
| /api/seo-scan             | GET           | selector                                                                                              | recent 50 scan summaries and count                                                                          |
| /api/seo-scan             | POST          | selector, pageUrl or prNumber, targetKeywords <=10, mode=llm/heuristic; Idempotency-Key               | persisted scan/source/suggestions with provenance                                                           |
| /api/seo-apply            | POST          | selector, scanId, approvedSuggestionIds, rejectedSuggestionIds, optional edits keyed by suggestion ID | one idempotent draft PR per scan batch; conflicting replay is 409                                           |
| /api/github/install-url   | GET           | auth                                                                                                  | configured App installation URL                                                                             |
| /api/webhooks/github      | POST          | raw HMAC, delivery UUID, event                                                                        | **202** accepted job or explicit ignored reason                                                             |

## Intentional contract corrections

Verified project reconnection enables a paused project. Updating project configuration while an analysis is QUEUED or RUNNING returns 409 `PROJECT_BUSY`; finish or cancel that work first so pending evidence retains its configured origin and source mapping.

The analysis version includes a fingerprint of origin, normalized manifest, source mapping and branch. Configuration changes permit a fresh analysis of the same SHA and reset the comparable baseline; old findings cannot generate new remediation against a different configuration. Historical records remain intact.

`findingData`, `forceApproval`, arbitrary source content, caller status/tier and simulated `deployNumber` writes are rejected. Analysis returns an asynchronous receipt. Citation input no longer defaults to fictional product facts or caller-provided page text. Scans/applies cannot succeed after persistence fails. PR URLs/numbers exist only after GitHub returns a real PR. API response numeric scores remain, with version/provenance and honest missing-input semantics. The prototype preview UI is not a source of live finding IDs.

Idempotency keys are 8–100 characters and bound to project/action/parameters. Reusing a key with changed parameters returns 409. Completed PR actions replay the stored result. In-flight operations return 409; failed operations can be retried. External branches use deterministic operation IDs so a retry after a DB failure can reconcile the GitHub result. Responses never imply auto-merge or production build execution.
