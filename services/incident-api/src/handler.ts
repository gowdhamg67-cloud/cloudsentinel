import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

import { randomUUID } from "crypto";

const client = new DynamoDBClient({});

const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.INCIDENTS_TABLE_NAME || "cloudsentinel-incidents";

export const handler = async (event: any) => {
  console.log("CloudSentinel Incident API received:", event);

  const body =
  typeof event.body === "string"
    ? JSON.parse(
        event.body
          .replace(/^\uFEFF/, "")
          .replace(/^ï»¿/, "")
      )
    : event.body || event;

  const incidentId = randomUUID();

  const incident = {
    incident_id: incidentId,
    service: body.service || "unknown",
    severity: body.severity || "UNKNOWN",
    error_rate: body.error_rate || 0,
    latency_ms: body.latency_ms || 0,
    status: "DETECTED",
    created_at: new Date().toISOString(),
  };

  await dynamodb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: incident,
    }),
  );

  return {
    statusCode: 201,

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      message: "Incident detected successfully",
      incident,
    }),
  };
};