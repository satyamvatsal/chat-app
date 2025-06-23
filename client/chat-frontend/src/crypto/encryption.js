import sodium from "libsodium-wrappers";
import { getPrivateKey } from "../db";

const getPublicKey = async (userId) => {
  const response = await fetch(`http://10.3.141.254:3001/publickey/${userId}`);
  const data = await response.json();
  if (response.ok) {
    return data.publicKey;
  }
  return null;
};
export const encryptText = async (message, receiver) => {
  await sodium.ready;
  const username = localStorage.getItem("username");
  const privateKeyB64 = await getPrivateKey(username);
  const receiverPublicKeyB64 = await getPublicKey(receiver);
  if (!privateKeyB64 || !receiverPublicKeyB64) {
    throw new Error("Missing private or public key");
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
