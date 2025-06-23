const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { connectDB } = require("../db/db");
const { authenticateWebSocket } = require("./authMiddleware");
const { redis } = require("../redis/redisClient");
const { v4: uuidv4 } = require("uuid");

const SECRET = process.env.JWT_SECRET;
const liveSockets = new Map();
const pendingAcks = new Map();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    let isAuthenticated = false;
    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);
        if (!isAuthenticated && data.type === "auth") {
          authenticateWebSocket(ws, msg, async () => {
            isAuthenticated = true;
            liveSockets.set(ws.userId, ws);
            const queueKey = `queue:${ws.userId}`;
            const queuedMsgs = await redis.lrange(queueKey, 0, -1);
            for (const raw of queuedMsgs) {
              try {
                ws.send(raw);
                await delay(100);
              } catch (err) {
                console.error("WebSocket send error:", err);
                break;
              }
            }
            await redis.del(queueKey);
          });
          return;
        }
        if (!isAuthenticated) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Please authenticate first",
            }),
          );
          return;
        }
        if (data.type === "typing") {
          const targetWS = liveSockets.get(data.to);
          if (targetWS) {
            targetWS.send(
              JSON.stringify({
                type: "typing",
                from: ws.userId,
              }),
            );
          }
          return;
        }
        if (data.type === "ack") {
          const pending = pendingAcks.get(data.id);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingAcks.delete(data.id);
          }
        }
        if (data.type === "message") {
          const msgId = uuidv4();
          const msgToSend = JSON.stringify({
            id: msgId,
            type: "message",
            from: ws.userId,
            text: data.text,
            nonce: data.nonce,
            timestamp: data.timestamp,
          });
          const targetWS = liveSockets.get(data.to);
          if (targetWS) targetWS.send(msgToSend);
          const queueKey = `queue:${data.to}`;
          const ackTimeout = setTimeout(async () => {
            console.log("ACK not received, queueing message");
            await redis.rpush(queueKey, msgToSend);
            await redis.expire(queueKey, 21600);
            pendingAcks.delete(msgId);
          }, 2000);
          pendingAcks.set(msgId, {
            timeout: ackTimeout,
            message: msgToSend,
            to: data.to,
          });
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: "error", message: err.message }));
      }
    });

    ws.on("close", () => {
      if (ws.userId) liveSockets.delete(ws.userId);
    });
  });
}

module.exports = { setupWebSocket };
