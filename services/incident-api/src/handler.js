"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
const client = new client_dynamodb_1.DynamoDBClient({});
const dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.INCIDENTS_TABLE_NAME || "cloudsentinel-incidents";
const handler = async (event) => {
    console.log("CloudSentinel Incident API received:", event);
    const body = typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || event;
    const incidentId = (0, crypto_1.randomUUID)();
    const incident = {
        incident_id: incidentId,
        service: body.service || "unknown",
        severity: body.severity || "UNKNOWN",
        error_rate: body.error_rate || 0,
        latency_ms: body.latency_ms || 0,
        status: "DETECTED",
        created_at: new Date().toISOString(),
    };
    await dynamodb.send(new lib_dynamodb_1.PutCommand({
        TableName: TABLE_NAME,
        Item: incident,
    }));
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
exports.handler = handler;
//# sourceMappingURL=handler.js.map