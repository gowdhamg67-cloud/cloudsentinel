import { runSelfHealing } from "./src/self-healing-engine";
import { IncidentData, IncidentAnalysis } from "./src/ai-analyzer";

async function main() {
  console.log("\n======================================");
  console.log(" CLOUDSENTINEL LOCAL E2E TEST");
  console.log("======================================\n");

  // ----------------------------------------
  // STEP 1 — SIMULATED INCIDENT
  // ----------------------------------------

  const incident: IncidentData = {
    service: "payment",
    severity: "CRITICAL",
    error_rate: 76,
    latency_ms: 6400,
    status: "DOWN",
    message: "Payment service failing after deployment",
    traffic: "+210%",
    recent_deployment: true,
    memory_usage: 82,
  };

  console.log("STEP 1 — INCIDENT DETECTED");
  console.log(incident);

  // ----------------------------------------
  // STEP 2 — SIMULATED AI ANALYSIS
  // ----------------------------------------

  const fakeAIAnalysis: IncidentAnalysis = {
    severity: "CRITICAL",
    likely_cause:
      "Recent deployment caused payment service failures.",
    recommended_action: "ROLLBACK",
    confidence: 94,
    explanation:
      "High error rate combined with a recent deployment strongly indicates a faulty deployment.",
  };

  console.log("\nSTEP 2 — AI ANALYSIS");
  console.log(fakeAIAnalysis);

  // ----------------------------------------
  // STEP 3 — SELF-HEALING ENGINE
  // ----------------------------------------

  console.log("\nSTEP 3 — SELF-HEALING ENGINE");

  const result = await runSelfHealing(
    incident,
    fakeAIAnalysis,
  );

  // ----------------------------------------
  // STEP 4 — FINAL RESULT
  // ----------------------------------------

  console.log("\n======================================");
  console.log(" FINAL E2E RESULT");
  console.log("======================================");

  console.log({
    policy_approved: result.policy.approved,
    action: result.recovery.action,
    recovery_status: result.recovery.status,
    verified: result.recovery.verified,
    overall_status: result.overall_status,
  });

  // ----------------------------------------
  // ASSERTIONS
  // ----------------------------------------

  if (
    result.policy.approved &&
    result.recovery.action === "ROLLBACK" &&
    result.recovery.status === "EXECUTED" &&
    result.recovery.verified &&
    result.overall_status === "RECOVERED"
  ) {
    console.log("\n🏆 LOCAL E2E TEST PASSED");
    console.log(
      "CloudSentinel successfully detected, analyzed, approved, recovered, and verified the incident.",
    );
  } else {
    console.error("\n❌ LOCAL E2E TEST FAILED");
    throw new Error("Local E2E test failed");
  }
}

main().catch((error) => {
  console.error("\n❌ E2E TEST ERROR");
  console.error(error);
  throw new Error("Local E2E test failed");
});