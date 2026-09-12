import { IncidentData, IncidentAnalysis } from "./ai-analyzer";

export interface PolicyDecision {
  approved: boolean;
  action: IncidentAnalysis["recommended_action"];
  reason: string;
}

export function evaluateRecoveryPolicy(
  incident: IncidentData,
  analysis: IncidentAnalysis,
): PolicyDecision {
  const action = analysis.recommended_action;

  // Safety rule 1:
  // Never allow FAILOVER unless the incident is critical.
  if (action === "FAILOVER" && analysis.severity !== "CRITICAL") {
    return {
      approved: false,
      action: "MONITOR",
      reason: "Failover requires CRITICAL severity.",
    };
  }

  // Safety rule 2:
  // Rollback should normally be associated with a recent deployment.
  if (action === "ROLLBACK" && !incident.recent_deployment) {
    return {
      approved: false,
      action: "MONITOR",
      reason: "Rollback requires evidence of a recent deployment.",
    };
  }

  // Safety rule 3:
  // Very high error rates require serious incident severity.
  if (
    incident.error_rate >= 50 &&
    analysis.severity !== "CRITICAL"
  ) {
    return {
      approved: false,
      action: "MONITOR",
      reason: "High error rate requires CRITICAL severity.",
    };
  }

  // Safety rule 4:
  // Don't execute automated recovery with low confidence.
  if (analysis.confidence < 70) {
    return {
      approved: false,
      action: "MONITOR",
      reason: "AI confidence is below the 70% automation threshold.",
    };
  }

  // If all safety checks pass, approve the AI recommendation.
  return {
    approved: true,
    action,
    reason: "Recovery action passed all CloudSentinel safety policies.",
  };
}