import {
  DEMO_SCENARIO_183,
  DEMO_SCENARIO_184,
  DEMO_SCENARIO_185,
} from "../lib/fixtures/demo-data";
import { runDetectionRules } from "../lib/detect/engine";
import { diagnoseRootCause } from "../lib/diagnose/signature-matcher";
import { classifyRemediationTier } from "../lib/remediate/tier-manager";
import { generateRemediationPatch } from "../lib/remediate/patch-generator";
import { computeScores } from "../lib/geo/scorer";

function runComplianceTests() {
  console.log("=================================================");
  console.log("SEARCHOPS SPEC & ARCHITECTURE COMPLIANCE AUDIT");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       -> ${details}`);
    }
  }

  // 1. Test Seeded Scenarios (#183, #184, #185)
  console.log("--- 1. Seeded Scenario Fidelity (PRD §4.2, §5) ---");
  assert(
    DEMO_SCENARIO_183.status === "HEALTHY",
    "Scenario #183 status is HEALTHY",
  );
  assert(
    DEMO_SCENARIO_183.scores.searchHealth >= 90,
    "Scenario #183 Search Health >= 90 (actual: " +
      DEMO_SCENARIO_183.scores.searchHealth +
      ")",
  );
  assert(
    DEMO_SCENARIO_184.status === "REGRESSION",
    "Scenario #184 status is REGRESSION",
  );
  assert(
    DEMO_SCENARIO_184.scores.deltaSearch === -25,
    "Scenario #184 deltaSearch is -25 (actual: " +
      DEMO_SCENARIO_184.scores.deltaSearch +
      ")",
  );
  assert(
    DEMO_SCENARIO_184.scores.deltaGeo === -27,
    "Scenario #184 deltaGeo is -27 (actual: " +
      DEMO_SCENARIO_184.scores.deltaGeo +
      ")",
  );
  assert(
    DEMO_SCENARIO_185.status === "REMEDIATED",
    "Scenario #185 status is REMEDIATED",
  );
  assert(
    DEMO_SCENARIO_185.scores.searchHealth === 98,
    "Scenario #185 Search Health recovered to 98",
  );

  // 2. Test Deterministic Detection Engine (AI_RULES Golden Rule 1 & PRD §5.4)
  console.log(
    "\n--- 2. Deterministic Rules Engine (AI_RULES #1, FR-14..16) ---",
  );
  const findings184 = runDetectionRules({
    currentSnapshot: DEMO_SCENARIO_184.snapshot as any,
    previousSnapshot: DEMO_SCENARIO_183.snapshot as any,
    deployNumber: 184,
    deploymentSha: DEMO_SCENARIO_184.sha,
  });
  assert(findings184.length >= 1, "Detection engine flags regressions on #184");
  const canonicalFinding = findings184.find(
    (f) => f.type === "CANONICAL_STRIPPED",
  );
  assert(!!canonicalFinding, "CANONICAL_STRIPPED rule triggered");
  assert(
    canonicalFinding?.severity === "CRITICAL",
    "CANONICAL_STRIPPED severity is CRITICAL",
  );
  assert(
    canonicalFinding?.confidence === 100,
    "Canonical removal is observed deterministically",
  );
  const observedCanonicalRemovals = DEMO_SCENARIO_184.snapshot.nodes.filter(
    (n) =>
      n.type === "page" &&
      !n.attrs.hasCanonical &&
      DEMO_SCENARIO_183.snapshot.nodes.some(
        (p) => p.type === "page" && p.url === n.url && p.attrs.hasCanonical,
      ),
  ).length;
  assert(
    canonicalFinding?.evidence.pagesAffected === observedCanonicalRemovals,
    "Evidence counts only actually observed pages",
  );

  // 3. Test Signature Matcher & AST Diagnosis (PRD §5.5, FR-17..18)
  console.log("\n--- 3. Diagnosis Signature Matcher (FR-17, FR-18) ---");
  const sampleDiff = [
    {
      filename: "src/app/products/[slug]/page.tsx",
      patch: `@@ -180,6 +180,4 @@
 export async function generateMetadata({ params }: Props) {
   return {
     title: product.name,
-    alternates: {
-      canonical: \`https://store.acme.com/products/\${params.slug}\`,
-    },
   };
 }`,
      additions: 0,
      deletions: 3,
    },
  ];
  const diagnosis = diagnoseRootCause(canonicalFinding!, sampleDiff);
  assert(
    diagnosis !== null,
    "Signature matcher returns diagnosis for canonical diff",
  );
  assert(
    diagnosis?.file === "src/app/products/[slug]/page.tsx",
    "Diagnosed exact root cause file",
  );
  assert(diagnosis?.line === 184, "Diagnosed exact root cause line (184)");
  assert(
    diagnosis?.matchedSignature === "CANONICAL_TAG_REMOVAL_SIG",
    "Signature correctly matched CANONICAL_TAG_REMOVAL_SIG",
  );

  // 4. Test Remediation Tier Hard Boundaries (AI_RULES Golden Rule 4, FR-23..25)
  console.log(
    "\n--- 4. Remediation Tier Hard Boundaries (AI_RULES #4, FR-23..25) ---",
  );
  const tierA = classifyRemediationTier("CANONICAL_STRIPPED");
  assert(
    tierA.tier === "TIER_A" && tierA.isAutoFixable === true,
    "CANONICAL_STRIPPED is TIER_A (AUTO-FIX)",
  );
  const tierASchema = classifyRemediationTier("SCHEMA_REMOVED");
  assert(
    tierASchema.tier === "TIER_A" && tierASchema.isAutoFixable === true,
    "SCHEMA_REMOVED is TIER_A (AUTO-FIX)",
  );
  const tierB = classifyRemediationTier("SCHEMA_INVALID");
  assert(
    tierB.tier === "TIER_B" && tierB.isAutoFixable === false,
    "SCHEMA_INVALID is TIER_B (DRAFT PR only)",
  );
  const tierC = classifyRemediationTier("REDIRECT_LOOP" as any);
  assert(
    tierC.tier === "TIER_C" && tierC.isAutoFixable === false,
    "Unknown/risky is TIER_C (APPROVAL ONLY)",
  );

  // 5. Test Validated Patch Generation (AI_RULES Golden Rule 5, FR-26..27)
  console.log(
    "\n--- 5. Validated Patch Generator (AI_RULES #5, FR-26..27) ---",
  );
  const patch = generateRemediationPatch(canonicalFinding!, {
    path: "src/app/products/[slug]/page.tsx",
    current: 'export function metadata() { return { title: "Product" }; }',
    previous:
      'export function metadata() { return { title: "Product", alternates: { canonical: "https://example.com/product" } }; }',
    url: "https://example.com/product",
  });
  assert(
    patch.targetFile === "src/app/products/[slug]/page.tsx",
    "Patch targets correct file",
  );
  assert(
    patch.diff.includes("alternates:"),
    "Patch contains alternates.canonical code restoration",
  );
  assert(
    patch.validationResult.syntaxCheck === true,
    "Validation Gate 1: Static AST syntax check passed",
  );
  assert(
    patch.validationResult.ruleRecheckPassed === true,
    "Validation Gate 2: Deterministic rule re-check passed",
  );
  assert(
    patch.validationResult.buildable === false && patch.draft === true,
    "Unrun repository build is explicit and the PR stays draft",
  );

  // 6. Test GEO Scorer & Search Health Scoring (PRD §5.6, FR-20..21)
  console.log("\n--- 6. GEO & Search Health Scoring (FR-20, FR-21, FR-30) ---");
  const scores184 = computeScores(
    DEMO_SCENARIO_184.snapshot as any,
    findings184,
    { searchHealth: 96, geoScore: 88 },
  );
  assert(
    scores184.searchHealth <= 75,
    "Search Health reflects degraded score on #184 (score: " +
      scores184.searchHealth +
      ")",
  );
  assert(
    scores184.deltaSearch < 0,
    "deltaSearch correctly reflects drop (delta: " +
      scores184.deltaSearch +
      ")",
  );
  assert(
    scores184.geoScore <= 70,
    "GEO score reflects citation grounding drop (score: " +
      scores184.geoScore +
      ")",
  );

  console.log("\n=================================================");
  console.log(
    `TOTAL COMPLIANCE TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`,
  );
  console.log("=================================================");

  if (passed === total) {
    console.log(
      "Fixture compatibility checks passed. These checks are not live production proof.",
    );
  } else {
    process.exit(1);
  }
}

runComplianceTests();
