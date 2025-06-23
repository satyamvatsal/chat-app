const Redis = require("ioredis");

const redis = new Redis("redis://localhost:6379");

redis.on("connect", async () => {
  console.log("✅ Redis Client Connected");
});

redis.on("error", (error) => console.log("❌ Redis Client Error:", error));

module.exports = { redis };
