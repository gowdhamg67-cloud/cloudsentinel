import {
  simulateIncident,
  SimulationType,
} from "./src/incident-simulator";

const scenarios: SimulationType[] = [
  "SERVICE_CRASH",
  "TRAFFIC_SPIKE",
  "BAD_DEPLOYMENT",
  "REGION_FAILURE",
];

console.log("======================================");
console.log(" CLOUDSENTINEL INCIDENT SIMULATOR");
console.log("======================================");

for (const scenario of scenarios) {
  console.log(`\nTEST: ${scenario}`);

  const incident = simulateIncident(scenario);

  console.log(JSON.stringify(incident, null, 2));
}

console.log("\n======================================");
console.log(" ALL SIMULATIONS GENERATED");
console.log("======================================");