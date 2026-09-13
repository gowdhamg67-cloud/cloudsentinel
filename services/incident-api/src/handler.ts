import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { randomUUID } from "crypto";

import {
  analyzeIncident,
  IncidentData,
} from "./ai-analyzer";

import {
  runSelfHealing,
} from "./self-healing-engine";

// --------------------------------------------------
// AWS CLIENTS
// --------------------------------------------------

const client = new DynamoDBClient({});

const dynamodb =
  DynamoDBDocumentClient.from(client);

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const TABLE_NAME =
  process.env.INCIDENTS_TABLE_NAME ||
  "cloudsentinel-incidents";

// --------------------------------------------------
// INCIDENT API
// --------------------------------------------------

export const handler = async (event: any) => {

  console.log(
    "======================================",
  );

  console.log(
    " CLOUDSENTINEL INCIDENT API",
  );

  console.log(
    "======================================",
  );

  console.log(
    "Incoming event:",
    event,
  );

  // --------------------------------------------------
  // STEP 1 — PARSE REQUEST
  // --------------------------------------------------

  let body: any;

  try {

    body =
      typeof event.body === "string"
        ? JSON.parse(
            event.body
              .replace(/^\uFEFF/, "")
              .replace(/^ï»¿/, ""),
          )
        : event.body || event;

  } catch (error) {

    console.error(
      "Invalid request body:",
      error,
    );

    return {
      statusCode: 400,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message:
          "Invalid JSON request body",
      }),
    };
  }

  // --------------------------------------------------
  // STEP 2 — CREATE INCIDENT
  // --------------------------------------------------

  const incidentId =
    randomUUID();

  const incident: IncidentData & {
    incident_id: string;
    status: string;
    created_at: string;
  } = {

    incident_id: incidentId,

    service:
      body.service || "unknown",

    severity:
      body.severity || "UNKNOWN",

    error_rate:
      Number(body.error_rate) || 0,

    latency_ms:
      Number(body.latency_ms) || 0,

    status:
      "DETECTED",

    created_at:
      new Date().toISOString(),

    message:
      body.message,

    traffic:
      body.traffic,

    recent_deployment:
      body.recent_deployment,

    memory_usage:
      Number(body.memory_usage) || undefined,
  };

  console.log(
    "\nSTEP 1 — INCIDENT DETECTED",
  );

  console.log(
    incident,
  );

  // --------------------------------------------------
  // STEP 3 — SAVE INCIDENT
  // --------------------------------------------------

  try {

    await dynamodb.send(
      new PutCommand({

        TableName:
          TABLE_NAME,

        Item:
          incident,

      }),
    );

    console.log(
      "✅ Incident saved to DynamoDB:",
      incidentId,
    );

  } catch (error) {

    console.error(
      "❌ Failed to save incident:",
      error,
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message:
          "Failed to save incident",

        incident_id:
          incidentId,
      }),
    };
  }

  // --------------------------------------------------
  // STEP 4 — AI INCIDENT ANALYSIS
  // --------------------------------------------------

  console.log(
    "\nSTEP 2 — AI INCIDENT ANALYSIS",
  );

  let analysis;

  try {

    analysis =
      await analyzeIncident(
        incident,
      );

    console.log(
      "✅ AI analysis completed:",
      analysis,
    );

  } catch (error) {

    console.error(
      "❌ AI analysis failed:",
      error,
    );

    return {
      statusCode: 202,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({

        message:
          "Incident detected, but AI analysis is currently unavailable",

        incident,

        ai_analysis:
          null,

        next_step:
          "CloudSentinel will continue monitoring the incident.",

      }),
    };
  }

  // --------------------------------------------------
  // STEP 5 — SELF-HEALING ENGINE
  // --------------------------------------------------

  console.log(
    "\nSTEP 3 — CLOUDSENTINEL SELF-HEALING",
  );

  let selfHealingResult;

  try {

    selfHealingResult =
      await runSelfHealing(
        incident,
        analysis,
      );

    console.log(
      "✅ Self-healing completed:",
      selfHealingResult,
    );

  } catch (error) {

    console.error(
      "❌ Self-healing engine failed:",
      error,
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({

        message:
          "Incident analyzed, but self-healing execution failed",

        incident,

        ai_analysis:
          analysis,

        self_healing:
          null,

      }),
    };
  }

  // --------------------------------------------------
  // STEP 6 — UPDATE INCIDENT
  // --------------------------------------------------

  let finalStatus:
    | "RECOVERED"
    | "MONITORED"
    | "BLOCKED";

  finalStatus =
    selfHealingResult.overall_status;

  console.log(
    "\nSTEP 4 — UPDATE INCIDENT",
  );

  try {

    await dynamodb.send(
      new UpdateCommand({

        TableName:
          TABLE_NAME,

        Key: {
          incident_id:
            incidentId,
        },

        UpdateExpression:
          "SET #s = :status, ai_analysis = :analysis, policy_decision = :policy, recovery_result = :recovery, overall_status = :overall",

        ExpressionAttributeNames: {
          "#s":
            "status",
        },

        ExpressionAttributeValues: {

          ":status":
            finalStatus,

          ":analysis":
            selfHealingResult.analysis,

          ":policy":
            selfHealingResult.policy,

          ":recovery":
            selfHealingResult.recovery,

          ":overall":
            finalStatus,
        },

      }),
    );

    console.log(
      "✅ Incident updated in DynamoDB",
    );

  } catch (error) {

    console.error(
      "⚠️ Failed to update incident:",
      error,
    );

    // The incident and self-healing result
    // are still returned to the caller.
  }

  // --------------------------------------------------
  // STEP 7 — FINAL RESPONSE
  // --------------------------------------------------

  console.log(
    "\n======================================",
  );

  console.log(
    ` FINAL STATUS: ${finalStatus}`,
  );

  console.log(
    "======================================",
  );

  return {

    statusCode:
      finalStatus === "RECOVERED"
        ? 200
        : 202,

    headers: {
      "Content-Type":
        "application/json",
    },

    body: JSON.stringify({

      message:
        "CloudSentinel incident processing completed",

      incident_id:
        incidentId,

      incident,

      ai_analysis:
        selfHealingResult.analysis,

      policy:
        selfHealingResult.policy,

      recovery:
        selfHealingResult.recovery,

      overall_status:
        selfHealingResult.overall_status,

    }),
  };
};