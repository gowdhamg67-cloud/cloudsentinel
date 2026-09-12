import {
  evaluateRecoveryPolicy,
} from "./src/policy-engine";

const incident = {
  service: "payment",
  severity: "CRITICAL",
  error_rate: 23.4,
  latency_ms: 4720,
  recent_deployment: true,
};

const safeAnalysis = {
  severity: "CRITICAL" as const,
  likely_cause: "Faulty deployment",
  recommended_action: "ROLLBACK" as const,
  confidence: 94,
  explanation: "Recent deployment correlates with increased failures.",
};

const unsafeAnalysis = {
  severity: "MEDIUM" as const,
  likely_cause: "Unknown",
  recommended_action: "FAILOVER" as const,
  confidence: 95,
  explanation: "Failover was recommended.",
};

console.log(
  "TEST 1 — SAFE ROLLBACK",
);

console.log(
  evaluateRecoveryPolicy(
    incident,
    safeAnalysis,
  ),
);

console.log(
  "\nTEST 2 — UNSAFE FAILOVER",
);

console.log(
  evaluateRecoveryPolicy(
    incident,
    unsafeAnalysis,
  ),
);