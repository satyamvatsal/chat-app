const { connectDB } = require("../db/db");
const jwt = require("jsonwebtoken");
const { redis } = require("../redis/redisClient");
require("dotenv").config();
const SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

async function registerUser(username, password, publicKey) {
  const db = await connectDB();
  const users = db.collection("users");

  const existing = await users.findOne({ username });
  if (existing) throw new Error("User already exists");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await users.insertOne({
    username,
    passwordHash,
    publicKey,
  });
  const cacheKey = `publicKey:${username}`;
  await redis.set(cacheKey, publicKey);
  const token = jwt.sign({ id: username }, SECRET, { expiresIn: "10d" });
  return token;
}

async function loginUser(username, password, publicKey) {
  const db = await connectDB();
  const users = db.collection("users");

  const user = await users.findOne({ username });
  if (!user) throw new Error("User not found");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid password");
  const token = jwt.sign({ id: username }, SECRET, { expiresIn: "10d" });
  await users.updateOne({ username }, { $set: { publicKey: publicKey } });
  console.log("public key: ", publicKey);
  const cacheKey = `publicKey:${username}`;
  await redis.set(cacheKey, publicKey);
  return token;
}

module.exports = { registerUser, loginUser };
