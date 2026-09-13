import {
  IncidentData,
  IncidentAnalysis,
} from "./ai-analyzer";

import {
  evaluateRecoveryPolicy,
  PolicyDecision,
} from "./policy-engine";

import {
  executeRecovery,
  RecoveryResult,
} from "./recovery-engine";

export interface SelfHealingResult {
  incident: IncidentData;
  analysis: IncidentAnalysis;
  policy: PolicyDecision;
  recovery: RecoveryResult;
  overall_status: "RECOVERED" | "MONITORED" | "BLOCKED";
}

export async function runSelfHealing(
  incident: IncidentData,
  analysis: IncidentAnalysis,
): Promise<SelfHealingResult> {

  console.log(
    "\n======================================",
  );

  console.log(
    " CLOUDSENTINEL SELF-HEALING ENGINE",
  );

  console.log(
    "======================================",
  );

  // --------------------------------------------------
  // STEP 1: AI DECISION
  // --------------------------------------------------

  console.log("\nSTEP 1 — AI DECISION");

  console.log({
    severity: analysis.severity,
    likely_cause: analysis.likely_cause,
    recommended_action:
      analysis.recommended_action,
    confidence: analysis.confidence,
  });

  // --------------------------------------------------
  // STEP 2: SAFETY POLICY
  // --------------------------------------------------

  console.log("\nSTEP 2 — SAFETY POLICY");

  const policy = evaluateRecoveryPolicy(
    incident,
    analysis,
  );

  console.log(policy);

  // --------------------------------------------------
  // STEP 3: BLOCK UNSAFE ACTION
  // --------------------------------------------------

  if (!policy.approved) {

    console.log(
      "\n🛡️ RECOVERY BLOCKED BY SAFETY POLICY",
    );

    return {
      incident,
      analysis,
      policy,

      recovery: {
        action: "MONITOR",
        status: "SKIPPED",
        message:
          `Automated recovery blocked: ${policy.reason}`,
        recovery_time_ms: 0,
        verified: false,
      },

      overall_status: "BLOCKED",
    };
  }

  // --------------------------------------------------
  // STEP 4: EXECUTE RECOVERY
  // --------------------------------------------------

  console.log(
    "\nSTEP 3 — RECOVERY EXECUTION",
  );

  const recovery = await executeRecovery(
    incident,
    policy.action,
  );

  console.log(recovery);

  // --------------------------------------------------
  // STEP 5: VERIFY RECOVERY
  // --------------------------------------------------

  console.log(
    "\nSTEP 4 — RECOVERY VERIFICATION",
  );

  if (recovery.verified) {

    console.log(
      "✅ Recovery verification PASSED",
    );

  } else {

    console.log(
      "❌ Recovery verification FAILED",
    );
  }

  // --------------------------------------------------
  // FINAL STATUS
  // --------------------------------------------------

  let overall_status:
    | "RECOVERED"
    | "MONITORED"
    | "BLOCKED";

  if (
    recovery.status === "EXECUTED" &&
    recovery.verified
  ) {
    overall_status = "RECOVERED";
  } else {
    overall_status = "MONITORED";
  }

  console.log(
    "\n======================================",
  );

  console.log(
    ` FINAL STATUS: ${overall_status}`,
  );

  console.log(
    "======================================\n",
  );

  return {
    incident,
    analysis,
    policy,
    recovery,
    overall_status,
  };
}