const express = require("express");
const { connectDB } = require("../db/db");
const { redis } = require("../redis/redisClient");
const router = express.Router();

router.get("/:userid", async (req, res) => {
  const username = req.params.userid;
  const cacheKey = `publicKey:${username}`;
  let publicKey = await redis.get(cacheKey);
  if (!publicKey) {
    const db = await connectDB();
    const users = db.collection("users");
    const userDoc = await users.findOne({ username });
    if (!userDoc || !userDoc.publicKey)
      return res.status(404).json({ error: "User not found." });
    publicKey = userDoc.publicKey;
    await redis.setex(cacheKey, 60, publicKey);
  }
  return res.status(200).json({ publicKey });
});
module.exports = router;
