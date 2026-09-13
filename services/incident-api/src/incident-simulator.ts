export type SimulationType =
  | "SERVICE_CRASH"
  | "TRAFFIC_SPIKE"
  | "BAD_DEPLOYMENT"
  | "REGION_FAILURE";

export interface SimulatedIncident {
  service: string;
  severity: "HIGH" | "CRITICAL";
  error_rate: number;
  latency_ms: number;
  status: string;
  message: string;
  traffic: string;
  recent_deployment: boolean;
  memory_usage: number;
  region: string;
  simulation_type: SimulationType;
}

export function simulateIncident(
  type: SimulationType,
): SimulatedIncident {
  switch (type) {
    case "SERVICE_CRASH":
      return {
        service: "payment",
        severity: "CRITICAL",
        error_rate: 95,
        latency_ms: 8500,
        status: "DOWN",
        message: "Payment service crashed and is not responding",
        traffic: "normal",
        recent_deployment: false,
        memory_usage: 98,
        region: "ap-south-1",
        simulation_type: "SERVICE_CRASH",
      };

    case "TRAFFIC_SPIKE":
      return {
        service: "orders",
        severity: "HIGH",
        error_rate: 18,
        latency_ms: 5200,
        status: "DEGRADED",
        message: "Sudden traffic spike detected",
        traffic: "+450%",
        recent_deployment: false,
        memory_usage: 91,
        region: "ap-south-1",
        simulation_type: "TRAFFIC_SPIKE",
      };

    case "BAD_DEPLOYMENT":
      return {
        service: "payment",
        severity: "CRITICAL",
        error_rate: 76,
        latency_ms: 6400,
        status: "DEGRADED",
        message: "Errors increased immediately after deployment",
        traffic: "+20%",
        recent_deployment: true,
        memory_usage: 72,
        region: "ap-south-1",
        simulation_type: "BAD_DEPLOYMENT",
      };

    case "REGION_FAILURE":
      return {
        service: "all-services",
        severity: "CRITICAL",
        error_rate: 100,
        latency_ms: 15000,
        status: "REGION_DOWN",
        message: "Primary AWS region is unavailable",
        traffic: "normal",
        recent_deployment: false,
        memory_usage: 0,
        region: "ap-south-1",
        simulation_type: "REGION_FAILURE",
      };

    default:
      throw new Error(`Unsupported simulation type: ${type}`);
  }
}