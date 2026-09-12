import {
  executeRecovery,
} from "./src/recovery-engine";

const incident = {
  service: "payment",
  severity: "CRITICAL",
  error_rate: 23.4,
  latency_ms: 4720,
  recent_deployment: true,
};

async function runTest() {
  console.log("================================");
  console.log("CLOUDSENTINEL RECOVERY TEST");
  console.log("================================");

  console.log("\nTesting ROLLBACK...\n");

  const result = await executeRecovery(
    incident,
    "ROLLBACK",
  );

  console.log("\nRECOVERY RESULT:");
  console.log(result);

  if (
    result.status === "EXECUTED" &&
    result.verified === true
  ) {
    console.log(
      "\n✅ RECOVERY TEST PASSED",
    );
  } else {
    console.log(
      "\n❌ RECOVERY TEST FAILED",
    );
  }
}

runTest().catch((error) => {
  console.error(
    "Test failed:",
    error,
  );
});