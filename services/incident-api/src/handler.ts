import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

import { randomUUID } from "crypto";

import {
  analyzeIncident,
  IncidentData,
} from "./ai-analyzer";

import {
  evaluateRecoveryPolicy,
} from "./policy-engine";

import {
  executeRecovery,
} from "./recovery-engine";

const client = new DynamoDBClient({});

const dynamodb =
  DynamoDBDocumentClient.from(client);

const TABLE_NAME =
  process.env.INCIDENTS_TABLE_NAME ||
  "cloudsentinel-incidents";

export const handler = async (event: any) => {
  console.log(
    "CloudSentinel Incident API received:",
    event,
  );

  // --------------------------------------------------
  // STEP 1: Parse incoming request body
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
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        message:
          "Invalid JSON request body",
      }),
    };
  }

  // --------------------------------------------------
  // STEP 2: Generate unique incident ID
  // --------------------------------------------------

  const incidentId =
    randomUUID();

  // --------------------------------------------------
  // STEP 3: Build incident data
  // --------------------------------------------------

  const incident: IncidentData & {
    incident_id: string;
    status: string;
    created_at: string;
  } = {
    incident_id:
      incidentId,

    service:
      body.service ||
      "unknown",

    severity:
      body.severity ||
      "UNKNOWN",

    error_rate:
      Number(body.error_rate) ||
      0,

    latency_ms:
      Number(body.latency_ms) ||
      0,

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
      Number(body.memory_usage) ||
      undefined,
  };

  console.log(
    "Incident created:",
    incident,
  );

  // --------------------------------------------------
  // STEP 4: Save incident to DynamoDB
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
      "Incident saved to DynamoDB:",
      incidentId,
    );
  } catch (error) {
    console.error(
      "Failed to save incident to DynamoDB:",
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
          "Failed to save incident",

        error:
          "Database operation failed",
      }),
    };
  }

  // --------------------------------------------------
  // STEP 5: AI Incident Analysis
  // --------------------------------------------------

  let analysis;

  try {
    analysis =
      await analyzeIncident(
        incident,
      );

    console.log(
      "AI Incident Analysis:",
      analysis,
    );
  } catch (error) {
    console.error(
      "AI analysis failed:",
      error,
    );

    // The incident is already safely
    // stored in DynamoDB.

    return {
      statusCode: 202,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        message:
          "Incident detected, but AI analysis is currently unavailable",

        incident:

          incident,

        ai_analysis:
          null,

        policy_decision:
          null,

        recovery_result:
          null,
      }),
    };
  }

  // --------------------------------------------------
  // STEP 6: Policy / Safety Engine
  // --------------------------------------------------

  const policyDecision =
    evaluateRecoveryPolicy(
      incident,
      analysis,
    );

  console.log(
    "CloudSentinel Policy Decision:",
    policyDecision,
  );

  // --------------------------------------------------
  // STEP 7: Recovery Engine
  // --------------------------------------------------

  let recoveryResult =
    null;

  if (policyDecision.approved) {
    try {
      recoveryResult =
        await executeRecovery(
          incident,
          policyDecision.action,
        );

      console.log(
        "CloudSentinel Recovery Result:",
        recoveryResult,
      );
    } catch (error) {
      console.error(
        "Recovery execution failed:",
        error,
      );

      recoveryResult = {
        action:
          policyDecision.action,

        status:
          "SKIPPED",

        message:
          "Recovery execution failed.",

        recovery_time_ms:
          0,

        verified:
          false,
      };
    }
  } else {
    console.log(
      "Recovery not executed because policy rejected the action.",
    );
  }

  // --------------------------------------------------
  // STEP 8: Determine final incident status
  // --------------------------------------------------

  let finalStatus =
    "ANALYZED";

  if (
    policyDecision.approved &&
    recoveryResult?.verified
  ) {
    finalStatus =
      "RECOVERED";
  }

  if (
    !policyDecision.approved
  ) {
    finalStatus =
      "MONITORING";
  }

  // --------------------------------------------------
  // STEP 9: Return complete CloudSentinel response
  // --------------------------------------------------

  return {
    statusCode: 201,

    headers: {
      "Content-Type":
        "application/json",
    },

    body: JSON.stringify({
      message:
        "CloudSentinel incident processing completed",

      incident: {
        ...incident,
        status:
          finalStatus,
      },

      ai_analysis:
        analysis,

      policy_decision:
        policyDecision,

      recovery_result:
        recoveryResult,
    }),
  };
};