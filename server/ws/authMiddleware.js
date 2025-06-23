const jwt = require("jsonwebtoken");
require("dotenv").config();
const SECRET = process.env.JWT_SECRET;

function authenticateWebSocket(ws, message, next) {
  try {
    const data = JSON.parse(message);
    if (data.type !== "auth") {
      return ws.send(
        JSON.stringify({ type: "error", message: "Authentication required" }),
      );
    }

    const payload = jwt.verify(data.token, SECRET);
    ws.userId = payload.id;

    ws.send(JSON.stringify({ type: "auth_success" }));
    next();
  } catch (err) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
  }
}

module.exports = { authenticateWebSocket };
