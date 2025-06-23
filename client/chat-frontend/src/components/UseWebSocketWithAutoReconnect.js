import { useEffect, useRef, useState } from "react";
import { addMessage, getMessages } from "../db";
import { decryptText } from "../crypto/encryption";

const loadRecentChats = async (username) => {
  const msgs = await getMessages(username);
  const chatMap = {};
  for (const msg of msgs) {
    const otherUser = msg.from === username ? msg.to : msg.from;
    if (!chatMap[otherUser] || msg.timestamp > chatMap[otherUser].timestamp) {
      chatMap[otherUser] = {
        user: otherUser,
        lastMessage: msg.text,
        timestamp: msg.timestamp,
      };
    }
  }

  // Sort recent chats by timestamp descending
  return Object.values(chatMap).sort((a, b) => b.timestamp - a.timestamp);
};

const useWebSocketWithReconnect = ({
  token,
  username,
  receiver,
  setLogs,
  setReceiver,
  setRecentChats,
}) => {
  const ws = useRef(null);
  const [typingUsers, setTypingUsers] = useState({});
  const receiveSound = new Audio("/sounds/received.mp3");
  const newSound = new Audio("/sounds/new.mp3");
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);

  const connect = () => {
    if (!token) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket("ws://10.3.141.254:3001");

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempts.current = 0;
      ws.current.send(JSON.stringify({ type: "auth", token }));
    };

    ws.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "typing") {
        const from = data.from;
        setTypingUsers((prev) => ({ ...prev, [from]: Date.now() }));
        setTimeout(() => {
          setTypingUsers((prev) => {
            if (Date.now() - prev[from] > 2000) {
              const updated = { ...prev };
              delete updated[from];
              return updated;
            }
            return prev;
          });
        }, 3500);
      }

      if (data.type === "message") {
        const newMsgEncrypted = {
          from: data.from,
          to: username,
          text: data.text,
          nonce: data.nonce,
          timestamp: data.timestamp,
        };
        await addMessage(username, newMsgEncrypted);

        const ack = { id: data.id, type: "ack" };
        ws.current.send(JSON.stringify(ack));

        const decryptedText = await decryptText(
          data.text,
          data.from,
          data.nonce,
        );
        if (data.from === receiver) {
          const newMsgPlain = {
            ...newMsgEncrypted,
            text: decryptedText, // Decrypted for display
          };
          setLogs((prev) => [...prev, newMsgPlain]);
          newSound.currentTime = 0;
          newSound.play().catch((e) => {
            console.warn("Could not play new message sound, ", e);
          });
        } else {
          receiveSound.currentTime = 0;
          receiveSound.play().catch((e) => {
            console.warn("Could not play send sound ", e);
          });
          if (Notification.permission === "granted") {
            const notif = new Notification(`New message from ${data.from}`, {
              body: decryptedText,
            });
            notif.onclick = () => {
              window.focus();
              if (typeof setReceiver === "function") {
                setReceiver(data.from);
              }
            };
          }
        }
        const updatedChats = await loadRecentChats(username);
        setRecentChats(updatedChats);
      }
    };

    ws.current.onclose = (e) => {
      console.warn("WebSocket closed. Reconnecting...", e.reason);
      scheduleReconnect();
    };

    ws.current.onerror = (e) => {
      console.error("WebSocket error. Closing connection...", e);
      ws.current.close();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) return;
    const delay = Math.min(10000, 1000 * 2 ** reconnectAttempts.current); // exponential backoff
    reconnectTimeout.current = setTimeout(() => {
      reconnectTimeout.current = null;
      reconnectAttempts.current++;
      connect();
    }, delay);
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        connect();
      }
    };
    const handleOnline = () => connect();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    connect(); // Initial connect

    return () => {
      ws.current?.close();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      clearTimeout(reconnectTimeout.current);
    };
  }, [token, username, receiver]);

  return { ws, typingUsers };
};

export default useWebSocketWithReconnect;
