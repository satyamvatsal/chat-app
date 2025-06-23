import React, { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import { addMessage, getMessages } from "../db";
import { decryptText, encryptText } from "../crypto/encryption";

export default function ChatBox({
  username,
  receiver,
  logs,
  setLogs,
  setReceiver,
  ws,
  isTyping,
}) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef(null);
  const PAGE_SIZE = 50;
  const [offset, setOffset] = useState(0);
  const sendSound = new Audio("/sounds/sent.mp3");
  const textareaRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(
    window.visualViewport?.height || window.innerHeight,
  );
  useEffect(() => {
    const loadInitialMessages = async () => {
      const msgs = await getMessages(username);
      const allMsgs = msgs
        .filter(
          (m) =>
            (m.from === username && m.to === receiver) ||
            (m.from === receiver && m.to === username),
        )
        .sort((a, b) => a.timestamp - b.timestamp);
      console.log(allMsgs);

      const recentMsgs = allMsgs.slice(-PAGE_SIZE); // latest 50
      const decryptedMsgs = await Promise.all(
        recentMsgs.map(async (msg) => {
          try {
            const decryptedText = await decryptText(
              msg.text,
              msg.from,
              msg.nonce,
            );
            console.log(decryptedText);
            return { ...msg, text: decryptedText };
          } catch (err) {
            console.warn("Failed to decrypt message", msg, err);
            return { ...msg, text: "[Decryption Failed]" };
          }
        }),
      );
      setLogs(decryptedMsgs);
      setOffset(1);
    };

    if (receiver) loadInitialMessages();
  }, [username, receiver, setLogs]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = async () => {
      if (el.scrollTop < 20) {
        const allMsgs = (await getMessages(username))
          .filter(
            (m) =>
              (m.from === username && m.to === receiver) ||
              (m.from === receiver && m.to === username),
          )
          .sort((a, b) => a.timestamp - b.timestamp);

        const start = Math.max(allMsgs.length - (offset + 1) * PAGE_SIZE, 0);
        const end = allMsgs.length - offset * PAGE_SIZE;
        const olderMsgs = allMsgs.slice(start, end);
        if (olderMsgs.length === 0) return;

        const prevScrollHeight = el.scrollHeight;

        setLogs((prev) => [...olderMsgs, ...prev]);
        setOffset((prev) => prev + 1);

        setTimeout(() => {
          el.scrollTop = el.scrollHeight - prevScrollHeight;
        }, 0);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [offset, receiver, username, setLogs]);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", handleResize);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150,
      )}px`;
    }
  }, [message]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const { ciphertext, nonce } = await encryptText(message, receiver);
    const newMsgPlain = {
      from: username,
      to: receiver,
      text: message,
      timestamp: Date.now(),
      nonce,
    };
    ws.current.send(
      JSON.stringify({
        type: "message",
        to: receiver,
        text: ciphertext,
        nonce: nonce,
        timestamp: Date.now(),
      }),
    );
    addMessage(username, newMsgPlain);
    setLogs((prev) => [...prev, newMsgPlain]);
    setMessage("");
    sendSound.currentTime = 0;
    sendSound.play().catch(console.warn);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "typing",
          to: receiver,
        }),
      );
    }
  };

  return (
    <div
      className="w-full bg-gray-100 flex justify-center overflow-hidden"
      style={{ height: `${viewportHeight}px` }}
    >
      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg flex flex-col h-full">
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReceiver("")}
              className="text-blue-500 hover:text-black mr-2 text-lg"
              title="Go back"
            >
              ⟵
            </button>
            <img
              src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${receiver}`}
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
            <div className="flex flex-col">
              <p className="font-bold">{receiver}</p>
              {isTyping && <p className="text-xs text-gray-500">cooking...</p>}
            </div>
          </div>
        </div>

        {/* Auto-sizing Message Logs */}
        <div
          ref={scrollRef}
          className="flex flex-col-reverse overflow-y-auto px-4 py-2 gap-2 flex-grow"
        >
          {logs
            .slice()
            .reverse()
            .map((log, idx) => (
              <MessageBubble
                key={log.timestamp + "_" + idx}
                message={log.text}
                isSender={log.from === username}
                sender={log.from}
                color={log.from === username ? "bg-gray-800" : "bg-gray-600"}
                timestamp={log.timestamp}
              />
            ))}
        </div>

        {/* Message Input */}
        <div className="border-t p-3 shrink-0 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Cook here..."
              className="flex-1 resize-none border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-700 text-sm min-h-[40px] max-h-[150px] overflow-y-auto"
              rows={1}
            />
            <button
              onClick={sendMessage}
              className="bg-gray-800 hover:bg-gray-900 text-white hover:ring-gray-600 px-4 py-2 rounded font-medium text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
