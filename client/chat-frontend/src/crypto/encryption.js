import sodium from "libsodium-wrappers";
import { getPrivateKey } from "../db";
import { toast } from "react-toastify";

const getPublicKey = async (userId) => {
  try {
    const response = await fetch(`http://localhost:3001/publickey/${userId}`);
    const data = await response.json();
    if (response.ok) {
      return data.publicKey;
    } else {
      toast("server error", "error");
      return null;
    }
  } catch (err) {
    if (err.error === "User not found.") {
      toast("receiver does not exists", "error");
    }
  }
  return null;
};
export const encryptText = async (message, receiver) => {
  await sodium.ready;
  const username = localStorage.getItem("username");
  const privateKeyB64 = await getPrivateKey(username);
  const receiverPublicKeyB64 = await getPublicKey(receiver);
  if (!privateKeyB64 || !receiverPublicKeyB64) {
    return { ciphertext: null, nonce: null };
  }
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const ciphertext = sodium.crypto_box_easy(
    sodium.from_string(message),
    nonce,
    sodium.from_base64(receiverPublicKeyB64),
    sodium.from_base64(privateKeyB64),
  );
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
};
export const decryptText = async (message, sender, nonce) => {
  await sodium.ready;
  const username = localStorage.getItem("username");
  if (username === sender) return message;
  const privateKey = await getPrivateKey(username);
  const senderPublicKey = await getPublicKey(sender);
  const decrypted = sodium.crypto_box_open_easy(
    sodium.from_base64(message),
    sodium.from_base64(nonce),
    sodium.from_base64(senderPublicKey),
    sodium.from_base64(privateKey),
  );
  return sodium.to_string(decrypted);
};

export const handlePrivateKeyChange = async (privateKeyBase64) => {
  const privateKey = sodium.from_base64(privateKeyBase64);
  const publicKey = sodium.crypto_scalarmult_base(privateKey);
  const publicKeyBase64 = sodium.to_base64(publicKey);
  const token = localStorage.getItem("authToken");

  try {
    const response = await fetch(
      "http://localhost:3001/publicKey/save-publickey",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, publicKey: publicKeyBase64 }),
      },
    );

    if (!response.ok) {
      toast("server rejected public key update");
      console.error(
        "Server rejected public key update:",
        await response.text(),
      );
      return false;
    } else {
      toast("Private key saved!", "success");
      return true;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};
