const express = require("express");
const http = require("http");
const cors = require("cors");
const { setupWebSocket } = require("./ws/websocket");
const authRoutes = require("./routes/auth");
const healthCheckRoute = require("./routes/health");
const publicKeyRoutes = require("./routes/publicKey");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use("/health-check", healthCheckRoute);
app.use("/auth", authRoutes);
app.use("/publicKey", publicKeyRoutes);

setupWebSocket(server);

server.listen(3001, () =>
  console.log("Server running on http://localhost:3001"),
);
