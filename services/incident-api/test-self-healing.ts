
import {
  runSelfHealing,
} from "./src/self-healing-engine";

async function runTest() {
  console.log("======================================");
  console.log(" CLOUDSENTINEL SELF-HEALING TEST");
  console.log("======================================");

  const incident = {
    service: "payment",
    severity: "CRITICAL",
    error_rate: 76,
    latency_ms: 6400,
    message: "Errors increased after deployment",
    traffic: "+20%",
    recent_deployment: true,
    memory_usage: 72,
  };

  const analysis = {
    severity: "CRITICAL" as const,
    likely_cause: "Faulty deployment",
    recommended_action: "ROLLBACK" as const,
    confidence: 94,
    explanation:
      "The incident began after a recent deployment and has a high error rate.",
  };

  const result = await runSelfHealing(
    incident,
    analysis,
  );

  console.log("\n======================================");
  console.log(" FINAL SELF-HEALING RESULT");
  console.log("======================================");

  console.log(
    JSON.stringify(result, null, 2),
  );

  if (
    result.overall_status === "RECOVERED"
  ) {
    console.log(
      "\n🏆 SELF-HEALING TEST PASSED",
    );
  } else {
    console.log(
      "\n❌ SELF-HEALING TEST FAILED",
    );
  }
}

runTest().catch((error) => {
  console.error(
    "\n❌ TEST ERROR:",
    error,
  );

  throw new Error("Test failed");
});