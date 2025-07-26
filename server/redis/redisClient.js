const Redis = require("ioredis");
require("dotenv").config();

const REDIS_URL = process.env.REDIS_URL;
const redis = new Redis(REDIS_URL);

redis.on("connect", async () => {
  console.log("✅ Redis Client Connected");
});

redis.on("error", (error) => console.log("❌ Redis Client Error:", error));

module.exports = { redis };
