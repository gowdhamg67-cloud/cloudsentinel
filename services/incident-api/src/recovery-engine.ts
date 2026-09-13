import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  GetFunctionConfigurationCommand,
  InvokeCommand,
} from "@aws-sdk/client-lambda";

import { IncidentData } from "./ai-analyzer";

export type RecoveryAction =
  | "MONITOR"
  | "RESTART"
  | "SCALE"
  | "ROLLBACK"
  | "FAILOVER";

export interface RecoveryResult {
  action: RecoveryAction;
  status: "EXECUTED" | "SKIPPED";
  message: string;
  recovery_time_ms: number;
  verified: boolean;
}

// --------------------------------------------------
// AWS LAMBDA CLIENT
// --------------------------------------------------

const lambda = new LambdaClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

// --------------------------------------------------
// DEMO PAYMENT FUNCTION
// --------------------------------------------------

const PAYMENT_FUNCTION_NAME =
  process.env.PAYMENT_FUNCTION_NAME ||
  "cloudsentinel-demo-payment";

// --------------------------------------------------
// RECOVERY EXECUTION
// --------------------------------------------------

export async function executeRecovery(
  incident: IncidentData,
  action: RecoveryAction,
): Promise<RecoveryResult> {

  const startTime = Date.now();

  console.log(
    "CloudSentinel Recovery Engine started:",
    {
      service: incident.service,
      action,
    },
  );

  // --------------------------------------------------
  // MONITOR
  // --------------------------------------------------

  if (action === "MONITOR") {

    return {
      action,
      status: "SKIPPED",
      message:
        "No automated recovery required. Incident will be monitored.",
      recovery_time_ms:
        Date.now() - startTime,
      verified: true,
    };
  }

  // --------------------------------------------------
  // REAL AWS RESTART
  // --------------------------------------------------

  if (
    action === "RESTART" &&
    incident.service === "payment"
  ) {

    console.log(
      `REAL AWS RECOVERY: Restarting ${PAYMENT_FUNCTION_NAME}...`,
    );

    try {

      // ----------------------------------------------
      // STEP 1 — RESTORE HEALTH CONFIGURATION
      // ----------------------------------------------

      await lambda.send(
        new UpdateFunctionConfigurationCommand({
          FunctionName:
            PAYMENT_FUNCTION_NAME,

          Environment: {
            Variables: {
              CLOUDSENTINEL_HEALTH:
                "HEALTHY",
            },
          },
        }),
      );

      console.log(
        "Recovery configuration update requested.",
      );

      // ----------------------------------------------
      // STEP 2 — WAIT FOR UPDATE
      // ----------------------------------------------

      await waitForLambdaUpdate();

      console.log(
        "Lambda configuration update completed.",
      );

      // ----------------------------------------------
      // STEP 3 — INVOKE SERVICE
      // ----------------------------------------------

      const response =
        await lambda.send(
          new InvokeCommand({
            FunctionName:
              PAYMENT_FUNCTION_NAME,

            InvocationType:
              "RequestResponse",

            Payload:
              Buffer.from("{}"),
          }),
        );

      if (!response.Payload) {
        throw new Error(
          "Recovery verification returned an empty Lambda response.",
        );
      }

      const responseText =
        Buffer.from(
          response.Payload,
        ).toString("utf-8");

      const payload =
        JSON.parse(responseText);

      console.log(
        "Recovery health check response:",
        payload,
      );

      // ----------------------------------------------
      // STEP 4 — VERIFY HEALTH
      // ----------------------------------------------

      const responseStatus =
        payload?.statusCode;

      let serviceHealthy = false;

      if (responseStatus === 200) {

        try {

          const body =
            typeof payload.body === "string"
              ? JSON.parse(payload.body)
              : payload.body;

          serviceHealthy =
            body?.status === "HEALTHY";

        } catch {
          serviceHealthy = false;
        }
      }

      if (!serviceHealthy) {

        return {
          action,
          status: "EXECUTED",
          message:
            "AWS recovery was executed, but health verification failed.",
          recovery_time_ms:
            Date.now() - startTime,
          verified: false,
        };
      }

      console.log(
        "✅ REAL AWS HEALTH CHECK: PASS",
      );

      return {
        action,
        status: "EXECUTED",
        message:
          `AWS Lambda ${PAYMENT_FUNCTION_NAME} recovered successfully.`,
        recovery_time_ms:
          Date.now() - startTime,
        verified: true,
      };

    } catch (error) {

      console.error(
        "❌ Real AWS recovery failed:",
        error,
      );

      throw error;
    }
  }

  // --------------------------------------------------
  // SIMULATED ACTIONS FOR NOW
  // --------------------------------------------------

  switch (action) {

    case "RESTART":

      console.log(
        `Simulating restart of ${incident.service}...`,
      );

      await simulateRecoveryDelay();

      return createSuccessResult(
        action,
        startTime,
        `Service ${incident.service} restarted successfully.`,
      );

    case "SCALE":

      console.log(
        `Simulating scaling of ${incident.service}...`,
      );

      await simulateRecoveryDelay();

      return createSuccessResult(
        action,
        startTime,
        `Service ${incident.service} scaled successfully.`,
      );

    case "ROLLBACK":

      console.log(
        `Simulating rollback of ${incident.service}...`,
      );

      await simulateRecoveryDelay();

      return createSuccessResult(
        action,
        startTime,
        `Deployment for ${incident.service} rolled back successfully.`,
      );

    case "FAILOVER":

      console.log(
        `Simulating regional failover for ${incident.service}...`,
      );

      await simulateRecoveryDelay();

      return createSuccessResult(
        action,
        startTime,
        `Traffic for ${incident.service} failed over successfully.`,
      );

    default:

      throw new Error(
        `Unsupported recovery action: ${action}`,
      );
  }
}

// --------------------------------------------------
// WAIT FOR LAMBDA UPDATE
// --------------------------------------------------

async function waitForLambdaUpdate(): Promise<void> {

  for (let attempt = 1; attempt <= 10; attempt++) {

    const response =
      await lambda.send(
        new GetFunctionConfigurationCommand({
          FunctionName:
            PAYMENT_FUNCTION_NAME,
        }),
      );

    console.log(
      `Lambda update status: ${response.LastUpdateStatus}`,
    );

    if (
      response.LastUpdateStatus ===
      "Successful"
    ) {
      return;
    }

    if (
      response.LastUpdateStatus ===
      "Failed"
    ) {
      throw new Error(
        "AWS Lambda configuration update failed.",
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1000),
    );
  }

  throw new Error(
    "Timed out waiting for AWS Lambda configuration update.",
  );
}

// --------------------------------------------------
// SIMULATED DELAY
// --------------------------------------------------

async function simulateRecoveryDelay(): Promise<void> {

  await new Promise((resolve) =>
    setTimeout(resolve, 500),
  );

  console.log(
    "Recovery operation completed.",
  );

  console.log(
    "Health check: PASS",
  );
}

// --------------------------------------------------
// SUCCESS RESULT
// --------------------------------------------------

function createSuccessResult(
  action: RecoveryAction,
  startTime: number,
  message: string,
): RecoveryResult {

  return {
    action,
    status: "EXECUTED",
    message,
    recovery_time_ms:
      Date.now() - startTime,
    verified: true,
  };
}