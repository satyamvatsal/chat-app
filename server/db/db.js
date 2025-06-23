const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/chatapp";
const dbName = "chatapp";

const client = new MongoClient(uri);

let db = null;

async function connectDB() {
  try {
    if (db) return db;
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

function closeDB() {
  if (client.isConnected()) {
    client
      .close()
      .then(() => console.log("MongoDB connection closed"))
      .catch((err) => console.error("Error closing MongoDB connection:", err));
  }
}

module.exports = {
  connectDB,
  closeDB,
  getDB: () => db,
};
