import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export interface IncidentData {
  service: string;
  severity: string;
  error_rate: number;
  latency_ms: number;
  status?: string;
  message?: string;
  traffic?: string;
  recent_deployment?: boolean;
  memory_usage?: number;
}

export interface IncidentAnalysis {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  likely_cause: string;
  recommended_action:
    | "MONITOR"
    | "RESTART"
    | "SCALE"
    | "ROLLBACK"
    | "FAILOVER";
  confidence: number;
  explanation: string;
}

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID ||
  "apac.anthropic.claude-sonnet-4-20250514-v1:0";

export async function analyzeIncident(
  incident: IncidentData,
): Promise<IncidentAnalysis> {
  const prompt = `
You are CloudSentinel, an autonomous cloud reliability AI.

Analyze the following cloud infrastructure incident.

INCIDENT DATA:
${JSON.stringify(incident, null, 2)}

Your job is to:
1. Determine incident severity.
2. Identify the most likely root cause.
3. Recommend exactly ONE recovery action.
4. Give a confidence score from 0 to 100.
5. Explain your reasoning briefly.

Allowed recovery actions:
- MONITOR
- RESTART
- SCALE
- ROLLBACK
- FAILOVER

IMPORTANT:
- Do NOT invent missing information.
- Do NOT recommend actions outside the allowed list.
- Return ONLY valid JSON.
- Do not use markdown or code fences.

Required JSON format:
{
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "likely_cause": "short explanation",
  "recommended_action": "MONITOR | RESTART | SCALE | ROLLBACK | FAILOVER",
  "confidence": 0,
  "explanation": "brief reasoning"
}
`;

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 500,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: Buffer.from(JSON.stringify(requestBody)),
  });

  const response = await bedrock.send(command);

  if (!response.body) {
    throw new Error("Bedrock returned an empty response");
  }

  const responseText = Buffer.from(response.body).toString("utf-8");

  const parsedResponse = JSON.parse(responseText);

  const modelText =
    parsedResponse?.content?.[0]?.text;

  if (!modelText) {
    throw new Error("Bedrock response did not contain model text");
  }

  const cleanedText = modelText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const analysis = JSON.parse(cleanedText) as IncidentAnalysis;

  validateAnalysis(analysis);

  return analysis;
}

function validateAnalysis(
  analysis: IncidentAnalysis,
): void {
  const validSeverities = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ];

  const validActions = [
    "MONITOR",
    "RESTART",
    "SCALE",
    "ROLLBACK",
    "FAILOVER",
  ];

  if (!validSeverities.includes(analysis.severity)) {
    throw new Error(
      `Invalid severity returned by AI: ${analysis.severity}`,
    );
  }

  if (!validActions.includes(analysis.recommended_action)) {
    throw new Error(
      `Invalid recovery action returned by AI: ${analysis.recommended_action}`,
    );
  }

  if (
    typeof analysis.confidence !== "number" ||
    analysis.confidence < 0 ||
    analysis.confidence > 100
  ) {
    throw new Error("Invalid AI confidence score");
  }

  if (!analysis.likely_cause) {
    throw new Error("AI did not provide a likely cause");
  }

  if (!analysis.explanation) {
    throw new Error("AI did not provide an explanation");
  }
}