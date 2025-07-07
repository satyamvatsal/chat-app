import Dexie from "dexie";
import { handlePrivateKeyChange } from "./crypto/encryption";

export const initDB = (username) => {
  const db = new Dexie(`chatDatabase:${username}`);
  db.version(1).stores({
    messages: "++id, from, to, timestamp,nonce",
    keys: "&id, publicKey, privateKey",
  });
  return db;
};
export const getMessages = async (username) => {
  const db = initDB(username);
  const messages = await db.messages.toArray();
  return messages;
};
export const addMessage = async (username, message) => {
  const db = initDB(username);
  try {
    await db.messages.add(message);
  } catch (error) {
    console.error("Failed to add message:", error);
    throw error;
  }
};
export const saveKeys = async (username, privateKey, publicKey) => {
  const db = initDB(username);
  await db.keys.put({
    id: "self",
    publicKey,
    privateKey,
  });
};
export const deleteChat = async (chatUser, username) => {
  const db = initDB(username);
  const msgsToDelete = await db.messages
    .filter(
      (msg) =>
        (msg.from === username && msg.to === chatUser) ||
        (msg.from === chatUser && msg.to === username),
    )
    .toArray();
  console.log(msgsToDelete);
  const ids = msgsToDelete.map((msg) => msg.id);
  await db.messages.bulkDelete(ids);
};

export const getPrivateKey = async (username) => {
  const db = initDB(username);
  const keys = await db.keys.get("self");
  const privateKey = keys?.privateKey;
  return privateKey;
};

export const savePrivateKey = async (username, key) => {
  const db = initDB(username);
  try {
    const status = await handlePrivateKeyChange(key);
    if (status == false) throw new Error("Cannot save public key to server");
    await db.keys.update("self", { privateKey: key });
  } catch (err) {
    console.error("Error while saving private key, ", err);
  }
};
export default initDB;
