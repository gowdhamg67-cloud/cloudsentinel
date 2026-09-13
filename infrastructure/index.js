exports.handler = async (event) => {
  const health = process.env.CLOUDSENTINEL_HEALTH || "HEALTHY";

  console.log("======================================");
  console.log(" CLOUDSENTINEL DEMO PAYMENT SERVICE");
  console.log(" Health:", health);
  console.log("======================================");

  if (health === "UNHEALTHY") {
    console.error("PAYMENT SERVICE IS UNHEALTHY");
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        service: "payment",
        status: "UNHEALTHY",
        message: "Simulated payment service failure"
      })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      service: "payment",
      status: "HEALTHY",
      message: "Payment service is operating normally"
    })
  };
};