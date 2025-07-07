const express = require("express");
const { redis } = require("../redis/redisClient");
const { connectDB } = require("../db/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const SECRET = process.env.JWT_SECRET;

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

router.post("/save-publickey", async (req, res) => {
  const { token, publicKey } = req.body;
  try {
    const decoded = jwt.verify(token, SECRET);
    const username = decoded.id;
    const cacheKey = `publicKey:${username}`;
    const db = await connectDB();
    const users = db.collection("users");
    await users.updateOne({ username }, { $set: { publicKey: publicKey } });
    await redis.setex(cacheKey, 60, publicKey);
    return res.status(204).json({ message: "public key updated" });
  } catch (err) {
    console.log(err);
    return res.status(404).json({ error: "User not found." });
  }
  return res.status(204).json({ message: "public key updated" });
});

module.exports = router;
