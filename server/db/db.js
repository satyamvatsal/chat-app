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

async function pingDB() {
  try {
    const database = await connectDB();
    if (!database) throw new Error("Database instance is null");
    const result = await database.command({ ping: 1 });
    result.ok = 1;
    return result;
  } catch (err) {
    console.error("Mongo ping failed: ", err);
    return false;
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
  pingDB,
  getDB: () => db,
};
