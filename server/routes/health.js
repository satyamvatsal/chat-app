const express = require("express");
const { pingDB } = require("../db/db");
const { redis } = require("../redis/redisClient");
const router = express.Router();

router.get("/ping", async (req, res) => {
  try {
    const dbStatus = await pingDB();
    if (!dbStatus.ok) {
      throw new Error("DB connection failed");
    }
    const redisStatus = await redis.ping();
    if (redisStatus !== "PONG") {
      throw new Error("Redis connection failed");
    }
    return res.status(200).json({ status: "ok", db: "up", redis: "up" });
  } catch (err) {
    console.error("Health check failed, ", err);
    return res.status(503).json({ status: "error", message: err.message });
  }
});

module.exports = router;
