# Reproducible backend demo

## One-command local proof

After `npm ci`, run:

```sh
npm run demo
```

This starts disposable real PostgreSQL, applies all migrations, runs concurrency/contract tests and stops the database. A real local HTTP fixture supplies HTML; faithful GitHub/OpenRouter adapters validate auth/request/response contracts. No external credentials or real PR are used. Expect `ROUTE E2E PASS` and zero failing tests. The route test connects a project, authenticates an RSA-signed GitHub App JWT, delivers signed pushes, crawls the baseline, removes a canonical declaration, detects the regression, opens/reuses one PR, simulates deployment of the repair, observes recovery, approves one SEO batch, reuses one draft PR and persists a citation result.

Run `npm test` for security/detection/parser tests and `npm run test:legacy` for preview compatibility checks. These are not a claim that a live GitHub/Supabase deployment has passed.

## Live demo checklist

1. Create a disposable GitHub repository containing an `index.html` with title, description, canonical, valid JSON-LD, one H1 and substantive visible text. Add `/sitemap.xml` and a valid `/llms.txt`. Deploy it to a public HTTP(S) origin with an `X-SearchOps-Sha` header containing the full deployed SHA. Static HTML is the validated remediation/SEO source boundary.
2. Configure `.env` following OPERATIONS.md, install the GitHub App on that repository, run `npm run db:migrate`, `npm run dev` and `npm run worker` in separate terminals. For hosted APIs use `npm run build` / `npm start` and a separate worker host.
3. Open `/connect`, sign in using the operator key, enter `owner/repo`, the deployed origin, installation ID, route manifest `/`, and source mapping `{"/":"index.html"}`. Select the project and open `/watch`.
4. Deliver the signed baseline push through the GitHub webhook deliveries UI, or click Analyze current deployment after the site serves its SHA. Expect 202 with a job ID, followed by HEALTHY and a complete graph. Missing version markers are DEGRADED; they are not baseline proof.
5. Remove the canonical link in the demo repository, push and deploy. The webhook queues one analysis. Expect REGRESSION, CANONICAL_STRIPPED and observations showing one affected page against the older snapshot. Redeliver the same webhook: no second logical job appears.
6. In `/watch`, generate the fix for that persisted finding. Expect a PR in the connected repository restoring the actual declaration. Repeat the request: expect the same PR number. SearchOps never merges it.
7. Review and merge the PR manually, deploy it, and let the signed push trigger analysis. Expect HEALTHY with no canonical-removal finding and recorded score recovery. If deployment lag produced DEGRADED, use `/api/jobs` action `recheck` with a new Idempotency-Key after the marker is correct.
8. In SEO Advisor, scan a URL belonging to that project with relevant keywords and a configured OpenRouter model; approve a subset and open the combined draft PR. For a credential-free heuristic request explicitly use `mode:"heuristic"`. Repeat apply to verify the same PR is reused. A changed repository head requires a fresh scan.
9. Capture delivery/job IDs, deployment outcomes, graph/finding evidence, GitHub PR numbers and recovery results. Verify a project-scoped key cannot read a second project's deployments, graph, scan, finding or job.

Remaining live checks: actual Supabase pool behavior and backup recovery; installation revocation/token expiry; GitHub status checks and permission errors; public DNS/redirect behavior at the deployed origin; configured OpenRouter model; worker restarts/alerts; human merge/deploy recovery. Do not mark production readiness from local fakes alone.
