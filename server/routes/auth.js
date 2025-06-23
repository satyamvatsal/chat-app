const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password, publicKey } = req.body;
  try {
    const token = await registerUser(username, password, publicKey);
    res.status(201).json({ message: "User registered", token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password, publicKey } = req.body;
  try {
    const token = await loginUser(username, password, publicKey);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
