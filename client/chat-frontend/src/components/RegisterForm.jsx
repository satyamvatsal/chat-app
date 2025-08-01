import React, { useState, useEffect } from "react";
import sodium from "libsodium-wrappers";
import { Buffer } from "buffer";
import { saveKeys } from "../db";

export default function RegisterForm({ setToken, setUsername }) {
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    sodium.ready.then(() => {});
  }, []);

  const handleRegister = async () => {
    await sodium.ready;
    const keyPair = sodium.crypto_box_keypair();
    const publicKey = sodium.to_base64(keyPair.publicKey);
    const privateKey = sodium.to_base64(keyPair.privateKey);

    const API_BASE = "https://chatapi.satyamvatsal.me";

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password, publicKey }),
    });

    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      setUsername(usernameInput);
      await saveKeys(publicKey, privateKey);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("username", usernameInput);
    } else {
      alert(data.error);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleRegister();
      }}
      className="space-y-4"
    >
      <input
        type="text"
        placeholder="Username"
        value={usernameInput}
        onChange={(e) => setUsernameInput(e.target.value)}
        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      <button
        type="submit"
        className="w-full bg-gray-800 hover:bg-black text-white font-medium py-2 rounded"
      >
        Register
      </button>
    </form>
  );
}
